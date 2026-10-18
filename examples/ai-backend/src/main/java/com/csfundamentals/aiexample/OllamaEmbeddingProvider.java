package com.csfundamentals.aiexample;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

/** Explicit local-only adapter. It never downloads, retries, or switches models. */
public final class OllamaEmbeddingProvider implements EmbeddingProvider {
    private final EmbeddingSpace space;
    private final URI base;
    private final Duration deadline;
    private final int maxCalls;
    private final AtomicInteger calls = new AtomicInteger();
    private final HttpClient http;
    private final ObjectMapper json = new ObjectMapper();
    public OllamaEmbeddingProvider(URI base, EmbeddingSpace space, Duration deadline, int maxCalls) {
        if (!"http".equals(base.getScheme()) || !Set.of("localhost", "127.0.0.1", "[::1]").contains(base.getHost())
                || !(base.getPath().isEmpty() || base.getPath().equals("/")) || base.getQuery() != null
                || base.getFragment() != null || base.getUserInfo() != null)
            throw new IllegalArgumentException("embedding_endpoint_must_be_explicit_local_origin");
        if (deadline.toMillis() < 1 || deadline.toMillis() > 10000 || maxCalls < 1 || maxCalls > 10000)
            throw new IllegalArgumentException("invalid_embedding_limits");
        this.base = base; this.space = space; this.deadline = deadline; this.maxCalls = maxCalls;
        this.http = HttpClient.newBuilder().connectTimeout(deadline).followRedirects(HttpClient.Redirect.NEVER).build();
    }
    @Override public EmbeddingSpace space() { return space; }
    @Override public List<float[]> embed(List<String> inputs) {
        if (inputs == null || inputs.isEmpty() || inputs.size() > 16
                || inputs.stream().anyMatch(value -> value == null || value.isBlank() || value.length() > 1000))
            throw new IllegalArgumentException("invalid_embedding_batch");
        if (calls.incrementAndGet() > maxCalls) throw new Failure("embedding_call_budget_exhausted");
        long expires = System.nanoTime() + deadline.toNanos();
        verifyModel(request("api/tags", null, expires));
        var root = request("api/embed", json.writeValueAsString(Map.of("model", space.model(), "input", inputs,
                "truncate", false, "keep_alive", 0)), expires);
        if (!root.path("model").isString() || !space.model().equals(root.path("model").asString()) || !root.path("embeddings").isArray()
                || root.path("embeddings").size() != inputs.size()) throw new Failure("embedding_invalid_envelope");
        var vectors = new ArrayList<float[]>();
        try {
            for (var item : root.path("embeddings")) {
                if (!item.isArray() || item.size() != space.dimensions()) throw new IllegalArgumentException();
                float[] vector = new float[space.dimensions()];
                for (int i = 0; i < vector.length; i++) {
                    if (!item.path(i).isNumber()) throw new IllegalArgumentException();
                    vector[i] = item.path(i).asFloat();
                }
                vectors.add(space.validate(vector));
            }
        } catch (RuntimeException failure) { throw new Failure("embedding_invalid_vector"); }
        verifyModel(request("api/tags", null, expires));
        return List.copyOf(vectors);
    }
    private void verifyModel(JsonNode response) {
        if (!response.path("models").isArray()) throw new Failure("embedding_model_inventory_invalid");
        for (var model : response.path("models")) {
            if ((model.path("name").isString() && space.model().equals(model.path("name").asString()))
                    || (model.path("model").isString() && space.model().equals(model.path("model").asString()))) {
                if (!model.path("digest").isString() || !space.revision().equals(model.path("digest").asString())) throw new Failure("embedding_model_revision_changed");
                return;
            }
        }
        throw new Failure("embedding_model_not_installed");
    }
    private JsonNode request(String path, String body, long expires) {
        long remaining = expires - System.nanoTime();
        if (remaining <= 0) throw new Failure("embedding_deadline");
        var builder = HttpRequest.newBuilder(base.resolve(path)).timeout(Duration.ofNanos(remaining));
        if (body == null) builder.GET();
        else builder.header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(body));
        var future = http.sendAsync(builder.build(), info -> new LimitedBody());
        try {
            var response = future.get(remaining, TimeUnit.NANOSECONDS);
            if (response.statusCode() != 200) throw new Failure("embedding_http_" + response.statusCode());
            var parsed = json.readTree(response.body());
            if (parsed == null || !parsed.isObject()) throw new Failure("embedding_invalid_envelope");
            return parsed;
        } catch (TimeoutException failure) { future.cancel(true); throw new Failure("embedding_deadline"); }
        catch (InterruptedException failure) { future.cancel(true); Thread.currentThread().interrupt(); throw new Failure("embedding_cancelled"); }
        catch (ExecutionException failure) { future.cancel(true); throw new Failure("embedding_transport_or_body_limit"); }
        catch (Failure failure) { throw failure; }
        catch (RuntimeException failure) { throw new Failure("embedding_invalid_json"); }
    }
    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        @Override public CompletionStage<byte[]> getBody() { return result; }
        @Override public void onSubscribe(Flow.Subscription subscription) { this.subscription = subscription; subscription.request(1); }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for (var buffer : buffers) {
                if (bytes.size() + buffer.remaining() > 512 * 1024) {
                    subscription.cancel(); result.completeExceptionally(new IllegalArgumentException("embedding_body_limit")); return;
                }
                byte[] part = new byte[buffer.remaining()]; buffer.get(part); bytes.writeBytes(part);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable error) { result.completeExceptionally(error); }
        @Override public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
