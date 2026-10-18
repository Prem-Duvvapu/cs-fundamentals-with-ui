package com.csfundamentals.example.observability;

import io.micrometer.core.instrument.MeterRegistry;
import io.micrometer.core.instrument.Timer;
import io.opentelemetry.api.common.Attributes;
import io.opentelemetry.api.trace.*;
import io.opentelemetry.context.*;
import io.opentelemetry.api.trace.propagation.W3CTraceContextPropagator;
import io.opentelemetry.context.propagation.TextMapGetter;
import io.opentelemetry.sdk.OpenTelemetrySdk;
import io.opentelemetry.sdk.resources.Resource;
import io.opentelemetry.sdk.trace.SdkTracerProvider;
import io.opentelemetry.sdk.trace.export.*;
import java.time.Duration;
import java.util.concurrent.TimeUnit;

/** Explicit teaching scope: fixed stage/outcome values and no request payload attributes. */
public final class TeachingTelemetry implements AutoCloseable {
    public enum Stage { REQUEST, ASYNC, DEPENDENCY_CLIENT, DEPENDENCY_SERVER, DATABASE }
    public enum Code { DEPENDENCY_FAILURE, DEPENDENCY_TIMEOUT, WORKER_TIMEOUT, OVERLOADED, DATABASE_FAILURE, INTERRUPTED, INTERNAL }
    public static final class ProbeFailure extends RuntimeException {
        public final Code code;
        public ProbeFailure(Code code) { super(code.name()); this.code=code; }
    }
    @FunctionalInterface public interface Work<T> { T call() throws Exception; }
    private final OpenTelemetrySdk sdk;
    private final Tracer tracer;
    private final MeterRegistry meters;

    public TeachingTelemetry(MeterRegistry meters, SpanExporter exporter) {
        this.meters=meters;
        SdkTracerProvider provider=SdkTracerProvider.builder()
                .setResource(Resource.create(Attributes.builder().put("service.name","task-tracker-observability").build()))
                .addSpanProcessor(SimpleSpanProcessor.create(exporter)).build();
        sdk=OpenTelemetrySdk.builder().setTracerProvider(provider).build();
        tracer=sdk.getTracer("task-tracker.teaching","1.0");
    }
    public <T> T run(Stage stage, SpanKind kind, Context parent, Work<T> work) {
        Span span=tracer.spanBuilder(stage.name()).setSpanKind(kind).setParent(parent).startSpan();
        span.setAttribute("lab.stage",stage.name());
        long start=System.nanoTime(); String outcome="success";
        try(Scope ignored=span.makeCurrent()) {
            return work.call();
        } catch(Exception exception) {
            outcome="error";
            Code code=exception instanceof ProbeFailure failure ? failure.code : Code.INTERNAL;
            span.setStatus(StatusCode.ERROR); span.setAttribute("error.type",code.name());
            // No exception message/stack trace: they may contain user values or credentials.
            if(exception instanceof ProbeFailure failure) throw failure;
            if(exception instanceof InterruptedException) Thread.currentThread().interrupt();
            throw new ProbeFailure(code);
        } finally {
            long elapsed=System.nanoTime()-start;
            Timer.builder("tasktracker.probe.duration").tags("stage",stage.name(),"outcome",outcome)
                    .minimumExpectedValue(Duration.ofMillis(1)).maximumExpectedValue(Duration.ofSeconds(3))
                    .serviceLevelObjectives(Duration.ofMillis(50),Duration.ofMillis(100),Duration.ofMillis(250),Duration.ofSeconds(1),Duration.ofSeconds(2))
                    .register(meters).record(elapsed,TimeUnit.NANOSECONDS);
            meters.counter("tasktracker.probe.calls","stage",stage.name(),"outcome",outcome).increment();
            span.end();
        }
    }
    public Context extract(String traceparent) {
        // Ignore baggage/tracestate and bound even the only accepted propagation header.
        if(traceparent==null || traceparent.length()>55) return Context.root();
        return W3CTraceContextPropagator.getInstance().extract(Context.root(),traceparent,
                (TextMapGetter<String>) (carrier,key)->"traceparent".equals(key)?carrier:null);
    }
    public String traceparent() {
        String[] result={null};
        W3CTraceContextPropagator.getInstance().inject(Context.current(),result,
                (carrier,key,value)->{ if("traceparent".equals(key))carrier[0]=value; });
        return result[0];
    }
    public String traceId() { return Span.current().getSpanContext().getTraceId(); }
    @Override public void close() { sdk.close(); }
}
