package com.csfundamentals.aiexample;

import com.sun.net.httpserver.HttpServer;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class EmbeddingTests {
    private static final String REVISION = "a".repeat(64);
    private static EmbeddingSpace space() { return new EmbeddingSpace("fixture_v1", "fixture:latest", REVISION, 3, EmbeddingSpace.CHUNK_POLICY); }
    private HttpServer server;
    private ExecutorService workers;
    private final AtomicReference<String> embedResponse = new AtomicReference<>("{\"model\":\"fixture:latest\",\"embeddings\":[[1,0,0]]}");
    private final AtomicReference<String> digest = new AtomicReference<>(REVISION);
    private final AtomicInteger requests = new AtomicInteger();
    private final AtomicInteger status = new AtomicInteger(200);
    private final AtomicBoolean changeDigestDuringEmbed = new AtomicBoolean();
    private final AtomicInteger delayMs = new AtomicInteger();
    private final AtomicReference<String> requestBody = new AtomicReference<>();
    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        workers = Executors.newCachedThreadPool(); server.setExecutor(workers);
        server.createContext("/api/tags", exchange -> {
            String body = "{\"models\":[{\"name\":\"fixture:latest\",\"digest\":\"" + digest.get() + "\"}]}";
            byte[] bytes = body.getBytes(StandardCharsets.UTF_8); exchange.sendResponseHeaders(200, bytes.length);
            exchange.getResponseBody().write(bytes); exchange.close();
        });
        server.createContext("/api/embed", exchange -> {
            requests.incrementAndGet(); requestBody.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
            try { Thread.sleep(delayMs.get()); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            if (changeDigestDuringEmbed.get()) digest.set("b".repeat(64));
            byte[] bytes = embedResponse.get().getBytes(StandardCharsets.UTF_8);
            try { exchange.sendResponseHeaders(status.get(), bytes.length); exchange.getResponseBody().write(bytes); }
            catch (java.io.IOException cancelled) { /* Expected when the bounded client cancels. */ }
            finally { exchange.close(); }
        });
        server.start();
    }
    @AfterEach void stop() { server.stop(0); workers.shutdownNow(); }
    private OllamaEmbeddingProvider provider(Duration duration, int calls) {
        return new OllamaEmbeddingProvider(URI.create("http://127.0.0.1:" + server.getAddress().getPort()), space(), duration, calls);
    }
    @Test void actualHttpBoundaryChecksRevisionBatchShapeAndTruncationPolicy() {
        var vectors = provider(Duration.ofSeconds(2), 5).embed(List.of("Refund policy"));
        assertArrayEquals(new float[]{1, 0, 0}, vectors.get(0));
        assertTrue(requestBody.get().contains("\"truncate\":false"));
        assertTrue(requestBody.get().contains("Refund policy"));
        assertEquals(1, requests.get());
    }
    @Test void mismatchedModelRevisionStopsBeforeSendingSourceText() {
        digest.set("b".repeat(64));
        assertEquals("embedding_model_revision_changed", assertThrows(EmbeddingProvider.Failure.class,
                () -> provider(Duration.ofSeconds(2), 5).embed(List.of("Private source"))).getMessage());
        assertEquals(0, requests.get());
    }
    @Test void mutableTagChangingDuringEmbedIsRejectedBeforeReturningVectors() {
        changeDigestDuringEmbed.set(true);
        assertEquals("embedding_model_revision_changed", assertThrows(EmbeddingProvider.Failure.class,
                () -> provider(Duration.ofSeconds(2), 1).embed(List.of("policy"))).getMessage());
        assertEquals(1, requests.get());
    }
    @Test void invalidDimensionsTypesZeroVectorsAndWrongBatchAreRejected() {
        for (String body : List.of("", "null", "[]", "{\"model\":123,\"embeddings\":[[1,0,0]]}",
                "{\"model\":\"fixture:latest\",\"embeddings\":[[1,0]]}",
                "{\"model\":\"fixture:latest\",\"embeddings\":[[\"1\",0,0]]}",
                "{\"model\":\"fixture:latest\",\"embeddings\":[[0,0,0]]}",
                "{\"model\":\"fixture:latest\",\"embeddings\":[[1e100,0,0]]}",
                "{\"model\":\"other\",\"embeddings\":[[1,0,0]]}",
                "{\"model\":\"fixture:latest\",\"embeddings\":[]}")) {
            embedResponse.set(body);
            assertThrows(EmbeddingProvider.Failure.class, () -> provider(Duration.ofSeconds(2), 1).embed(List.of("policy")), body);
        }
    }
    @Test void httpFailureHasNoAutomaticRetryAndCallBudgetIsEnforced() {
        status.set(429); var provider = provider(Duration.ofSeconds(2), 1);
        assertEquals("embedding_http_429", assertThrows(EmbeddingProvider.Failure.class, () -> provider.embed(List.of("policy"))).getMessage());
        assertEquals("embedding_call_budget_exhausted", assertThrows(EmbeddingProvider.Failure.class, () -> provider.embed(List.of("policy"))).getMessage());
        assertEquals(1, requests.get());
    }
    @Test void boundedTotalDeadlineAndBodyLimitRejectStallsAndOversize() {
        delayMs.set(800);
        assertThrows(EmbeddingProvider.Failure.class, () -> provider(Duration.ofMillis(200), 1).embed(List.of("policy")));
        delayMs.set(0); embedResponse.set("x".repeat(512 * 1024 + 1));
        assertThrows(EmbeddingProvider.Failure.class, () -> provider(Duration.ofSeconds(2), 1).embed(List.of("policy")));
    }
    @Test void explicitEndpointAndPositiveLimitsCannotBeChosenByLearnerInput() {
        for (String url : List.of("https://example.com", "http://127.0.0.1/path", "http://127.0.0.1?token=x", "http://a:b@127.0.0.1")) {
            assertThrows(IllegalArgumentException.class, () -> new OllamaEmbeddingProvider(URI.create(url), space(), Duration.ofSeconds(1), 1));
        }
        assertThrows(IllegalArgumentException.class, () -> provider(Duration.ZERO, 1));
        assertThrows(IllegalArgumentException.class, () -> provider(Duration.ofSeconds(1), 0));
        assertThrows(IllegalArgumentException.class, () -> provider(Duration.ofSeconds(1), 1).embed(Collections.nCopies(17, "source")));
        assertEquals(0, requests.get());
    }
    @Test void embeddingSpacesAndFiniteNonzeroDimensionsAreExplicit() {
        assertThrows(IllegalArgumentException.class, () -> new EmbeddingSpace("unsafe;drop", "fixture", REVISION, 3, EmbeddingSpace.CHUNK_POLICY));
        assertThrows(IllegalArgumentException.class, () -> new EmbeddingSpace("safe", "fixture", "latest", 3, EmbeddingSpace.CHUNK_POLICY));
        assertThrows(IllegalArgumentException.class, () -> new EmbeddingSpace("safe", "fixture", REVISION, 2001, EmbeddingSpace.CHUNK_POLICY));
        assertThrows(IllegalArgumentException.class, () -> space().validate(new float[]{1, 0}));
        assertThrows(IllegalArgumentException.class, () -> space().validate(new float[]{1, Float.NaN, 0}));
        assertThrows(IllegalArgumentException.class, () -> space().validate(new float[]{1, Float.POSITIVE_INFINITY, 0}));
        assertThrows(IllegalArgumentException.class, () -> space().validate(new float[]{0, 0, 0}));
        float[] input = {1, 0, 0}; var checked = space().validate(input); input[0] = 99;
        assertEquals(1, checked[0]);
    }
    @Test void boundedVersionedChunkingPreservesSurrogatePairsAndOverlap() {
        String body = "x".repeat(999) + "\uD83D\uDE00" + "y".repeat(1100);
        var document = new KnowledgeStore.Document("policy", "tenant-a", 7, "Policy", body, true);
        var chunks = KnowledgeChunks.split(List.of(document));
        assertEquals(3, chunks.size());
        assertEquals("policy:v7:c0", chunks.get(0).citation());
        for (var chunk : chunks) {
            assertTrue(chunk.text().length() <= 1000);
            assertFalse(Character.isLowSurrogate(chunk.text().charAt(0)));
            assertFalse(Character.isHighSurrogate(chunk.text().charAt(chunk.text().length() - 1)));
            assertTrue(body.contains(chunk.text()));
        }
        assertThrows(IllegalArgumentException.class, () -> KnowledgeChunks.split(Collections.nCopies(33, document)));
        var longDocument = new KnowledgeStore.Document("long", "tenant-a", 1, "Long", "x".repeat(8192), true);
        assertThrows(IllegalArgumentException.class, () -> KnowledgeChunks.split(Collections.nCopies(15, longDocument)));
    }
}
