package com.csfundamentals.testing;

import com.sun.net.httpserver.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class LabGuardTest {
    @Test void percentilesAndHistogramIncludeFastErrorsAndSlowTransportFailures() {
        var attempts = new ArrayList<LoadSummary.Attempt>();
        for (int i = 1; i <= 20; i++) attempts.add(new LoadSummary.Attempt(i * 1_000_000L, i == 1 ? "503" : i == 20 ? "transport" : "200", i != 1 && i != 20));
        var result = LoadSummary.of(attempts, 2_000_000_000L);
        assertEquals(18, result.successes()); assertEquals(2, result.errors());
        assertEquals(10.0, result.p50Ms()); assertEquals(19.0, result.p95Ms()); assertEquals(10.0, result.throughputPerSecond());
        assertEquals(20, result.latencyBuckets().values().stream().mapToInt(Integer::intValue).sum());
        assertEquals(1, result.outcomes().get("transport"));
    }
    @Test void badAsyncReadHasTwoCausallyForcedSchedulesAndWaitingForCompletionFixesIt() throws Exception {
        var worker = Executors.newSingleThreadExecutor();
        var release = new CountDownLatch(1); var entered = new CountDownLatch(1);
        var value = new AtomicReference<String>();
        try {
            var completion = worker.submit(() -> {
                entered.countDown(); if (!release.await(3, TimeUnit.SECONDS)) throw new IllegalStateException("owned_worker_release_deadline");
                value.set("ready"); return value.get();
            });
            assertTrue(entered.await(3, TimeUnit.SECONDS));
            // This is the old flaky assertion's counterexample, expected inside a passing causal test.
            assertNull(value.get(), "A successful submit does not mean the worker completed");
            release.countDown();
            assertEquals("ready", completion.get(3, TimeUnit.SECONDS), "The fix synchronizes on completion");
            assertEquals("ready", value.get(), "The old read only passed under this later schedule");
        } finally { release.countDown(); worker.shutdownNow(); assertTrue(worker.awaitTermination(3, TimeUnit.SECONDS)); }
    }
    @Test void actualStubChecksConsumerContractButDoesNotPretendToProveProviderBehavior() throws Exception {
        var broken = new AtomicBoolean();
        try (var fixture = new OwnedStub(exchange -> {
            String body = broken.get() ? "{\"id\":\"not-a-number\",\"title\":\"synthetic\",\"completed\":false}"
                    : "{\"id\":7,\"title\":\"synthetic\",\"completed\":false}";
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.getResponseHeaders().set("Location", "/api/tasks/7");
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8); exchange.sendResponseHeaders(201, bytes.length); exchange.getResponseBody().write(bytes);
        })) {
            var client = new BoundedHttp();
            assertEquals(7, BoundedHttp.createdTask(client.request(fixture.uri(), "POST", "{}")));
            broken.set(true);
            assertThrows(IllegalStateException.class, () -> BoundedHttp.createdTask(client.request(fixture.uri(), "POST", "{}")));
        }
    }
    @Test void actualOversizedResponseAndExternalDestinationAreRejected() throws Exception {
        try (var fixture = new OwnedStub(exchange -> {
            byte[] bytes = new byte[32769]; exchange.sendResponseHeaders(200, bytes.length); exchange.getResponseBody().write(bytes);
        })) {
            var client = new BoundedHttp();
            var error = assertThrows(ExecutionException.class, () -> client.request(fixture.uri(), "GET", null));
            assertTrue(error.getCause() instanceof IllegalStateException);
            assertThrows(IllegalArgumentException.class, () -> client.request(URI.create("https://example.com/api/tasks"), "GET", null));
        }
    }
    @FunctionalInterface interface Behavior { void respond(HttpExchange exchange) throws Exception; }
    private static final class OwnedStub implements AutoCloseable {
        final HttpServer server; final ExecutorService worker = Executors.newSingleThreadExecutor();
        OwnedStub(Behavior behavior) throws Exception {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 2); server.setExecutor(worker);
            server.createContext("/api/tasks", exchange -> { try { exchange.getRequestBody().readNBytes(2049); behavior.respond(exchange); }
                catch (Exception expectedDisconnect) { /* Client assertions determine the outcome. */ } finally { exchange.close(); } });
            server.start();
        }
        URI uri() { return URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/api/tasks"); }
        public void close() throws Exception { server.stop(0); worker.shutdownNow(); assertTrue(worker.awaitTermination(3, TimeUnit.SECONDS)); }
    }
}
