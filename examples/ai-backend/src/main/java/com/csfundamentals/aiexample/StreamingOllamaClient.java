package com.csfundamentals.aiexample;

import java.io.ByteArrayOutputStream;
import java.net.URI;
import java.net.http.*;
import java.nio.ByteBuffer;
import java.nio.charset.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import tools.jackson.databind.*;
import static com.csfundamentals.aiexample.StreamingOllamaResult.*;

/** One bounded native Ollama NDJSON call. It never follows redirects, retries or executes tools. */
public final class StreamingOllamaClient implements AutoCloseable {
    public record Limits(int frameBytes, int bodyBytes, int frames, int contentChars, int inputChars,
                         int calls, int concurrentCalls, Duration deadline) {
        public Limits {
            if (frameBytes < 128 || frameBytes > 32768 || bodyBytes < frameBytes || bodyBytes > 262144
                    || frames < 1 || frames > 512 || contentChars < 1 || contentChars > 16384
                    || inputChars < 1 || inputChars > 12000 || calls < 1 || calls > 100
                    || concurrentCalls < 1 || concurrentCalls > 4 || deadline == null
                    || deadline.compareTo(Duration.ofMillis(100)) < 0 || deadline.compareTo(Duration.ofSeconds(30)) > 0)
                throw new IllegalArgumentException("invalid_streaming_limits");
        }
        public static Limits defaults() { return new Limits(16384, 65536, 256, 8192, 12000, 4, 2, Duration.ofSeconds(6)); }
    }
    public record Snapshot(String content, int frames, int bodyBytes, Long firstContentMs, boolean terminal) {}
    private final URI endpoint;
    private final String model;
    private final Limits limits;
    private final HttpClient http;
    private final ObjectMapper json = tools.jackson.databind.json.JsonMapper.builder().enable(DeserializationFeature.FAIL_ON_TRAILING_TOKENS).build();
    private final Semaphore admission;
    private final AtomicInteger calls = new AtomicInteger();
    private final AtomicBoolean closed = new AtomicBoolean();
    private final Set<Handle> active = ConcurrentHashMap.newKeySet();
    private final ScheduledThreadPoolExecutor deadlines = new ScheduledThreadPoolExecutor(1, task -> {
        var thread = new Thread(task, "owned-ollama-stream-deadline"); thread.setDaemon(true); return thread;
    });

