#!/usr/bin/env python3
"""Owned packaged-Java/HTTP contract smoke; never starts or calls a model."""
import argparse
import hashlib
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path
import selectors
import shutil
import subprocess
import tempfile
import threading
import time


def bounded_java(command):
    environment = {key: value for key, value in os.environ.items()
                   if not key.startswith(("AI_", "JAVA_TOOL_OPTIONS", "JDK_JAVA_OPTIONS", "_JAVA_OPTIONS"))}
    environment["AI_STREAM_DEADLINE_MS"] = "6000"
    process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE, env=environment)
    selector = selectors.DefaultSelector()
    total = 0
    deadline = time.monotonic() + 20
    try:
        for stream in (process.stdout, process.stderr):
            selector.register(stream, selectors.EVENT_READ)
        while selector.get_map():
            if time.monotonic() >= deadline:
                raise TimeoutError("owned Java streaming smoke exceeded twenty seconds")
            for key, _ in selector.select(min(.2, max(0, deadline - time.monotonic()))):
                data = os.read(key.fd, 4096)
                if not data:
                    selector.unregister(key.fileobj)
                total += len(data)
                if total > 32768:
                    raise RuntimeError("owned Java combined output exceeded 32 KiB")
        return process.wait(timeout=max(.1, deadline - time.monotonic()))
    finally:
        selector.close()
        if process.poll() is None:
            process.kill()  # Exact owned child only; this command spawns no additional subprocesses.
        process.wait(timeout=3)
        process.stdout.close()
        process.stderr.close()


def run(jar, artifacts=None):
    jar = Path(jar).resolve(strict=True)
    if not jar.is_file() or jar.stat().st_size > 256 * 1024 * 1024:
        raise ValueError("bounded existing packaged example JAR required")
    if artifacts:
        artifacts = Path(artifacts).resolve()
        artifacts.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="owned-streaming-") as directory:
        owned = Path(directory)
        copy = owned / "example.jar"
        shutil.copyfile(jar, copy)
        fingerprint = hashlib.sha256()
        with copy.open("rb") as source:
            for chunk in iter(lambda: source.read(1024 * 1024), b""):
                fingerprint.update(chunk)
        digest = fingerprint.hexdigest()
        requests = []
        mode = {"name": "complete-known"}

        class Handler(BaseHTTPRequestHandler):
            protocol_version = "HTTP/1.1"

            def log_message(self, *_):
                pass

            def do_POST(self):
                self.connection.settimeout(3)
                size = int(self.headers.get("Content-Length", "0"))
                if not 0 < size <= 49152 or self.path != "/api/chat":
                    self.send_error(400)
                    return
                request = json.loads(self.rfile.read(size))
                if request.get("stream") is not True or request.get("model") != "teaching-stream-fixture":
                    self.send_error(400)
                    return
                name = mode["name"]
                requests.append(name)
                if name == "rate-limit":
                    self.send_response(429)
                    self.send_header("Content-Length", "0")
                    self.end_headers()
                    return
                frames = [dict(message=dict(content="café 😀"), done=False)]
                if name != "missing-final":
                    final = dict(message=dict(content=""), done=True, done_reason="stop")
                    if name == "complete-known":
                        final.update(prompt_eval_count=11, prompt_eval_cached_count=2, eval_count=3,
                                     total_duration=1000000, load_duration=0, eval_duration=900000)
                    frames.append(final)
                data = b"".join(json.dumps(frame, ensure_ascii=False).encode() + b"\n" for frame in frames)
                self.send_response(200)
                self.send_header("Content-Type", "application/x-ndjson")
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        server.daemon_threads = False
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        outcomes = []
        try:
            for name, expected in (("complete-known", "COMPLETE"), ("complete-unknown", "COMPLETE"),
                                   ("missing-final", "INCOMPLETE"), ("rate-limit", "FAILED")):
                mode["name"] = name
                report_path = owned / f"{name}.json"
                command = ["java", "-Xmx192m", "-jar", str(copy), "--stream-check",
                           f"http://127.0.0.1:{server.server_port}/api/chat", "teaching-stream-fixture",
                           "Synthetic packaged streaming exercise", str(report_path), "fixture"]
                returncode = bounded_java(command)
                assert report_path.stat().st_size <= 32768
                report = json.loads(report_path.read_text())
                assert report["status"] == expected, (name, report["status"])
                assert (returncode == 0) == (expected == "COMPLETE"), name
                assert report["budgetReservations"] == 1 and report["acceptanceAssessment"] == "not-evaluated"
                assert "Synthetic packaged" not in report_path.read_text() and "café" not in report_path.read_text()
                if name == "complete-known":
                    assert (report["inputTokens"], report["cachedInputTokens"], report["outputTokens"]) == (11, 2, 3)
                    assert report["providerTimingNanoseconds"]["totalNs"] == 1000000
                    assert report["providerTimingNanoseconds"]["promptEvaluationNs"] is None
                else:
                    assert report["inputTokens"] is None and report["outputTokens"] is None
                if name == "rate-limit":
                    assert report["failure"] == "RATE_LIMITED" and report["firstNonemptyContentMs"] is None
                if artifacts:
                    shutil.copyfile(report_path, artifacts / f"streaming-{name}.json")
                outcomes.append(dict(case=name, status=report["status"], failure=report["failure"]))
            assert requests == [item["case"] for item in outcomes], "no retries or hidden requests"
        finally:
            server.shutdown()
            server.server_close()
            thread.join(timeout=3)
            if thread.is_alive():
                raise RuntimeError("owned fixture thread did not stop")
        summary = dict(evidence="actual-owned-http-fixture-not-live-model", jarSha256=digest,
                       calls=len(requests), outcomes=outcomes, ownedChildrenReaped=True, ownedFixtureStopped=True)
        if artifacts:
            (artifacts / "streaming-summary.json").write_text(json.dumps(summary, indent=2) + "\n")
        print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--jar", default=str(Path(__file__).parent / "target/ai-backend-example-0.0.1-SNAPSHOT.jar"))
    parser.add_argument("--artifacts")
    args = parser.parse_args()
    run(args.jar, args.artifacts)
