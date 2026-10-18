package com.csfundamentals.reliability;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

final class FaultServer implements AutoCloseable {
    @FunctionalInterface interface Handler { void handle(HttpExchange exchange, int count) throws Exception; }
    final AtomicInteger received = new AtomicInteger();
    private final List<CountDownLatch> gates = new ArrayList<>();
    private final HttpServer server;
    private final ExecutorService workers = new ThreadPoolExecutor(8, 8, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), task -> { Thread t = new Thread(task, "owned-fault-server"); t.setDaemon(true); return t; }, new ThreadPoolExecutor.AbortPolicy());
    FaultServer(Handler handler) throws IOException {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 8);
        server.setExecutor(workers);
        server.createContext("/", exchange -> {
            int count = received.incrementAndGet();
            try { handler.handle(exchange, count); }
            catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            catch (Exception ignored) { /* Fault injection may intentionally disconnect an owned socket. */ }
            finally { exchange.close(); }
        });
        server.start();
    }
    URI uri() { return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/read"); }
    CountDownLatch gate(int count) { CountDownLatch gate = new CountDownLatch(count); gates.add(gate); return gate; }
    static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
    }
    @Override public void close() throws InterruptedException {
        for (CountDownLatch gate : gates) while (gate.getCount() > 0) gate.countDown();
        server.stop(0); workers.shutdownNow(); workers.awaitTermination(2, TimeUnit.SECONDS);
    }
}
