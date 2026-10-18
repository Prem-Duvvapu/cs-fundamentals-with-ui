package com.csfundamentals.example.observability;

import io.opentelemetry.sdk.common.CompletableResultCode;
import io.opentelemetry.sdk.trace.data.SpanData;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import java.util.Collection;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/** Real SDK exporter to bounded-schema local JSON log payloads; no remote collector. */
public final class LocalSpanLogExporter implements SpanExporter {
    private static final Logger LOG=LoggerFactory.getLogger("teaching.observability");
    @Override public CompletableResultCode export(Collection<SpanData> spans) {
        for(SpanData span:spans) {
            // All text fields originate in fixed enum names or SDK-generated hexadecimal IDs.
            LOG.info("{\"event\":\"probe.span\",\"trace_id\":\"{}\",\"span_id\":\"{}\",\"parent_span_id\":\"{}\",\"stage\":\"{}\",\"status\":\"{}\",\"error_type\":\"{}\",\"duration_ms\":{}}",
                    span.getTraceId(),span.getSpanId(),span.getParentSpanId(),span.getName(),span.getStatus().getStatusCode(),
                    java.util.Objects.toString(span.getAttributes().get(io.opentelemetry.api.common.AttributeKey.stringKey("error.type")),"NONE"),
                    (span.getEndEpochNanos()-span.getStartEpochNanos())/1_000_000.0);
        }
        return CompletableResultCode.ofSuccess();
    }
    @Override public CompletableResultCode flush() { return CompletableResultCode.ofSuccess(); }
    @Override public CompletableResultCode shutdown() { return CompletableResultCode.ofSuccess(); }
}
