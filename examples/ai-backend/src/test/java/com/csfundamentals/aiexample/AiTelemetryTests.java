package com.csfundamentals.aiexample;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.junit.jupiter.api.*;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class AiTelemetryTests {
    private static AiObservabilityDemo.Report report;
    private static List<SpanData> raw;
    @BeforeAll static void actualPipeline() throws Exception {
        var capture = InMemorySpanExporter.create();
        // Retain actual SDK records before its shutdown clears the test exporter's buffer.
        SpanExporter retain = new SpanExporter() {
            public CompletableResultCode export(Collection<SpanData> spans) { return capture.export(spans); }
            public CompletableResultCode flush() { return capture.flush(); }
            public CompletableResultCode shutdown() { return CompletableResultCode.ofSuccess(); }
        };
        try { report = AiObservabilityDemo.exercise(retain); raw = List.copyOf(capture.getFinishedSpanItems()); }
        finally { capture.close(); }
    }
    @Test void realRetrievalContextNativeHttpAndValidationHaveCausalParentsAndIsolatedConcurrentRequests() {
        assertEquals(12, report.cases().size()); assertEquals(83, raw.size());
        assertEquals(11, report.cases().stream().mapToInt(AiObservabilityDemo.Case::httpRequests).sum());
        var byId = raw.stream().collect(Collectors.toMap(SpanData::getSpanId, Function.identity()));
        var roots = raw.stream().filter(span -> span.getName().equals("REQUEST")).toList();
        assertEquals(14, roots.size()); assertEquals(14, roots.stream().map(SpanData::getTraceId).distinct().count());
        for (var span : raw) {
            if (span.getName().equals("REQUEST")) { assertEquals("0000000000000000", span.getParentSpanId()); continue; }
            var parent = byId.get(span.getParentSpanId()); assertNotNull(parent);
            assertEquals(span.getTraceId(), parent.getTraceId());
            assertEquals(switch (span.getName()) { case "MODEL_HTTP" -> "MODEL"; case "FIXTURE_PROVIDER" -> "MODEL_HTTP"; default -> "REQUEST"; }, parent.getName());
            assertEquals(span.getName().equals("FIXTURE_PROVIDER"), span.getParentSpanContext().isRemote());
            assertEquals(switch (span.getName()) { case "MODEL_HTTP" -> "CLIENT"; case "FIXTURE_PROVIDER" -> "SERVER"; default -> "INTERNAL"; }, span.getKind().name());
        }
        var counts = raw.stream().collect(Collectors.groupingBy(SpanData::getName, Collectors.counting()));
        assertEquals(Map.of("REQUEST",14L,"RETRIEVAL",13L,"CONTEXT",13L,"MODEL",12L,"MODEL_HTTP",11L,"FIXTURE_PROVIDER",11L,"VALIDATION",9L), counts);
        assertEquals(0, report.droppedSpans()); assertTrue(report.fixtureResourcesClosed());
    }
    @Test void errorsAndAbstentionReflectStagesThatActuallyExecuted() {
        var cases = report.cases().stream().collect(Collectors.toMap(AiObservabilityDemo.Case::scenario, Function.identity()));
        assertEquals(List.of(AiTelemetry.Outcome.ABSTAIN), cases.get("ABSTENTION").outcomes());
        assertEquals(0, cases.get("ABSTENTION").httpRequests()); assertEquals(0, cases.get("INPUT_REJECTED").httpRequests());
        assertEquals(List.of(AiTelemetry.Code.NONE,AiTelemetry.Code.BUDGET), cases.get("BUDGET").errors());
        for (var expected : Map.of("RATE_LIMITED",AiTelemetry.Code.RATE_LIMITED,"DEADLINE",AiTelemetry.Code.DEADLINE,
                "SCHEMA",AiTelemetry.Code.VALIDATION,"CITATION",AiTelemetry.Code.VALIDATION,"REVOKED",AiTelemetry.Code.AUTHORIZATION).entrySet())
            assertEquals(List.of(expected.getValue()), cases.get(expected.getKey()).errors());
        var byTrace = report.traces().stream().collect(Collectors.groupingBy(AiTelemetry.Trace::traceId));
        for (var traces : byTrace.values()) {
            var root = traces.stream().filter(trace -> trace.stage() == AiTelemetry.Stage.REQUEST).findFirst().orElseThrow();
            var stages = traces.stream().map(AiTelemetry.Trace::stage).collect(Collectors.toSet());
            if (root.error() == AiTelemetry.Code.INPUT) assertEquals(Set.of(AiTelemetry.Stage.REQUEST), stages);
            if (root.outcome() == AiTelemetry.Outcome.ABSTAIN) assertEquals(Set.of(AiTelemetry.Stage.REQUEST,AiTelemetry.Stage.RETRIEVAL,AiTelemetry.Stage.CONTEXT), stages);
            if (Set.of(AiTelemetry.Code.RATE_LIMITED,AiTelemetry.Code.DEADLINE,AiTelemetry.Code.BUDGET).contains(root.error())) assertFalse(stages.contains(AiTelemetry.Stage.VALIDATION));
        }
    }
    @Test void latencyAndUsageKeepFailedCallsInTheirDenominatorAndDoNotInventMissingTokens() {
        for (var stage : AiTelemetry.Stage.values()) {
            long actual = raw.stream().filter(span -> span.getName().equals(stage.name())).count();
            assertEquals(actual, report.measurements().stream().filter(metric -> metric.name().equals("ai.stage.duration") && stage.name().equals(metric.tags().get("stage"))).mapToLong(AiObservabilityDemo.Metric::samples).sum());
            assertEquals(actual, report.measurements().stream().filter(metric -> metric.name().equals("ai.stage.calls") && stage.name().equals(metric.tags().get("stage"))).mapToLong(AiObservabilityDemo.Metric::samples).sum());
        }
        assertEquals(7, metric("ai.model.usage.calls","state","known"));
        assertEquals(5, metric("ai.model.usage.calls","state","unknown"));
        assertEquals(84, metric("ai.model.known.tokens","direction","input"));
        assertEquals(28, metric("ai.model.known.tokens","direction","output"));
        assertEquals(21, metric("ai.model.known.tokens","direction","cached_input"));
        assertTrue(report.measurements().stream().allMatch(metric -> metric.samples() >= 0 && Double.isFinite(metric.total()) && metric.total() >= 0));
    }
    private static long metric(String name, String tag, String value) {
        return report.measurements().stream().filter(metric -> metric.name().equals(name) && value.equals(metric.tags().get(tag))).mapToLong(AiObservabilityDemo.Metric::samples).sum();
    }
    @Test void onlyFixedStageMetadataLeavesSdkAndReportsNeverContainPayloads() {
        for (var span : raw) {
            var attributes = span.getAttributes().asMap();
            assertEquals(Set.of("ai.stage","ai.outcome","error.type"), attributes.keySet().stream().map(key -> key.getKey()).collect(Collectors.toSet()));
            assertTrue(span.getEvents().isEmpty()); assertTrue(span.getLinks().isEmpty()); assertEquals("",span.getStatus().getDescription());
            assertEquals(1,span.getResource().getAttributes().size());
            assertEquals("ai-backend-stage-lab",span.getResource().getAttribute(io.opentelemetry.api.common.AttributeKey.stringKey("service.name")));
        }
        for (var metric : report.measurements()) {
            assertTrue(Set.of("stage","outcome","error","state","direction").containsAll(metric.tags().keySet()));
            for (var value : metric.tags().values()) assertTrue(value.matches("[A-Z_]+|known|unknown|input|output|cached_input"));
        }
        String encoded = new ObjectMapper().writeValueAsString(report);
        for (String forbidden : List.of(AiObservabilityDemo.PRIVATE_MARKER,"TENANT_B_DO_NOT_EXPORT_348","alice","bob","policy:v1","Refund policy","http://","prompt_eval_count","stackTrace"))
            assertFalse(encoded.contains(forbidden),forbidden);
    }
    @Test void originalExceptionAndThreadContextArePreservedWithoutRawErrorExport() {
        var registry = new SimpleMeterRegistry(); var exporter = InMemorySpanExporter.create();
        try (var telemetry = new AiTelemetry(registry,exporter)) {
            String previous = Span.current().getSpanContext().getSpanId();
            var failure = new IllegalStateException(AiObservabilityDemo.PRIVATE_MARKER);
            assertSame(failure,assertThrows(IllegalStateException.class,() -> telemetry.observe(AiTelemetry.Stage.REQUEST,() -> { throw failure; })));
            assertEquals(previous,Span.current().getSpanContext().getSpanId());
            var span = exporter.getFinishedSpanItems().get(0); assertEquals(StatusCode.ERROR,span.getStatus().getStatusCode());
            assertEquals("",span.getStatus().getDescription()); assertTrue(span.getEvents().isEmpty());
            assertFalse(span.getAttributes().toString().contains(AiObservabilityDemo.PRIVATE_MARKER));
        } finally { registry.close(); }
    }
    @Test void legacyHttpConstructorKeepsHeadersAndBusinessOutputUnchanged() throws Exception {
        String url = "jdbc:h2:mem:trace_default_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        var store = new KnowledgeStore(url,"sa","");
        try (var fixture = new AiObservabilityDemo.Fixture(store,AiObservabilityDemo.Scenario.SUCCESS,AiTelemetry.noop())) {
            var model = new OllamaHttpModel(fixture.endpoint(),"teaching-fixture",java.time.Duration.ofSeconds(2),1);
            var answer = model.call(new org.springframework.ai.chat.prompt.Prompt("An original synthetic prompt"));
            assertTrue(answer.getResult().getOutput().getText().contains(AiObservabilityDemo.PRIVATE_MARKER));
            fixture.await(1); assertEquals(List.of("absent"),fixture.parents);
        } finally {
            try (var connection = java.sql.DriverManager.getConnection(url,"sa",""); var statement = connection.createStatement()) { statement.execute("SHUTDOWN"); }
        }
    }
    @Test void usageParsingIsStrictAndMissingCachedUsageStaysUnknownInsteadOfZero() {
        var json = new ObjectMapper();
        assertEquals(new AiTelemetry.Usage(12L,4L,null),OllamaHttpModel.observeUsage(json.readTree("{\"prompt_eval_count\":12,\"eval_count\":4}")));
        for (String invalid : List.of("null","{}","{\"prompt_eval_count\":12,\"eval_count\":null}",
                "{\"prompt_eval_count\":-1,\"eval_count\":4}","{\"prompt_eval_count\":1.5,\"eval_count\":4}",
                "{\"prompt_eval_count\":\"12\",\"eval_count\":4}","{\"prompt_eval_count\":1000000001,\"eval_count\":4}",
                "{\"prompt_eval_count\":12,\"eval_count\":4,\"prompt_eval_cached_count\":13}",
                "{\"prompt_eval_count\":12,\"eval_count\":4,\"prompt_eval_cached_count\":null}"))
            assertEquals(AiTelemetry.Usage.unknown(),OllamaHttpModel.observeUsage(json.readTree(invalid)));
        assertFalse(AiTelemetry.noop().enabled()); assertNull(AiTelemetry.noop().traceparent());
        var expected = new Object(); assertSame(expected,AiTelemetry.noop().observe(AiTelemetry.Stage.REQUEST,() -> expected));
        assertFalse(new AiConfiguration().aiTelemetry(new SimpleMeterRegistry(),false).enabled());
    }
}
