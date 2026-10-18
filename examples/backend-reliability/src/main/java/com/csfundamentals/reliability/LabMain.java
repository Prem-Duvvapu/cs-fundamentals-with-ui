package com.csfundamentals.reliability;

import com.sun.net.httpserver.HttpServer;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public final class LabMain {
    public static void main(String[] args) throws Exception {
        AtomicInteger requests = new AtomicInteger();
        var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 4);
        var serverWorkers = new ThreadPoolExecutor(2, 2, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), task -> { Thread t = new Thread(task, "owned-demo-dependency"); t.setDaemon(true); return t; }, new ThreadPoolExecutor.AbortPolicy());
        server.setExecutor(serverWorkers);
        server.createContext("/read", exchange -> {
            try {
                int attempt = requests.incrementAndGet();
                byte[] body = (attempt < 3 ? "temporary-unavailable" : "catalog-items=3").getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(attempt < 3 ? 503 : 200, body.length);
                exchange.getResponseBody().write(body);
            } finally { exchange.close(); }
        });
        server.start();
        var policy = new RetryPolicy(3, Duration.ofSeconds(1), Duration.ofMillis(40), Duration.ofMillis(200));
        try (var client = new ReliableReads(2, policy, new CircuitGate(2, Duration.ofSeconds(1), System::nanoTime))) {
            URI read = URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/read");
            var outcome = client.execute("GET", read, Duration.ofSeconds(3)).get(4, TimeUnit.SECONDS);
            if (!client.awaitIdle(Duration.ofSeconds(1))) throw new IllegalStateException("Owned client did not release capacity");
            System.out.println("Outcome: " + outcome.reason() + "; attempts=" + outcome.attempts() + "; dependencyRequests=" + requests.get());
            System.out.println("Counters: " + client.snapshot());
            for (var event : client.events()) System.out.println("Event: " + event);
            if (!outcome.successful() || outcome.attempts() != 3 || requests.get() != 3) throw new IllegalStateException("Retry scenario did not meet its contract");
        } finally { server.stop(0); serverWorkers.shutdownNow(); serverWorkers.awaitTermination(2, TimeUnit.SECONDS); }
    }
}