    public StreamingOllamaClient(URI endpoint, String model, Limits limits) {
        if (endpoint == null || !"http".equals(endpoint.getScheme()) || !Set.of("127.0.0.1", "localhost", "[::1]").contains(endpoint.getHost())
                || !"/api/chat".equals(endpoint.getPath()) || endpoint.getUserInfo() != null || endpoint.getQuery() != null || endpoint.getFragment() != null
                || model == null || !model.matches("[a-zA-Z0-9][a-zA-Z0-9._:/-]{0,119}") || model.toLowerCase(Locale.ROOT).matches(".*(?:[:/-])cloud$|.*-cloud$"))
            throw new IllegalArgumentException("explicit_loopback_native_chat_endpoint_and_model_required");
        this.endpoint = endpoint; this.model = model; this.limits = Objects.requireNonNull(limits);
        admission = new Semaphore(limits.concurrentCalls()); deadlines.setRemoveOnCancelPolicy(true);
        http = HttpClient.newBuilder().connectTimeout(limits.deadline()).followRedirects(HttpClient.Redirect.NEVER)
                .version(HttpClient.Version.HTTP_1_1).build();
    }
    public int submittedCalls() { return calls.get(); }
    public Handle start(String prompt) {
        if (prompt == null || prompt.isBlank() || prompt.length() > limits.inputChars()) throw new IllegalArgumentException("streaming_input_limit");
        byte[] body = json.writeValueAsBytes(Map.of("model", model, "stream", true,
                "messages", List.of(Map.of("role", "user", "content", prompt)), "keep_alive", "1m",
                "options", Map.of("num_predict", 256, "num_ctx", 4096, "temperature", 0)));
        if (body.length > 49152) throw new IllegalArgumentException("streaming_request_byte_limit");
        var handle = new Handle();
        if (closed.get()) { handle.finish(Status.FAILED, Failure.CLIENT_CLOSED); return handle; }
        if (!admission.tryAcquire()) { handle.finish(Status.FAILED, Failure.CAPACITY); return handle; }
        handle.admitted.set(true); active.add(handle);
        if (closed.get()) { handle.finish(Status.FAILED, Failure.CLIENT_CLOSED); return handle; }
        int previous;
        do {
            previous = calls.get();
            if (previous >= limits.calls()) { handle.finish(Status.FAILED, Failure.CALL_BUDGET); return handle; }
        } while (!calls.compareAndSet(previous, previous + 1));
        try {
            handle.deadline = deadlines.schedule(() -> handle.finish(Status.INCOMPLETE, Failure.DEADLINE), limits.deadline().toNanos(), TimeUnit.NANOSECONDS);
            var request = HttpRequest.newBuilder(endpoint).timeout(limits.deadline()).header("Content-Type", "application/json")
                    .header("Accept", "application/x-ndjson").POST(HttpRequest.BodyPublishers.ofByteArray(body)).build();
            synchronized (handle.lock) { if (handle.terminal != null) return handle; handle.requestStarted = true; }
            var transport = http.sendAsync(request, info -> new Subscriber(handle, info));
            handle.transport = transport;
            if (handle.terminal != null) transport.cancel(true);
            transport.whenComplete((response, error) -> {
                if (error == null) return;
                Throwable cause = error;
                for (int depth = 0; depth < 8 && cause.getCause() != null && cause != cause.getCause(); depth++) cause = cause.getCause();
                handle.finish(cause instanceof HttpTimeoutException ? Status.INCOMPLETE : Status.FAILED,
                        cause instanceof HttpTimeoutException ? Failure.DEADLINE : Failure.TRANSPORT);
            });
        } catch (RejectedExecutionException error) { handle.finish(Status.FAILED, Failure.CLIENT_CLOSED); }
        catch (RuntimeException error) { handle.finish(Status.FAILED, Failure.TRANSPORT); }
        return handle;
    }

