package com.csfundamentals.aiexample;

import com.sun.net.httpserver.HttpServer;
import io.micrometer.core.instrument.*;
import io.micrometer.core.instrument.Timer;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.context.Context;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.net.*;
import java.nio.file.*;
import java.sql.DriverManager;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.springframework.ai.chat.client.ChatClient;
import tools.jackson.databind.ObjectMapper;

/** Fixed original fixtures execute the real RAG service and bounded HTTP adapter. */
public final class AiObservabilityDemo {
    static final String PRIVATE_MARKER = "DO_NOT_EXPORT_SOURCE_OR_ANSWER_729";
    enum Scenario { SUCCESS, ABSTENTION, RATE_LIMITED, DEADLINE, SCHEMA, CITATION, REVOKED,
        UNKNOWN_USAGE, MALFORMED_USAGE, INPUT_REJECTED, BUDGET, CONCURRENT }
    public record Case(String scenario, int operations, int httpRequests, List<AiTelemetry.Outcome> outcomes,
                       List<AiTelemetry.Code> errors) {}
    public record Metric(String name, Map<String, String> tags, long samples, double total, String unit) {}
    public record Report(int schemaVersion, String evidence, Map<String, Object> runtime, List<Case> cases,
                         List<AiTelemetry.Trace> traces, List<Metric> measurements, long droppedSpans,
                         boolean fixtureResourcesClosed, String scope) {}
    private AiObservabilityDemo() {}
    static final class Fixture implements AutoCloseable {
        final HttpServer server;
        final ExecutorService executor = Executors.newFixedThreadPool(2);
        final AtomicInteger requests = new AtomicInteger(), completed = new AtomicInteger();
        final List<String> parents = new CopyOnWriteArrayList<>();
        final CountDownLatch concurrent = new CountDownLatch(2);
        Fixture(KnowledgeStore store, Scenario scenario, AiTelemetry telemetry) throws Exception {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            server.setExecutor(executor);
            server.createContext("/api/chat", exchange -> {
                requests.incrementAndGet();
                String header = exchange.getRequestHeaders().getFirst("traceparent");
                parents.add(header == null ? "absent" : header);
                try {
                    telemetry.observe(AiTelemetry.Stage.FIXTURE_PROVIDER, SpanKind.SERVER, telemetry.extract(header), () -> {
                        try {
                            byte[] input = exchange.getRequestBody().readNBytes(49153);
                            if (input.length > 49152) throw new IllegalStateException("fixture_request_limit");
                            if (scenario == Scenario.CONCURRENT) {
                                concurrent.countDown();
                                if (!concurrent.await(2, TimeUnit.SECONDS)) throw new IllegalStateException("fixture_concurrency_deadline");
                            }
                            if (scenario == Scenario.DEADLINE) Thread.sleep(250);
                            if (scenario == Scenario.REVOKED) store.revoke("alice", "policy", 1);
                            var json = new ObjectMapper();
                            String answer = scenario == Scenario.SCHEMA ? "not-json" : json.writeValueAsString(Map.of(
                                    "answer", PRIVATE_MARKER, "citations", List.of(scenario == Scenario.CITATION ? "unretrieved:v9" : "policy:v1")));
                            var envelope = new LinkedHashMap<String, Object>();
                            envelope.put("message", Map.of("content", answer)); envelope.put("done", true); envelope.put("done_reason", "stop");
                            if (scenario != Scenario.UNKNOWN_USAGE) {
                                envelope.put("prompt_eval_count", scenario == Scenario.MALFORMED_USAGE ? "12" : 12);
                                envelope.put("eval_count", 4); envelope.put("prompt_eval_cached_count", 3);
                            }
                            byte[] body = json.writeValueAsBytes(envelope);
                            int status = scenario == Scenario.RATE_LIMITED ? 429 : 200;
                            exchange.getResponseHeaders().set("Content-Type", "application/json");
                            exchange.sendResponseHeaders(status, body.length); exchange.getResponseBody().write(body);
                            if (status == 429) throw new OllamaHttpModel.ModelFailure("provider_http_429");
                            return true;
                        } catch (InterruptedException failure) {
                            Thread.currentThread().interrupt(); throw new IllegalStateException("fixture_interrupted");
                        } catch (java.io.IOException failure) {
                            throw new IllegalStateException("fixture_response_closed");
                        }
                    }, ignored -> AiTelemetry.Outcome.SUCCESS);
                } catch (RuntimeException expectedFixtureFailure) {
                    // Only fixed synthetic work executes here; raw failures never enter reports/logs.
                } finally { exchange.close(); completed.incrementAndGet(); }
            });
            server.start();
        }
        URI endpoint() { return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat"); }
        void await(int expected) throws InterruptedException {
            long until = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
            while (completed.get() < expected && System.nanoTime() < until) Thread.sleep(5);
            if (completed.get() != expected || requests.get() != expected) throw new IllegalStateException("fixture_request_count_mismatch");
        }
        @Override public void close() {
            server.stop(0); executor.shutdownNow();
            try { if (!executor.awaitTermination(2, TimeUnit.SECONDS)) throw new IllegalStateException("fixture_threads_not_closed"); }
            catch (InterruptedException failure) { Thread.currentThread().interrupt(); throw new IllegalStateException("fixture_cleanup_interrupted"); }
        }
    }
    public static Report exercise(SpanExporter additionalCapture) throws Exception {
        String version = Runtime.version().toString();
        if (Runtime.version().feature() != 17 || !version.matches("[A-Za-z0-9.+_-]{1,128}"))
            throw new IllegalStateException("observed_java17_runtime_required");
        var recorder = new AiTelemetry.RecordingExporter();
        var meters = new SimpleMeterRegistry();
        try (var telemetry = new AiTelemetry(meters,
                additionalCapture == null ? recorder : SpanExporter.composite(recorder, additionalCapture))) {
            var cases = new ArrayList<Case>();
            for (Scenario scenario : Scenario.values()) cases.add(runCase(scenario, telemetry, recorder));
            if (recorder.dropped() != 0) throw new IllegalStateException("fixture_trace_capacity_exceeded");
            return new Report(1, "actual-owned-rag-http-fixture", Map.of("feature", Runtime.version().feature(), "version", version),
                    List.copyOf(cases), recorder.snapshot(), measurements(meters), recorder.dropped(), true,
                    "Actual local lexical/JDBC/context/native HTTP/validation tracing; fixture only, no model quality, provider queue, streaming, tools, collector or production deployment evidence.");
        } finally { meters.close(); }
    }
    private static Case runCase(Scenario scenario, AiTelemetry telemetry, AiTelemetry.RecordingExporter recorder) throws Exception {
        String url = "jdbc:h2:mem:ai_trace_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        int before = recorder.snapshot().size();
        var store = new KnowledgeStore(url, "sa", "");
        try {
            store.put("alice", "policy", 0, "Refund policy", "Refund policy " + PRIVATE_MARKER, true);
            store.put("bob", "private", 0, "Refund", "TENANT_B_DO_NOT_EXPORT_348", true);
            try (var fixture = new Fixture(store, scenario, telemetry)) {
                var model = new OllamaHttpModel(fixture.endpoint(), "teaching-fixture",
                        Duration.ofMillis(scenario == Scenario.DEADLINE ? 100 : 2000), scenario == Scenario.BUDGET ? 1 : 4, telemetry);
                var service = new KnowledgeService(store, ChatClient.create(model), KnowledgeRetrieval.lexical(store), telemetry);
                int operations = scenario == Scenario.BUDGET || scenario == Scenario.CONCURRENT ? 2 : 1;
                if (scenario == Scenario.CONCURRENT) {
                    var workers = Executors.newFixedThreadPool(2);
                    try {
                        var first = workers.submit(() -> attempt(service, "refund policy"));
                        var second = workers.submit(() -> attempt(service, "refund policy"));
                        first.get(4, TimeUnit.SECONDS); second.get(4, TimeUnit.SECONDS);
                    } finally {
                        workers.shutdownNow();
                        if (!workers.awaitTermination(2, TimeUnit.SECONDS)) throw new IllegalStateException("fixture_callers_not_closed");
                    }
                } else for (int operation = 0; operation < operations; operation++)
                    attempt(service, scenario == Scenario.ABSTENTION ? "unrelated astronomy" : scenario == Scenario.INPUT_REJECTED ? " " : "refund policy");
                int expectedHttp = scenario == Scenario.ABSTENTION || scenario == Scenario.INPUT_REJECTED ? 0 : scenario == Scenario.CONCURRENT ? 2 : 1;
                fixture.await(expectedHttp);
                var traces = recorder.snapshot().subList(before, recorder.snapshot().size());
                var roots = traces.stream().filter(trace -> trace.stage() == AiTelemetry.Stage.REQUEST).toList();
                if (roots.size() != operations || traces.stream().filter(trace -> trace.stage() == AiTelemetry.Stage.MODEL_HTTP).count() != expectedHttp)
                    throw new IllegalStateException("actual_stage_execution_count_mismatch");
                for (String parent : fixture.parents) {
                    var clients = traces.stream().filter(trace -> trace.stage() == AiTelemetry.Stage.MODEL_HTTP
                            && parent.matches("00-[0-9a-f]{32}-[0-9a-f]{16}-[0-9a-f]{2}")
                            && parent.startsWith("00-" + trace.traceId() + "-" + trace.spanId() + "-")
                            && (Integer.parseInt(parent.substring(53), 16) & 1) == 1).toList();
                    if (clients.size() != 1 || traces.stream().noneMatch(trace -> trace.stage() == AiTelemetry.Stage.FIXTURE_PROVIDER
                            && trace.remoteParent() && trace.traceId().equals(clients.get(0).traceId())
                            && trace.parentSpanId().equals(clients.get(0).spanId())))
                        throw new IllegalStateException("actual_http_trace_propagation_missing");
                }
                var outcomes = roots.stream().map(AiTelemetry.Trace::outcome).toList();
                var errors = roots.stream().map(AiTelemetry.Trace::error).toList();
                var expected = switch (scenario) {
                    case RATE_LIMITED -> AiTelemetry.Code.RATE_LIMITED;
                    case DEADLINE -> AiTelemetry.Code.DEADLINE;
                    case SCHEMA, CITATION -> AiTelemetry.Code.VALIDATION;
                    case REVOKED -> AiTelemetry.Code.AUTHORIZATION;
                    case INPUT_REJECTED -> AiTelemetry.Code.INPUT;
                    default -> AiTelemetry.Code.NONE;
                };
                if (scenario == Scenario.BUDGET) {
                    if (!errors.equals(List.of(AiTelemetry.Code.NONE, AiTelemetry.Code.BUDGET))) throw new IllegalStateException("budget_stage_attribution_missing");
                } else if (errors.stream().anyMatch(code -> code != expected)) throw new IllegalStateException("stage_failure_attribution_missing");
                if (scenario == Scenario.ABSTENTION && !outcomes.equals(List.of(AiTelemetry.Outcome.ABSTAIN)))
                    throw new IllegalStateException("abstention_not_observed");
                return new Case(scenario.name(), operations, fixture.requests.get(), outcomes, errors);
            }
        } finally {
            try (var connection = DriverManager.getConnection(url, "sa", ""); var statement = connection.createStatement()) { statement.execute("SHUTDOWN"); }
        }
    }
    private static void attempt(KnowledgeService service, String question) {
        try { service.ask("alice", question); }
        catch (OllamaHttpModel.ModelFailure | IllegalArgumentException | SecurityException expected) { }
    }
    private static List<Metric> measurements(MeterRegistry registry) {
        var result = new ArrayList<Metric>();
        for (var meter : registry.getMeters()) {
            if (!meter.getId().getName().startsWith("ai.")) continue;
            var tags = new TreeMap<String, String>(); meter.getId().getTags().forEach(tag -> tags.put(tag.getKey(), tag.getValue()));
            if (meter instanceof Timer timer) result.add(new Metric(meter.getId().getName(), tags, timer.count(), timer.totalTime(TimeUnit.NANOSECONDS), "nanoseconds"));
            else if (meter instanceof Counter counter) result.add(new Metric(meter.getId().getName(), tags, (long) counter.count(), counter.count(), "count"));
            else throw new IllegalStateException("unexpected_stage_metric");
        }
        result.sort(Comparator.comparing(Metric::name).thenComparing(value -> value.tags().toString()));
        return List.copyOf(result);
    }
    public static void run(String[] args) throws Exception {
        if (args.length != 2 || !args[0].equals("--observe-fixture")) throw new IllegalArgumentException("Usage: --observe-fixture <report.json>");
        Report report = exercise(null);
        Path destination = Path.of(args[1]).toAbsolutePath();
        if (Files.isSymbolicLink(destination)) throw new IllegalArgumentException("observation_report_symlink_rejected");
        byte[] data = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(report);
        if (data.length > 65536) throw new IllegalStateException("observation_report_limit");
        Path pending = Files.createTempFile(destination.getParent(), ".ai-stage-", ".json");
        try { Files.write(pending, data); Files.move(pending, destination, StandardCopyOption.ATOMIC_MOVE, StandardCopyOption.REPLACE_EXISTING); }
        finally { Files.deleteIfExists(pending); }
        System.out.println("AI stage fixture: cases=" + report.cases().size() + " spans=" + report.traces().size() + " resourcesClosed=" + report.fixtureResourcesClosed());
    }
}
