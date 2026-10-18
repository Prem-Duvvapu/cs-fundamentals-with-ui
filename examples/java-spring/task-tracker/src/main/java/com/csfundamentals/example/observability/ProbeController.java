package com.csfundamentals.example.observability;

import io.opentelemetry.api.trace.SpanKind;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.*;
import static com.csfundamentals.example.observability.TeachingTelemetry.*;

@RestController
@Profile("observability")
@RequestMapping("/api/observability")
public class ProbeController {
    private final TeachingTelemetry telemetry;
    private final ProbePipeline pipeline;
    public ProbeController(TeachingTelemetry telemetry,ProbePipeline pipeline) { this.telemetry=telemetry; this.pipeline=pipeline; }
    public record Result(String traceId,String outcome) {}
    @PostMapping("/probe")
    public Result probe(@RequestHeader(value="traceparent",required=false) String parent,
                        @RequestParam(defaultValue="ok") ProbePipeline.Scenario scenario) {
        return telemetry.run(Stage.REQUEST,SpanKind.SERVER,telemetry.extract(parent),()->{
            pipeline.execute(scenario);
            return new Result(telemetry.traceId(),"success");
        });
    }
    @ExceptionHandler(ProbeFailure.class)
    ProblemDetail unavailable(ProbeFailure failure) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.SERVICE_UNAVAILABLE,failure.code.name());
    }
}
