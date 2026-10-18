package com.csfundamentals.example.observability;

import com.csfundamentals.example.TaskRepository;
import com.sun.net.httpserver.HttpServer;
import io.opentelemetry.api.trace.SpanKind;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.*;
import static com.csfundamentals.example.observability.TeachingTelemetry.*;

/** Owned loopback fixture with real HTTP and transactional repository work. */
public final class ProbeDependency implements AutoCloseable {
    private final HttpServer server;
    private final ThreadPoolExecutor workers=new ThreadPoolExecutor(2,2,0,TimeUnit.MILLISECONDS,new ArrayBlockingQueue<>(4));
    public ProbeDependency(TeachingTelemetry telemetry,TaskRepository repository) throws Exception {
        server=HttpServer.create(new InetSocketAddress("127.0.0.1",0),4);
        server.setExecutor(workers);
        server.createContext("/work",exchange->{
            int status=200;
            try {
                telemetry.run(Stage.DEPENDENCY_SERVER,SpanKind.SERVER,telemetry.extract(exchange.getRequestHeaders().getFirst("traceparent")),()->{
                    if(!exchange.getRequestMethod().equals("POST") || !exchange.getRequestURI().getPath().equals("/work")) throw new ProbeFailure(Code.DEPENDENCY_FAILURE);
                    String scenario=exchange.getRequestURI().getRawQuery();
                    if("slow".equals(scenario)) Thread.sleep(80);
                    if("failure".equals(scenario)) throw new ProbeFailure(Code.DEPENDENCY_FAILURE);
                    telemetry.run(Stage.DATABASE,SpanKind.INTERNAL,io.opentelemetry.context.Context.current(),()->{
                        try { repository.add("Observability synthetic fixture"); }
                        catch(RuntimeException exception) { throw new ProbeFailure(Code.DATABASE_FAILURE); }
                        return null;
                    });
                    return null;
                });
            } catch(ProbeFailure failure) { status=503; }
            byte[] body="{}".getBytes(StandardCharsets.UTF_8);
            try { exchange.sendResponseHeaders(status,body.length); exchange.getResponseBody().write(body); }
            finally { exchange.close(); }
        });
        server.start();
    }
    public int port() { return server.getAddress().getPort(); }
    @Override public void close() throws InterruptedException {
        server.stop(0); workers.shutdownNow(); workers.awaitTermination(5,TimeUnit.SECONDS);
    }
}
