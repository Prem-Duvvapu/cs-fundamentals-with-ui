package com.csfundamentals.aiexample;

import com.sun.net.httpserver.*;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.Predicate;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.aiexample.StreamingOllamaResult.*;

class StreamingOllamaTests {
    private static final Duration WAIT = Duration.ofSeconds(5);
    private static StreamingOllamaClient.Limits limits(int frame, int body, int frames, int content, int calls, int concurrent, int deadline) {
        return new StreamingOllamaClient.Limits(frame, body, frames, content, 1000, calls, concurrent, Duration.ofMillis(deadline));
    }
    private static StreamingOllamaClient.Limits normal() { return limits(4096, 16384, 20, 3000, 4, 2, 3000); }
    private static byte[] bytes(String value) { return value.getBytes(StandardCharsets.UTF_8); }
    private static String delta(String text) { return new tools.jackson.databind.ObjectMapper().writeValueAsString(Map.of("message", Map.of("content", text), "done", false)) + "\n"; }
    private static String done(String reason, String metadata) { return "{\"message\":{\"content\":\"\"},\"done\":true,\"done_reason\":\"" + reason + "\"" + metadata + "}\n"; }

    @Test void utf8MayCrossActualNetworkDeliveriesWithoutProducingReplacementCharacters() throws Exception {
        byte[] first = bytes(delta("café😀")); int split = 0;
        while ((first[split] & 255) != 0xc3) split++;
        int boundary = split + 1;
        try (var fixture = new OwnedFixture(exchange -> {
            exchange.sendResponseHeaders(200, 0);
            exchange.getResponseBody().write(first, 0, boundary); exchange.getResponseBody().flush();
            awaitRelease(exchange);
            exchange.getResponseBody().write(first, boundary, first.length - boundary);
            exchange.getResponseBody().write(bytes(done("stop", ",\"prompt_eval_count\":10,\"prompt_eval_cached_count\":3,\"eval_count\":2")));
        }); var client = fixture.client(normal())) {
            var handle = client.start("Synthetic Unicode test");
            awaitSnapshot(handle, value -> value.bodyBytes() >= boundary);
            assertEquals(0, handle.snapshot().frames()); assertNull(handle.snapshot().firstContentMs());
            fixture.release.countDown();
            var result = handle.await(WAIT);
            assertEquals(Status.COMPLETE, result.status()); assertEquals("café😀", result.content());
            assertEquals(10L, result.inputTokens()); assertEquals(3L, result.cachedInputTokens()); assertEquals(2L, result.outputTokens());
            assertNotNull(result.firstContentMs()); assertTrue(result.firstContentMs() <= result.totalMs());
            assertEquals(2, result.frames()); assertTrue(fixture.requestValid.get());
        }
    }

