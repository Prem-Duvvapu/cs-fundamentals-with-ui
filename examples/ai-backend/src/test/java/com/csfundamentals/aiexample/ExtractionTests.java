package com.csfundamentals.aiexample;

import com.sun.net.httpserver.HttpServer;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.*;
import org.springframework.ai.chat.client.ChatClient;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class ExtractionTests {
    private HttpServer server;
    private final ObjectMapper json = new ObjectMapper();
    private final AtomicReference<String> content = new AtomicReference<>("{\"category\":\"billing\",\"priority\":\"normal\",\"summary\":\"Refund requested\",\"orderId\":\"ORD-1234\"}");
    private final AtomicInteger status = new AtomicInteger(200), delay = new AtomicInteger(), seen = new AtomicInteger();
    private final AtomicReference<String> reason = new AtomicReference<>("stop");
    private java.util.concurrent.ExecutorService executor;
    @BeforeEach void start() throws Exception {
        server = HttpServer.create(new java.net.InetSocketAddress("127.0.0.1", 0), 0);
        executor = Executors.newCachedThreadPool(); server.setExecutor(executor);
        server.createContext("/api/chat", exchange -> {
            seen.incrementAndGet(); exchange.getRequestBody().readAllBytes();
            try { Thread.sleep(delay.get()); } catch (InterruptedException e) { Thread.currentThread().interrupt(); }
            byte[] body = json.writeValueAsBytes(Map.of("message", Map.of("content", content.get()), "done", true, "done_reason", reason.get()));
            try { exchange.sendResponseHeaders(status.get(), body.length); exchange.getResponseBody().write(body); }
            catch (java.io.IOException ignored) { /* Expected when client cancellation closes the test socket. */ }
            finally { exchange.close(); }
        }); server.start();
    }
    @AfterEach void stop() { server.stop(0); executor.shutdownNow(); }
    private OllamaHttpModel model(Duration timeout, int budget) {
        return new OllamaHttpModel(URI.create("http://127.0.0.1:" + server.getAddress().getPort() + "/api/chat"), "fixture", timeout, budget);
    }
    private ExtractionService service() { return new ExtractionService(ChatClient.create(model(Duration.ofSeconds(3), 10))); }
    @Test void realHttpAndSpringAiProduceValidatedJavaValue() {
        var result = service().extract("Please refund ORD-1234");
        assertEquals("billing", result.category()); assertEquals("ORD-1234", result.orderId()); assertEquals(1, seen.get());
    }
    @Test void rejectsHallucinatedOrderEvenWithValidSchema() {
        assertEquals("unsupported_order_id", assertThrows(IllegalArgumentException.class,
                () -> service().extract("Please refund ORD-9999")).getMessage());
    }
    @Test void rejectsInvalidJsonUnknownFieldsAndWrongTypes() {
        for (String invalid : new String[]{"not json", "[]", "{}", "{\"category\":12}",
                content.get().replace("\"billing\"", "\"admin\""), content.get().replace("\"orderId\"", "\"extra\"")}) {
            content.set(invalid); assertThrows(IllegalArgumentException.class, () -> service().extract("refund ORD-1234"));
        }
    }
    @Test void missingSourceCanReturnNullAndCannotInventIdentifier() {
        content.set(content.get().replace("\"ORD-1234\"", "null"));
        assertNull(service().extract("Please refund the payment").orderId());
    }
    @Test void invalidInputDoesNotCallProvider() {
        for (String text : new String[]{null, " ", "x".repeat(8193)}) assertThrows(IllegalArgumentException.class, () -> service().extract(text));
        assertEquals(0, seen.get());
    }
    @Test void refusalAndOutputLimitDoNotBecomeAcceptedTickets() {
        content.set(""); assertThrows(OllamaHttpModel.ModelFailure.class, () -> service().extract("refund ORD-1234"));
        content.set("x".repeat(40000)); assertThrows(OllamaHttpModel.ModelFailure.class, () -> service().extract("refund ORD-1234"));
    }
    @Test void truncationIsAnExplicitProviderFailure() {
        reason.set("length"); assertEquals("incomplete_output", assertThrows(OllamaHttpModel.ModelFailure.class,
                () -> service().extract("refund ORD-1234")).getMessage());
    }
    @Test void rateLimitsAreVisibleAndDoNotCreateUnboundedRetries() {
        status.set(429); assertEquals("provider_http_429", assertThrows(OllamaHttpModel.ModelFailure.class,
                () -> service().extract("refund ORD-1234")).getMessage()); assertEquals(1, seen.get());
    }
    @Test void totalDeadlineAndCallBudgetBoundWork() {
        delay.set(500);
        var client = ChatClient.create(model(Duration.ofMillis(100), 1));
        assertThrows(OllamaHttpModel.ModelFailure.class, () -> client.prompt("test").call().content());
        assertEquals("call_budget_exhausted", assertThrows(OllamaHttpModel.ModelFailure.class,
                () -> client.prompt("test").call().content()).getMessage());
    }
}
