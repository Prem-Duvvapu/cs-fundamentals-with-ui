package com.csfundamentals.aiexample;

import java.net.URI;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import tools.jackson.databind.ObjectMapper;

/** Optional bounded command: no server, tools, credentials, model download or implicit model choice. */
public final class StreamingOllamaDemo {
    private StreamingOllamaDemo() {}
    public static void main(String[] args) throws Exception { run(args); }
    public static void run(String[] args) throws Exception {
        if (args.length != 6 || !args[0].equals("--stream-check") || !Set.of("fixture", "live-local").contains(args[5]))
            throw new IllegalArgumentException("Usage: --stream-check <loopback-api/chat> <model> <prompt> <report.json> <fixture|live-local>");
        boolean fixture = args[5].equals("fixture");
        if (fixture != args[2].equals("teaching-stream-fixture")) throw new IllegalArgumentException("streaming_model_evidence_mismatch");
        String digest = fixture ? "fixture" : System.getenv("AI_MODEL_DIGEST"), runtime = fixture ? "fixture" : System.getenv("AI_RUNTIME_VERSION");
        if (!fixture && (digest == null || !digest.matches("[a-f0-9]{64}") || runtime == null || !runtime.matches("[a-zA-Z0-9.+-]{1,80}")))
            throw new IllegalArgumentException("live_stream_requires_explicit_digest_and_runtime");
        int deadlineMs = Integer.parseInt(System.getenv().getOrDefault("AI_STREAM_DEADLINE_MS", fixture ? "6000" : "30000"));
        var limits = new StreamingOllamaClient.Limits(16384, 65536, 256, 8192, 12000, 1, 1, Duration.ofMillis(deadlineMs));
        var report = new LinkedHashMap<String, Object>();
        StreamingOllamaResult result;
        try (var client = new StreamingOllamaClient(URI.create(args[1]), args[2], limits)) {
            result = client.start(args[3]).await(limits.deadline().plusSeconds(2));
            report.put("budgetReservations", client.submittedCalls());
        }
        report.put("schemaVersion", 1); report.put("at", Instant.now().toString());
        report.put("evidence", args[5]); report.put("model", args[2]); report.put("modelDigest", digest); report.put("runtimeVersion", runtime);
        report.put("status", result.status()); report.put("failure", result.failure()); report.put("httpStatus", result.httpStatus());
        report.put("requestStarted", result.requestStarted()); report.put("contentChars", result.content().length());
        String reason = result.finishReason();
        report.put("finishReason", reason == null ? null : Set.of("stop", "length", "unload", "load", "refusal", "content_filter").contains(reason) ? reason : "unrecognized");
        report.put("inputTokens", result.inputTokens()); report.put("cachedInputTokens", result.cachedInputTokens()); report.put("outputTokens", result.outputTokens());
        report.put("providerTimingNanoseconds", result.providerTiming());
        report.put("usageSource", "Provider reported if present; missing is unknown, not zero. No character-based estimate.");
        report.put("firstNonemptyContentMs", result.firstContentMs()); report.put("totalMs", result.totalMs());
        report.put("frames", result.frames()); report.put("bodyBytes", result.bodyBytes()); report.put("limits", limits);
        report.put("acceptanceAssessment", "not-evaluated");
        report.put("scope", fixture ? "Actual owned HTTP/NDJSON contract only; no live model quality or actual provider price/cost measured."
                : "One user-selected loopback stream; not an answer-quality, safety, availability or pricing benchmark. Model/runtime identity is operator supplied, not independently discovered by this command.");
        Path output = Path.of(args[4]).toAbsolutePath();
        if (Files.isSymbolicLink(output)) throw new IllegalArgumentException("stream_report_symlink_rejected");
        byte[] data = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(report);
        if (data.length > 32768) throw new IllegalStateException("stream_report_limit");
        Path pending = Files.createTempFile(output.getParent(), ".stream-report-", ".json");
        try { Files.write(pending, data); Files.move(pending, output, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
        finally { Files.deleteIfExists(pending); }
        System.out.println("Streaming evidence=" + args[5] + " status=" + result.status() + " failure=" + result.failure()
                + " frames=" + result.frames() + " contentChars=" + result.content().length());
        if (!result.transportComplete()) throw new IllegalStateException("stream_not_complete_see_sanitized_report");
    }
}
