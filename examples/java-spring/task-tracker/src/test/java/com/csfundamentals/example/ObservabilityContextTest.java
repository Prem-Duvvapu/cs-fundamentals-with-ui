package com.csfundamentals.example;

import com.csfundamentals.example.observability.TeachingTelemetry;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.context.Context;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import org.junit.jupiter.api.Test;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

class ObservabilityContextTest {
    @Test void rawExecutorLosesParentWhileContextWrapPreservesIt() throws Exception {
        InMemorySpanExporter exporter=InMemorySpanExporter.create();
        ExecutorService executor=Executors.newSingleThreadExecutor();
        try(TeachingTelemetry telemetry=new TeachingTelemetry(new SimpleMeterRegistry(),exporter)) {
            telemetry.run(TeachingTelemetry.Stage.REQUEST,SpanKind.SERVER,Context.root(),()->{
                String parent=telemetry.traceId();
                Callable<String> work=()->telemetry.run(TeachingTelemetry.Stage.ASYNC,SpanKind.INTERNAL,Context.current(),telemetry::traceId);
                assertNotEquals(parent,executor.submit(work).get(2,TimeUnit.SECONDS));
                assertEquals(parent,executor.submit(Context.current().wrap(work)).get(2,TimeUnit.SECONDS));
                return null;
            });
            assertEquals(3,exporter.getFinishedSpanItems().size());
        } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(3,TimeUnit.SECONDS)); }
    }
}
