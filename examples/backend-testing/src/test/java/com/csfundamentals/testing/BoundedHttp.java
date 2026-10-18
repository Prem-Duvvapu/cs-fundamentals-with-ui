package com.csfundamentals.testing;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;
import java.util.concurrent.*;
import tools.jackson.databind.*;

/** Owned loopback teaching client; each request has a body cap and full-response deadline. */
final class BoundedHttp {
    record Response(int status, HttpHeaders headers, byte[] body) {
        JsonNode json() { return new ObjectMapper().readTree(body); }
    }
    private final HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(2))
            .followRedirects(HttpClient.Redirect.NEVER).build();
    Response request(URI uri, String method, String payload) throws Exception {
        if (!"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()) || uri.getUserInfo() != null || uri.getFragment() != null)
            throw new IllegalArgumentException("owned_loopback_only");
        var builder = HttpRequest.newBuilder(uri).timeout(Duration.ofSeconds(3)).header("Accept", "application/json");
        if (payload == null) builder.method(method, HttpRequest.BodyPublishers.noBody());
        else {
            byte[] bytes = payload.getBytes(StandardCharsets.UTF_8);
            if (bytes.length > 2048) throw new IllegalArgumentException("request_body_limit");
            builder.header("Content-Type", "application/json").method(method, HttpRequest.BodyPublishers.ofByteArray(bytes));
        }
        var future = client.sendAsync(builder.build(), ignored -> new CappedBody());
        try {
            var response = future.get(4, TimeUnit.SECONDS);
            return new Response(response.statusCode(), response.headers(), response.body());
        } finally { if (!future.isDone()) future.cancel(true); }
    }
    static long createdTask(Response response) {
        var row = response.json();
        if (response.status() != 201 || !response.headers().firstValue("Content-Type").orElse("").startsWith("application/json")
                || !row.isObject() || !row.path("id").isIntegralNumber() || row.path("id").asLong() <= 0
                || !row.path("title").isString() || !row.path("completed").isBoolean() || row.path("completed").asBoolean()
                || !response.headers().firstValue("Location").orElse("").equals("/api/tasks/" + row.path("id").asLong()))
            throw new IllegalStateException("create_contract_rejected");
        return row.path("id").asLong();
    }
    private static final class CappedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final ByteArrayOutputStream output = new ByteArrayOutputStream();
        private final CompletableFuture<byte[]> body = new CompletableFuture<>();
        private Flow.Subscription subscription;
        public CompletionStage<byte[]> getBody() { return body; }
        public void onSubscribe(Flow.Subscription next) { subscription = next; next.request(1); }
        public void onNext(List<ByteBuffer> buffers) {
            long size = output.size(); for (var buffer : buffers) size += buffer.remaining();
            if (size > 32768) { subscription.cancel(); body.completeExceptionally(new IllegalStateException("response_body_limit")); return; }
            for (var buffer : buffers) while (buffer.hasRemaining()) output.write(buffer.get());
            subscription.request(1);
        }
        public void onError(Throwable error) { body.completeExceptionally(error); }
        public void onComplete() { body.complete(output.toByteArray()); }
    }
}