    @Test void firstContentExcludesHeadersAndEmptyThinkingFrames() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> {
            exchange.sendResponseHeaders(200, 0);
            exchange.getResponseBody().write(bytes("{\"message\":{\"content\":\"\",\"thinking\":\"hidden\"},\"done\":false}\n"));
            exchange.getResponseBody().flush(); awaitRelease(exchange);
            exchange.getResponseBody().write(bytes(delta("Observed") + done("stop", "")));
        }); var client = fixture.client(normal())) {
            var handle = client.start("Synthetic first content");
            awaitSnapshot(handle, value -> value.frames() == 1);
            assertNull(handle.snapshot().firstContentMs()); assertEquals("", handle.snapshot().content());
            fixture.release.countDown(); var result = handle.await(WAIT);
            assertEquals(Status.COMPLETE, result.status()); assertNotNull(result.firstContentMs());
            assertNull(result.inputTokens()); assertNull(result.outputTokens());
        }
    }

    @Test void doneWithoutFinalNewlineAndCrLfAreAcceptedButMissingDoneIsIncomplete() throws Exception {
        for (boolean finalFrame : List.of(true, false)) {
            String response = delta("partial").replace("\n", "\r\n") + (finalFrame ? done("stop", "").stripTrailing() : "");
            try (var fixture = new OwnedFixture(exchange -> send(exchange, response)); var client = fixture.client(normal())) {
                var result = client.start("Synthetic EOF").await(WAIT);
                assertEquals(finalFrame ? Status.COMPLETE : Status.INCOMPLETE, result.status());
                assertEquals("partial", result.content()); assertNull(result.outputTokens());
            }
        }
    }

    @Test void nullableFinalMetadataAndReportedZeroArePreservedWithoutInventingCountsOrReasons() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> send(exchange,
                "{\"message\":{\"content\":\"final\"},\"done\":true,\"prompt_eval_count\":0}\n")); var client = fixture.client(normal())) {
            var result = client.start("Synthetic optional metadata").await(WAIT);
            assertEquals(Status.COMPLETE, result.status()); assertNull(result.finishReason());
            assertEquals(0L, result.inputTokens()); assertNull(result.cachedInputTokens()); assertNull(result.outputTokens());
        }
    }

    @Test void providerNanosecondsAreNullableDistinctFromClientLatencyAndValidatedAtomically() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> send(exchange, delta("sample") + done("stop",
                ",\"prompt_eval_count\":4,\"eval_count\":1,\"total_duration\":1000000,\"load_duration\":0,\"eval_duration\":900000")));
             var client = fixture.client(normal())) {
            var result = client.start("Synthetic timing").await(WAIT);
            assertEquals(Status.COMPLETE, result.status());
            assertEquals(1000000L, result.providerTiming().totalNs()); assertEquals(0L, result.providerTiming().loadNs());
            assertNull(result.providerTiming().promptEvaluationNs()); assertEquals(900000L, result.providerTiming().generationNs());
        }
        for (String invalid : List.of("-1", "1.5", "86400000000001", "\"unknown\"")) {
            try (var fixture = new OwnedFixture(exchange -> send(exchange, delta("sample") + done("stop",
                    ",\"prompt_eval_count\":4,\"eval_count\":1,\"total_duration\":" + invalid)));
                 var client = fixture.client(normal())) {
                var result = client.start("Synthetic invalid timing").await(WAIT);
                assertEquals(Failure.USAGE_METADATA, result.failure()); assertNull(result.inputTokens()); assertNull(result.providerTiming());
            }
        }
    }

    @Test void cancellationAndDeadlineFreezePartialResultsAndReleaseAdmission() throws Exception {
        for (boolean explicit : List.of(true, false)) {
            try (var fixture = new OwnedFixture(exchange -> {
                exchange.sendResponseHeaders(200, 0); exchange.getResponseBody().write(bytes(delta("before")));
                exchange.getResponseBody().flush(); awaitRelease(exchange);
                exchange.getResponseBody().write(bytes(delta("after") + done("stop", "")));
            }); var client = fixture.client(limits(4096, 16384, 20, 3000, 2, 1, explicit ? 3000 : 500))) {
                var handle = client.start("Synthetic stall"); awaitSnapshot(handle, value -> value.content().equals("before"));
                if (explicit) assertTrue(handle.cancel());
                var result = handle.await(WAIT);
                assertSame(result, handle.future().get(1, TimeUnit.SECONDS));
                assertTrue(handle.future().isDone()); assertFalse(handle.future().cancel(true));
                assertEquals(explicit ? Status.CANCELLED : Status.INCOMPLETE, result.status());
                assertEquals(explicit ? Failure.CANCELLED : Failure.DEADLINE, result.failure());
                assertEquals("before", result.content()); assertNull(result.inputTokens());
                fixture.release.countDown();
                assertFalse(handle.cancel()); assertEquals("before", handle.snapshot().content());
                // A second call can be admitted after the first stops, without an unbounded application queue.
                var next = client.start("Synthetic next call").await(WAIT);
                assertNotEquals(Failure.CAPACITY, next.failure());
            }
        }
    }

    @Test void deadlineAlsoCoversWaitingForHeaders() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> { awaitRelease(exchange); send(exchange, delta("late") + done("stop", "")); });
             var client = fixture.client(limits(4096, 16384, 20, 3000, 1, 1, 300))) {
            var result = client.start("Synthetic header stall").await(WAIT);
            assertEquals(Failure.DEADLINE, result.failure()); assertNull(result.firstContentMs());
            assertNull(result.inputTokens()); fixture.release.countDown();
        }
    }

    @Test void rateLimitRedirectAndProviderErrorAreTypedAndNeverRetried() throws Exception {
        for (int code : List.of(429, 302, 500, 200)) {
            try (var fixture = new OwnedFixture(exchange -> {
                if (code != 200) { exchange.getResponseHeaders().set("Location", "http://127.0.0.1:1/api/chat"); exchange.sendResponseHeaders(code, -1); }
                else send(exchange, delta("before error") + "{\"error\":\"synthetic private provider message\"}\n");
            }); var client = fixture.client(normal())) {
                var result = client.start("Synthetic HTTP failure").await(WAIT);
                assertEquals(code == 429 ? Failure.RATE_LIMITED : code == 200 ? Failure.PROVIDER_ERROR : Failure.HTTP_STATUS, result.failure());
                assertEquals(1, fixture.requests.get()); assertEquals(1, client.submittedCalls());
                assertNull(result.outputTokens()); assertFalse(result.content().contains("private provider message"));
            }
        }
    }

    @Test void limitsRejectLargeFramesBodiesContentAndExcessFrames() throws Exception {
        record Boundary(StreamingOllamaClient.Limits limits, String response, Failure failure) {}
        var cases = List.of(
                new Boundary(limits(128, 1024, 20, 1000, 1, 1, 3000), "x".repeat(129), Failure.FRAME_LIMIT),
                new Boundary(limits(128, 128, 20, 1000, 1, 1, 3000), "\n".repeat(129), Failure.BODY_LIMIT),
                new Boundary(limits(4096, 16384, 20, 3, 1, 1, 3000), delta("four"), Failure.CONTENT_LIMIT),
                new Boundary(limits(4096, 16384, 1, 1000, 1, 1, 3000), delta("one") + delta("two"), Failure.FRAME_COUNT_LIMIT));
        for (var boundary : cases) {
            try (var fixture = new OwnedFixture(exchange -> send(exchange, boundary.response())); var client = fixture.client(boundary.limits())) {
                var result = client.start("Synthetic bound").await(WAIT); assertEquals(boundary.failure(), result.failure());
            }
        }
    }

    @Test void malformedJsonInvalidUtf8ToolCallsAndInvalidMetadataFailClosed() throws Exception {
        record Invalid(byte[] response, Failure failure) {}
        var invalid = new ArrayList<>(List.of(new Invalid(bytes("not-json\n"), Failure.MALFORMED_JSON),
                new Invalid(bytes("{} {}\n"), Failure.MALFORMED_JSON),
                new Invalid(bytes("null\n"), Failure.PROTOCOL), new Invalid(bytes("{\"done\":\"true\"}\n"), Failure.PROTOCOL),
                new Invalid(new byte[]{(byte) 0xc3, 0x28, '\n'}, Failure.INVALID_UTF8),
                new Invalid(bytes("{\"done\":true,\"message\":{\"tool_calls\":[{\"function\":\"delete\"}]}}\n"), Failure.PROTOCOL),
                new Invalid(bytes("{\"done\":true,\"message\":{\"role\":\"user\",\"content\":\"wrong role\"}}\n"), Failure.PROTOCOL),
                new Invalid(bytes("{\"done\":true,\"message\":{\"tool_calls\":\"not an array\"}}\n"), Failure.PROTOCOL)));
        for (String metadata : List.of(",\"eval_count\":-1", ",\"eval_count\":1.5", ",\"eval_count\":\"2\"",
                ",\"eval_count\":1000000001", ",\"prompt_eval_count\":2,\"prompt_eval_cached_count\":3,\"eval_count\":1"))
            invalid.add(new Invalid(bytes(delta("text") + done("stop", metadata)), Failure.USAGE_METADATA));
        for (var response : invalid) {
            try (var fixture = new OwnedFixture(exchange -> { exchange.sendResponseHeaders(200, 0); exchange.getResponseBody().write(response.response()); });
                 var client = fixture.client(normal())) {
                var result = client.start("Synthetic invalid frame").await(WAIT);
                assertEquals(response.failure(), result.failure()); assertNull(result.inputTokens()); assertNull(result.outputTokens());
            }
        }
    }

    @Test void refusalExtensionsAndTruncationRemainSeparateFromNaturalLanguageRefusalAndAcceptance() throws Exception {
        for (String reason : List.of("stop", "length", "refusal", "content_filter", "unknown")) {
            try (var fixture = new OwnedFixture(exchange -> send(exchange, delta("I cannot help with this request") + done(reason, ",\"prompt_eval_count\":4,\"eval_count\":7")));
                 var client = fixture.client(normal())) {
                var result = client.start("Synthetic finish reason").await(WAIT);
                assertEquals(reason.equals("stop") ? Status.COMPLETE : Set.of("refusal", "content_filter").contains(reason) ? Status.REFUSED : Status.INCOMPLETE, result.status());
                assertEquals(reason, result.finishReason()); assertEquals(7L, result.outputTokens());
                // COMPLETE means terminated native transport; a separate caller review can still reject the answer.
                assertDoesNotThrow(() -> new StreamingOllamaCosts.Reviewed(result, false));
                if (!result.transportComplete()) assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Reviewed(result, true));
            }
        }
    }

    @Test void overloadCallBudgetAndClientCloseDoNotStartExtraRequests() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> { exchange.sendResponseHeaders(200, 0); exchange.getResponseBody().write(bytes(delta("waiting"))); exchange.getResponseBody().flush(); awaitRelease(exchange); });
             var client = fixture.client(limits(4096, 16384, 20, 3000, 1, 1, 3000))) {
            var first = client.start("Synthetic admitted"); awaitSnapshot(first, value -> value.frames() == 1);
            assertEquals(Failure.CAPACITY, client.start("Synthetic overload").await(WAIT).failure());
            first.cancel(); assertEquals(Failure.CALL_BUDGET, client.start("Synthetic exhausted").await(WAIT).failure());
            client.close(); assertEquals(Failure.CLIENT_CLOSED, client.start("Synthetic closed").await(WAIT).failure());
            assertEquals(1, fixture.requests.get()); assertEquals(1, client.submittedCalls()); fixture.release.countDown();
        }
    }

    @Test void wrongMediaTypeAndInvalidInputsNeverBecomeSuccessfulStreams() throws Exception {
        try (var fixture = new OwnedFixture(exchange -> { exchange.getResponseHeaders().set("Content-Type", "application/json"); send(exchange, delta("text") + done("stop", "")); });
             var client = fixture.client(normal())) {
            assertEquals(Failure.CONTENT_TYPE, client.start("Synthetic wrong media").await(WAIT).failure());
            assertThrows(IllegalArgumentException.class, () -> client.start("x".repeat(1001)));
            assertThrows(IllegalArgumentException.class, () -> client.start("")); assertEquals(1, fixture.requests.get());
        }
        for (String model : List.of("gemma4:cloud", "gpt-oss:120b-cloud", "example:CLOUD"))
            assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaClient(URI.create("http://127.0.0.1:11434/api/chat"), model, normal()));
        for (String endpoint : List.of("https://example.com/api/chat", "http://127.0.0.1/api/chat?token=private", "http://127.0.0.1/api/generate"))
            assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaClient(URI.create(endpoint), "fixture", normal()));
    }

    private static void awaitSnapshot(StreamingOllamaClient.Handle handle, Predicate<StreamingOllamaClient.Snapshot> condition) {
        long deadline = System.nanoTime() + TimeUnit.SECONDS.toNanos(3);
        while (!condition.test(handle.snapshot())) {
            if (System.nanoTime() >= deadline || handle.snapshot().terminal()) fail("Expected actual partial-stream observation was not reached");
            Thread.yield();
        }
    }
    private static final ThreadLocal<CountDownLatch> RELEASE = new ThreadLocal<>();
    private static void awaitRelease(HttpExchange exchange) throws Exception {
        if (!RELEASE.get().await(4, TimeUnit.SECONDS)) throw new IOException("owned_fixture_release_deadline");
    }
    private static void send(HttpExchange exchange, String text) throws IOException {
        exchange.sendResponseHeaders(200, 0); exchange.getResponseBody().write(bytes(text));
    }
    @FunctionalInterface private interface Behavior { void respond(HttpExchange exchange) throws Exception; }
    private static final class OwnedFixture implements AutoCloseable {
        final HttpServer server;
        final ExecutorService worker = Executors.newFixedThreadPool(2);
        final CountDownLatch release = new CountDownLatch(1);
        final AtomicInteger requests = new AtomicInteger(); final AtomicBoolean requestValid = new AtomicBoolean(true);
        OwnedFixture(Behavior behavior) throws IOException {
            server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 2); server.setExecutor(worker);
            server.createContext("/api/chat", exchange -> {
                requests.incrementAndGet(); RELEASE.set(release);
                try {
                    byte[] body = exchange.getRequestBody().readNBytes(49153);
                    var row = new tools.jackson.databind.ObjectMapper().readTree(body);
                    requestValid.set(body.length <= 49152 && row.path("stream").asBoolean() && row.path("messages").isArray());
                    exchange.getResponseHeaders().set("Content-Type", "application/x-ndjson"); behavior.respond(exchange);
                } catch (Exception expectedDisconnectOrFixtureFailure) { /* Tests inspect the resulting typed outcome. */ }
                finally { exchange.close(); RELEASE.remove(); }
            }); server.start();
        }
        StreamingOllamaClient client(StreamingOllamaClient.Limits limits) { return new StreamingOllamaClient(URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat"), "teaching-stream-fixture", limits); }
        @Override public void close() throws Exception {
            release.countDown(); server.stop(0); worker.shutdownNow();
            assertTrue(worker.awaitTermination(5, TimeUnit.SECONDS), "owned fixture worker cleanup");
        }
    }
}
