package com.csfundamentals.example.observability;

import io.opentelemetry.api.trace.SpanKind;
import io.opentelemetry.context.Context;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.concurrent.*;
import static com.csfundamentals.example.observability.TeachingTelemetry.*;

public final class ProbePipeline implements AutoCloseable {
    public enum Scenario { ok, slow, failure }
    private final TeachingTelemetry telemetry;
    private final int port;
    private final HttpClient client=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(1)).build();
    private final ThreadPoolExecutor workers=new ThreadPoolExecutor(2,2,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(4));
    public ProbePipeline(TeachingTelemetry telemetry,int port) { this.telemetry=telemetry; this.port=port; }
    public void execute(Scenario scenario) {
        Future<?> future;
        try {
            Callable<Void> work=()->telemetry.run(Stage.ASYNC,SpanKind.INTERNAL,Context.current(),()->{
                telemetry.run(Stage.DEPENDENCY_CLIENT,SpanKind.CLIENT,Context.current(),()->{
                    HttpRequest request=HttpRequest.newBuilder(URI.create("http://127.0.0.1:"+port+"/work?"+scenario.name()))
                            .timeout(Duration.ofSeconds(1)).header("traceparent",telemetry.traceparent())
                            .POST(HttpRequest.BodyPublishers.noBody()).build();
                    try {
                        HttpResponse<Void> response=client.send(request,HttpResponse.BodyHandlers.discarding());
                        if(response.statusCode()!=200) throw new ProbeFailure(Code.DEPENDENCY_FAILURE);
                    } catch(HttpTimeoutException exception) { throw new ProbeFailure(Code.DEPENDENCY_TIMEOUT); }
                    catch(java.io.IOException exception) { throw new ProbeFailure(Code.DEPENDENCY_FAILURE); }
                    return null;
                });
                return null;
            });
            future=workers.submit(Context.current().wrap(work));
        } catch(RejectedExecutionException exception) { throw new ProbeFailure(Code.OVERLOADED); }
        try { future.get(2,TimeUnit.SECONDS); }
        catch(TimeoutException exception) { future.cancel(true); throw new ProbeFailure(Code.WORKER_TIMEOUT); }
        catch(InterruptedException exception) { future.cancel(true); Thread.currentThread().interrupt(); throw new ProbeFailure(Code.INTERRUPTED); }
        catch(ExecutionException exception) {
            if(exception.getCause() instanceof ProbeFailure failure) throw failure;
            throw new ProbeFailure(Code.INTERNAL);
        }
    }
    @Override public void close() throws InterruptedException { workers.shutdownNow(); workers.awaitTermination(5,TimeUnit.SECONDS); }
}
