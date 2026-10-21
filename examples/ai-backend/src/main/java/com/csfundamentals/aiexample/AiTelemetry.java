package com.csfundamentals.aiexample;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.*;
import io.opentelemetry.context.propagation.TextMapGetter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.function.*;

/** Explicit local observations only; no payloads, exception details, collector or global SDK. */
public final class AiTelemetry implements AutoCloseable {
    public enum Stage { REQUEST, RETRIEVAL, CONTEXT, MODEL, MODEL_HTTP, VALIDATION, FIXTURE_PROVIDER }
    public enum Outcome { SUCCESS, ABSTAIN, ERROR }
    public enum Code { NONE, INPUT, AUTHORIZATION, RETRIEVAL_UNAVAILABLE, HTTP, RATE_LIMITED, DEADLINE,
        TRANSPORT, ENVELOPE, VALIDATION, BUDGET, CANCELLED, INTERNAL }
    public record Usage(Long input, Long output, Long cachedInput) {
        public Usage {
            if ((input == null) != (output == null) || (input == null && cachedInput != null)
                    || invalid(input) || invalid(output) || invalid(cachedInput)
                    || (cachedInput != null && cachedInput > input)) throw new IllegalArgumentException("invalid_usage_observation");
        }
        private static boolean invalid(Long value) { return value != null && (value < 0 || value > 1_000_000_000L); }
        public static Usage unknown() { return new Usage(null, null, null); }
        public boolean known() { return input != null; }
    }
    public record Trace(String traceId, String spanId, String parentSpanId, boolean remoteParent,
                        Stage stage, String kind, Outcome outcome, Code error, long durationNanos) {}
    public static final class RecordingExporter implements SpanExporter {
        private final List<Trace> traces = new ArrayList<>();
        private long dropped;
        @Override public synchronized CompletableResultCode export(Collection<SpanData> spans) {
            for (SpanData span : spans) {
                if (traces.size() >= 256) { dropped++; continue; }
                try {
                    Stage stage = Stage.valueOf(span.getName());
                    var attrs = span.getAttributes();
                    Outcome outcome = Outcome.valueOf(attrs.get(io.opentelemetry.api.common.AttributeKey.stringKey("ai.outcome")));
                    Code error = Code.valueOf(attrs.get(io.opentelemetry.api.common.AttributeKey.stringKey("error.type")));
                    traces.add(new Trace(span.getTraceId(), span.getSpanId(), span.getParentSpanId(),
                            span.getParentSpanContext().isRemote(), stage, span.getKind().name(), outcome, error,
                            Math.max(0, span.getEndEpochNanos() - span.getStartEpochNanos())));
                } catch (IllegalArgumentException | NullPointerException ignored) { dropped++; }
            }
            return CompletableResultCode.ofSuccess();
        }
        public synchronized List<Trace> snapshot() { return List.copyOf(traces); }
        public synchronized long dropped() { return dropped; }
        @Override public CompletableResultCode flush() { return CompletableResultCode.ofSuccess(); }
        @Override public CompletableResultCode shutdown() { return CompletableResultCode.ofSuccess(); }
    }
    private static final AiTelemetry NOOP = new AiTelemetry();
    private final OpenTelemetrySdk sdk;
    private final Tracer tracer;
    private final MeterRegistry meters;
    private AiTelemetry() { sdk = null; tracer = null; meters = null; }
    public static AiTelemetry noop() { return NOOP; }
    public boolean enabled() { return sdk != null; }
    public AiTelemetry(MeterRegistry meters, SpanExporter exporter) {
        this.meters = Objects.requireNonNull(meters);
        var provider = SdkTracerProvider.builder().setResource(Resource.create(
                Attributes.builder().put("service.name", "ai-backend-stage-lab").build()))
                .addSpanProcessor(SimpleSpanProcessor.create(Objects.requireNonNull(exporter))).build();
        sdk = OpenTelemetrySdk.builder().setTracerProvider(provider).build();
        tracer = sdk.getTracer("ai-backend.stages", "1.0");
    }
    public <T> T observe(Stage stage, Supplier<T> work) { return observe(stage, work, ignored -> Outcome.SUCCESS); }
    public <T> T observe(Stage stage, Supplier<T> work, Function<T, Outcome> resultOutcome) {
        return observe(stage, stage == Stage.MODEL_HTTP ? SpanKind.CLIENT : SpanKind.INTERNAL,
                Context.current(), work, resultOutcome);
    }
    public <T> T observe(Stage stage, SpanKind kind, Context parent, Supplier<T> work, Function<T, Outcome> resultOutcome) {
        if (!enabled()) return work.get();
        Span span = tracer.spanBuilder(stage.name()).setSpanKind(kind).setParent(parent).startSpan();
        long started = System.nanoTime();
        Outcome outcome = Outcome.SUCCESS; Code code = Code.NONE;
        try (Scope ignored = span.makeCurrent()) {
            T result = work.get(); outcome = resultOutcome.apply(result); return result;
        } catch (RuntimeException | Error failure) {
            outcome = Outcome.ERROR; code = classify(stage, failure); throw failure;
        } finally {
            span.setAttribute("ai.stage", stage.name()); span.setAttribute("ai.outcome", outcome.name());
            span.setAttribute("error.type", code.name());
            if (outcome == Outcome.ERROR) span.setStatus(StatusCode.ERROR);
            try {
                Timer.builder("ai.stage.duration").tags("stage", stage.name(), "outcome", outcome.name())
                        .minimumExpectedValue(Duration.ofMillis(1)).maximumExpectedValue(Duration.ofSeconds(10))
                        .register(meters).record(System.nanoTime() - started, TimeUnit.NANOSECONDS);
                meters.counter("ai.stage.calls", "stage", stage.name(), "outcome", outcome.name(), "error", code.name()).increment();
            } finally { span.end(); }
        }
    }
    private static Code classify(Stage stage, Throwable failure) {
        if (failure instanceof SecurityException) return Code.AUTHORIZATION;
        if (failure instanceof KnowledgeRetrieval.Unavailable) return Code.RETRIEVAL_UNAVAILABLE;
        if (failure instanceof OllamaHttpModel.ModelFailure) {
            String code = failure.getMessage();
            if ("provider_http_429".equals(code)) return Code.RATE_LIMITED;
            if ("provider_deadline".equals(code)) return Code.DEADLINE;
            if ("cancelled".equals(code)) return Code.CANCELLED;
            if ("input_limit".equals(code)) return Code.INPUT;
            if ("call_budget_exhausted".equals(code)) return Code.BUDGET;
            if (code != null && code.startsWith("provider_transport_")) return Code.TRANSPORT;
            if (code != null && code.startsWith("provider_http_")) return Code.HTTP;
            return Code.ENVELOPE;
        }
        if (failure instanceof IllegalArgumentException) {
            if ("invalid_question".equals(failure.getMessage())) return Code.INPUT;
            if (stage == Stage.VALIDATION || Set.of("invalid_answer_schema", "unsupported_citation", "invalid_answer_json")
                    .contains(Objects.toString(failure.getMessage(), ""))) return Code.VALIDATION;
        }
        return Code.INTERNAL;
    }
    public void usage(Usage usage) {
        if (!enabled()) return;
        meters.counter("ai.model.usage.calls", "state", usage.known() ? "known" : "unknown").increment();
        if (!usage.known()) return;
        meters.counter("ai.model.known.tokens", "direction", "input").increment(usage.input());
        meters.counter("ai.model.known.tokens", "direction", "output").increment(usage.output());
        if (usage.cachedInput() != null) meters.counter("ai.model.known.tokens", "direction", "cached_input").increment(usage.cachedInput());
    }
    public String traceparent() {
        if (!enabled()) return null;
        String[] value = {null};
        W3CTraceContextPropagator.getInstance().inject(Context.current(), value,
                (carrier, key, text) -> { if (key.equals("traceparent")) carrier[0] = text; });
        return value[0];
    }
    public Context extract(String header) {
        if (!enabled() || header == null || header.length() != 55) return Context.root();
        return W3CTraceContextPropagator.getInstance().extract(Context.root(), header,
                (TextMapGetter<String>) (carrier, key) -> key.equals("traceparent") ? carrier : null);
    }
    @Override public void close() { if (sdk != null) sdk.close(); }
}
