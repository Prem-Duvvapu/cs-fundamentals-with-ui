package com.csfundamentals.aiexample;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import io.opentelemetry.sdk.testing.exporter.InMemorySpanExporter;
import java.net.NoRouteToHostException;
import java.net.http.HttpConnectTimeoutException;
import java.net.http.HttpTimeoutException;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class AiDeadlineTelemetryTests {
    @Test void requestTimeoutCompletionKeepsItsCategoryAndOriginalPublicFailure() {
        for (var cause : List.of(new HttpTimeoutException("private timeout detail"),
                new HttpConnectTimeoutException("private connection detail"),
                new NoRouteToHostException("private route detail"))) {
            var registry = new SimpleMeterRegistry();
            var exporter = InMemorySpanExporter.create();
            try (var telemetry = new AiTelemetry(registry, exporter)) {
                // The actual adapter preserves this wrapper when sendAsync completes exceptionally.
                var failure = new OllamaHttpModel.ModelFailure("provider_transport_"+cause.getClass().getSimpleName());
                var expected = cause instanceof HttpTimeoutException ? AiTelemetry.Code.DEADLINE : AiTelemetry.Code.TRANSPORT;
                assertSame(failure, assertThrows(OllamaHttpModel.ModelFailure.class, () ->
                    telemetry.observe(AiTelemetry.Stage.REQUEST, () -> telemetry.observe(AiTelemetry.Stage.MODEL, () ->
                        telemetry.observe(AiTelemetry.Stage.MODEL_HTTP, () -> { throw failure; })))));
                var spans = exporter.getFinishedSpanItems();
                assertEquals(3, spans.size());
                for (var span : spans) {
                    assertEquals(expected.name(), span.getAttributes().get(io.opentelemetry.api.common.AttributeKey.stringKey("error.type")));
                    assertTrue(span.getEvents().isEmpty());
                    assertEquals("", span.getStatus().getDescription());
                    assertFalse(span.getAttributes().toString().contains("private"));
                }
            } finally { registry.close(); }
        }
    }
}
