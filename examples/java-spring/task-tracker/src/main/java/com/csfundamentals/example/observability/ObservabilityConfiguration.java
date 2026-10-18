package com.csfundamentals.example.observability;

import com.csfundamentals.example.TaskRepository;
import io.micrometer.core.instrument.MeterRegistry;
import io.opentelemetry.sdk.trace.export.SpanExporter;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.*;

@Configuration
@Profile("observability")
public class ObservabilityConfiguration {
    @Bean @ConditionalOnMissingBean(SpanExporter.class)
    SpanExporter localSpanExporter() { return new LocalSpanLogExporter(); }
    @Bean(destroyMethod="close")
    TeachingTelemetry teachingTelemetry(MeterRegistry meters,SpanExporter exporter) { return new TeachingTelemetry(meters,exporter); }
    @Bean(destroyMethod="close")
    ProbeDependency probeDependency(TeachingTelemetry telemetry,TaskRepository repository) throws Exception {
        return new ProbeDependency(telemetry,repository);
    }
    @Bean(destroyMethod="close")
    ProbePipeline probePipeline(TeachingTelemetry telemetry,ProbeDependency dependency) { return new ProbePipeline(telemetry,dependency.port()); }
}
