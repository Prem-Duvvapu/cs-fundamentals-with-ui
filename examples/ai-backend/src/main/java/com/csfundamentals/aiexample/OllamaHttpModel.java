package com.csfundamentals.aiexample;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.*;
import org.springframework.ai.chat.prompt.Prompt;
import tools.jackson.databind.ObjectMapper;

/** One explicit Ollama HTTP boundary; the default server is a labelled teaching fixture. */
public final class OllamaHttpModel implements ChatModel {
    private static final int MAX_RESPONSE = 32768;
    private final HttpClient http;
    private final URI endpoint;
    private final String model;
    private final Duration deadline;
    private final int maxCalls;
    private final AtomicInteger calls = new AtomicInteger();
    private final ObjectMapper json = new ObjectMapper();

    public OllamaHttpModel(URI endpoint, String model, Duration deadline, int maxCalls) {
        if (!Set.of("http", "https").contains(endpoint.getScheme()) || endpoint.getHost() == null
                || endpoint.getUserInfo() != null || endpoint.getFragment() != null || endpoint.getQuery() != null)
            throw new IllegalArgumentException("Configure an explicit HTTP model endpoint without credentials/query/fragment");
        if (maxCalls < 1 || deadline.isNegative() || deadline.isZero()) throw new IllegalArgumentException("Positive limits required");
        this.endpoint = endpoint; this.model = model; this.deadline = deadline; this.maxCalls = maxCalls;
        this.http = HttpClient.newBuilder().connectTimeout(deadline).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    @Override public ChatResponse call(Prompt prompt) {
        if (prompt.getContents().length() > 12000) throw new ModelFailure("input_limit");
        if (calls.incrementAndGet() > maxCalls) throw new ModelFailure("call_budget_exhausted");
        var messages = prompt.getInstructions().stream().map(m -> Map.of(
                "role", m.getMessageType().getValue(), "content", m.getText())).toList();
        String body = json.writeValueAsString(Map.of("model", model, "stream", false, "format", "json",
                "messages", messages, "keep_alive", "1m", "options", Map.of("num_predict", 256, "num_ctx", 4096, "temperature", 0)));
        var request = HttpRequest.newBuilder(endpoint).timeout(deadline).header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(body)).build();
        var future = http.sendAsync(request, info -> new LimitedBody());
        try {
            var response = future.get(deadline.toMillis(), TimeUnit.MILLISECONDS);
            if (response.statusCode() != 200) throw new ModelFailure("provider_http_" + response.statusCode());
            var root = json.readTree(response.body());
            if (!root.path("done").asBoolean(false) || "length".equals(root.path("done_reason").asString()))
                throw new ModelFailure("incomplete_output");
            var content = root.path("message").path("content");
            if (!content.isString() || content.asString().isBlank()) throw new ModelFailure("empty_output");
            return new ChatResponse(List.of(new Generation(new AssistantMessage(content.asString()))));
        } catch (TimeoutException e) {
            future.cancel(true); throw new ModelFailure("provider_deadline");
        } catch (InterruptedException e) {
            future.cancel(true); Thread.currentThread().interrupt(); throw new ModelFailure("cancelled");
        } catch (ExecutionException e) {
            future.cancel(true); throw new ModelFailure("provider_transport_" + e.getCause().getClass().getSimpleName());
        } catch (ModelFailure e) { throw e; }
        catch (RuntimeException e) { throw new ModelFailure("provider_invalid_envelope"); }
    }

    public static final class ModelFailure extends RuntimeException {
        public ModelFailure(String code) { super(code); }
    }

    private static final class LimitedBody implements HttpResponse.BodySubscriber<byte[]> {
        private final CompletableFuture<byte[]> result = new CompletableFuture<>();
        private final ByteArrayOutputStream bytes = new ByteArrayOutputStream();
        private Flow.Subscription subscription;
        @Override public CompletionStage<byte[]> getBody() { return result; }
        @Override public void onSubscribe(Flow.Subscription subscription) { this.subscription = subscription; subscription.request(1); }
        @Override public void onNext(List<ByteBuffer> buffers) {
            for (var buffer : buffers) {
                if (bytes.size() + buffer.remaining() > MAX_RESPONSE) {
                    subscription.cancel(); result.completeExceptionally(new IllegalArgumentException("response_limit")); return;
                }
                byte[] part = new byte[buffer.remaining()]; buffer.get(part); bytes.writeBytes(part);
            }
            subscription.request(1);
        }
        @Override public void onError(Throwable error) { result.completeExceptionally(error); }
        @Override public void onComplete() { result.complete(bytes.toByteArray()); }
    }
}