    public final class Handle {
        private final Object lock = new Object();
        private final long started = System.nanoTime();
        private final CompletableFuture<StreamingOllamaResult> completion = new CompletableFuture<>();
        private final Future<StreamingOllamaResult> resultView = new Future<>() {
            @Override public boolean cancel(boolean mayInterruptIfRunning) { return false; }
            @Override public boolean isCancelled() { return false; }
            @Override public boolean isDone() { return completion.isDone(); }
            @Override public StreamingOllamaResult get() throws InterruptedException, ExecutionException { return completion.get(); }
            @Override public StreamingOllamaResult get(long timeout, TimeUnit unit) throws InterruptedException, ExecutionException, TimeoutException { return completion.get(timeout, unit); }
        };
        private final AtomicBoolean admitted = new AtomicBoolean();
        private final StringBuilder content = new StringBuilder();
        private volatile StreamingOllamaResult terminal;
        private volatile CompletableFuture<?> transport;
        private volatile Flow.Subscription subscription;
        private volatile ScheduledFuture<?> deadline;
        private int frames, bodyBytes;
        private Integer httpStatus;
        private Long firstContentMs, inputTokens, cachedInputTokens, outputTokens;
        private String finishReason;
        private ProviderTiming providerTiming;
        private boolean requestStarted;
        private Handle() {}
        /** Read-only result view: use Handle.cancel() to receive a typed CANCELLED result. No callbacks run on I/O/deadline threads. */
        public Future<StreamingOllamaResult> future() { return resultView; }
        public StreamingOllamaResult await(Duration timeout) throws InterruptedException, ExecutionException, TimeoutException {
            if (timeout == null || timeout.isNegative() || timeout.isZero() || timeout.compareTo(Duration.ofSeconds(35)) > 0)
                throw new IllegalArgumentException("bounded_positive_await_required");
            return completion.get(timeout.toNanos(), TimeUnit.NANOSECONDS);
        }
        public Snapshot snapshot() {
            synchronized (lock) { return new Snapshot(content.toString(), frames, bodyBytes, firstContentMs, terminal != null); }
        }
        public boolean cancel() { return finish(Status.CANCELLED, Failure.CANCELLED); }
        private boolean finish(Status status, Failure failure) {
            StreamingOllamaResult result;
            synchronized (lock) {
                if (terminal != null) return false;
                result = new StreamingOllamaResult(status, failure, content.toString(), finishReason,
                        inputTokens, cachedInputTokens, outputTokens, providerTiming, firstContentMs,
                        (System.nanoTime() - started) / 1_000_000, frames, bodyBytes, httpStatus, requestStarted);
                terminal = result;
            }
            var scheduled = deadline; if (scheduled != null) scheduled.cancel(false);
            var body = subscription; if (body != null) body.cancel();
            var request = transport; if (request != null) request.cancel(true);
            active.remove(this); if (admitted.compareAndSet(true, false)) admission.release();
            completion.complete(result); return true;
        }
    }
    private record End(Status status, Failure failure) {}
    private final class Subscriber implements HttpResponse.BodySubscriber<Void> {
        private final Handle handle;
        private final HttpResponse.ResponseInfo info;
        private final ByteArrayOutputStream line = new ByteArrayOutputStream();
        private final CompletableFuture<Void> body = new CompletableFuture<>();
        Subscriber(Handle handle, HttpResponse.ResponseInfo info) {
            this.handle = handle; this.info = info;
            synchronized (handle.lock) { handle.httpStatus = info.statusCode(); }
        }
        @Override public CompletionStage<Void> getBody() { return body; }
        @Override public void onSubscribe(Flow.Subscription subscription) {
            handle.subscription = subscription;
            if (handle.terminal != null) { subscription.cancel(); body.complete(null); return; }
            if (info.statusCode() != 200) {
                end(new End(Status.FAILED, info.statusCode() == 429 ? Failure.RATE_LIMITED : Failure.HTTP_STATUS)); return;
            }
            String contentType = info.headers().firstValue("Content-Type").orElse("").split(";", 2)[0].trim();
            if (!contentType.equalsIgnoreCase("application/x-ndjson")) { end(new End(Status.FAILED, Failure.CONTENT_TYPE)); return; }
            subscription.request(1);
        }
        @Override public void onNext(List<ByteBuffer> buffers) {
            End outcome = null;
            synchronized (handle.lock) {
                if (handle.terminal != null) return;
                long bytes = buffers.stream().mapToLong(ByteBuffer::remaining).sum() + handle.bodyBytes;
                handle.bodyBytes = (int) Math.min(Integer.MAX_VALUE, bytes);
                if (bytes > limits.bodyBytes()) outcome = new End(Status.FAILED, Failure.BODY_LIMIT);
                else {
                    outer: for (var buffer : buffers) while (buffer.hasRemaining()) {
                        int value = buffer.get() & 255;
                        if (value == '\n') { outcome = frame(); if (outcome != null) break outer; }
                        else {
                            if (line.size() >= limits.frameBytes()) { outcome = new End(Status.FAILED, Failure.FRAME_LIMIT); break outer; }
                            line.write(value);
                        }
                    }
                }
            }
            if (outcome != null) end(outcome);
            else if (handle.terminal == null) handle.subscription.request(1);
        }
        private End frame() {
            byte[] bytes = line.toByteArray(); line.reset();
            int length = bytes.length; if (length > 0 && bytes[length - 1] == '\r') length--;
            if (length == 0) return null;
            if (++handle.frames > limits.frames()) return new End(Status.FAILED, Failure.FRAME_COUNT_LIMIT);
            String text;
            try { text = StandardCharsets.UTF_8.newDecoder().onMalformedInput(CodingErrorAction.REPORT)
                    .onUnmappableCharacter(CodingErrorAction.REPORT).decode(ByteBuffer.wrap(bytes, 0, length)).toString(); }
            catch (CharacterCodingException error) { return new End(Status.FAILED, Failure.INVALID_UTF8); }
            JsonNode row;
            try { row = json.readTree(text); }
            catch (RuntimeException error) { return new End(Status.FAILED, Failure.MALFORMED_JSON); }
            if (row == null || !row.isObject()) return new End(Status.FAILED, Failure.PROTOCOL);
            if (row.has("error")) return new End(Status.FAILED, Failure.PROVIDER_ERROR);
            if (!row.path("done").isBoolean()) return new End(Status.FAILED, Failure.PROTOCOL);
            var message = row.path("message");
            if (!message.isObject() || (message.has("role") && (!message.path("role").isString() || !message.path("role").asString().equals("assistant"))))
                return new End(Status.FAILED, Failure.PROTOCOL);
            if (message.has("tool_calls") && !message.path("tool_calls").isNull()
                    && (!message.path("tool_calls").isArray() || message.path("tool_calls").size() != 0))
                return new End(Status.FAILED, Failure.PROTOCOL);
            var delta = message.path("content");
            if (!delta.isMissingNode() && !delta.isNull()) {
                if (!delta.isString()) return new End(Status.FAILED, Failure.PROTOCOL);
                String part = delta.asString();
                if ((long) handle.content.length() + part.length() > limits.contentChars()) return new End(Status.FAILED, Failure.CONTENT_LIMIT);
                if (!part.isEmpty() && handle.firstContentMs == null) handle.firstContentMs = (System.nanoTime() - handle.started) / 1_000_000;
                handle.content.append(part);
            }
            if (!row.path("done").asBoolean()) return null;
            try {
                Long input = count(row, "prompt_eval_count"), cached = count(row, "prompt_eval_cached_count"), output = count(row, "eval_count");
                if (input != null && cached != null && cached > input)
                    return new End(Status.FAILED, Failure.USAGE_METADATA);
                var timing = new ProviderTiming(duration(row, "total_duration"), duration(row, "load_duration"),
                        duration(row, "prompt_eval_duration"), duration(row, "eval_duration"));
                handle.inputTokens = input; handle.cachedInputTokens = cached; handle.outputTokens = output;
                handle.providerTiming = timing;
            } catch (IllegalArgumentException error) { return new End(Status.FAILED, Failure.USAGE_METADATA); }
            var reason = row.path("done_reason");
            if (!reason.isMissingNode() && !reason.isNull()) {
                if (!reason.isString() || reason.asString().length() > 80) return new End(Status.FAILED, Failure.PROTOCOL);
                handle.finishReason = reason.asString();
            }
            // Native Ollama has no standardized refusal marker. These explicit markers are extensions.
            if (Set.of("refusal", "content_filter").contains(handle.finishReason == null ? "" : handle.finishReason))
                return new End(Status.REFUSED, Failure.NONE);
            if (handle.finishReason != null && !handle.finishReason.equals("stop")) return new End(Status.INCOMPLETE, Failure.NONE);
            return new End(handle.content.toString().isBlank() ? Status.INCOMPLETE : Status.COMPLETE, Failure.NONE);
        }
        private Long duration(JsonNode row, String key) {
            var value = row.path(key);
            if (value.isMissingNode() || value.isNull()) return null;
            if (!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong() < 0 || value.asLong() > 86_400_000_000_000L)
                throw new IllegalArgumentException("invalid_duration");
            return value.asLong();
        }
        private Long count(JsonNode row, String key) {
            var value = row.path(key);
            if (value.isMissingNode() || value.isNull()) return null;
            if (!value.isIntegralNumber() || !value.canConvertToLong() || value.asLong() < 0 || value.asLong() > 1_000_000_000L)
                throw new IllegalArgumentException("invalid_usage");
            return value.asLong();
        }
        @Override public void onError(Throwable error) { end(new End(Status.FAILED, Failure.TRANSPORT)); }
        @Override public void onComplete() {
            End outcome;
            synchronized (handle.lock) {
                if (handle.terminal != null) { body.complete(null); return; }
                outcome = line.size() > 0 ? frame() : null;
            }
            end(outcome == null ? new End(Status.INCOMPLETE, Failure.NONE) : outcome);
        }
        private void end(End result) { handle.finish(result.status(), result.failure()); body.complete(null); }
    }
    @Override public void close() {
        if (!closed.compareAndSet(false, true)) return;
        for (var handle : active) handle.cancel();
        deadlines.shutdownNow();
    }
}
