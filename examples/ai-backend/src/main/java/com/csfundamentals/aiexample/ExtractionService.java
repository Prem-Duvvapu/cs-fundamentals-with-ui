package com.csfundamentals.aiexample;

import java.util.*;
import java.util.regex.Pattern;
import org.springframework.ai.chat.client.ChatClient;
import tools.jackson.databind.ObjectMapper;

public final class ExtractionService {
    public static final String PROMPT_VERSION = "ticket-v1";
    private static final Pattern ORDER = Pattern.compile("\\bORD-[0-9]{4}\\b");
    private final ChatClient client;
    private final TicketPrompts prompt;
    private final ObjectMapper json = new ObjectMapper();
    public ExtractionService(ChatClient client) { this(client, TicketPrompts.BASELINE); }
    public ExtractionService(ChatClient client, TicketPrompts prompt) {
        this.client = Objects.requireNonNull(client); this.prompt = Objects.requireNonNull(prompt);
    }
    public record Ticket(String category, String priority, String summary, String orderId) {}

    public Ticket extract(String text) {
        if (text == null || text.isBlank() || text.length() > 8192) throw new IllegalArgumentException("ticket_text_required_max_8192");
        String output = client.prompt().system(prompt.system())
                .user(text).call().content();
        try {
            var root = json.readTree(output);
            if (!root.isObject()) throw new IllegalArgumentException("invalid_schema");
            var keys = new HashSet<String>(); root.propertyNames().forEach(keys::add);
            if (!keys.equals(Set.of("category", "priority", "summary", "orderId"))) throw new IllegalArgumentException("invalid_schema");
            if (!root.path("category").isString() || !Set.of("billing", "delivery", "other").contains(root.path("category").asString())
                    || !root.path("priority").isString() || !Set.of("low", "normal", "high").contains(root.path("priority").asString())
                    || !root.path("summary").isString() || root.path("summary").asString().isBlank()
                    || root.path("summary").asString().length() > 240) throw new IllegalArgumentException("invalid_schema");
            var order = root.path("orderId");
            if (!order.isNull() && (!order.isString() || !ORDER.matcher(order.asString()).matches())) throw new IllegalArgumentException("invalid_schema");
            String id = order.isNull() ? null : order.asString();
            if (id != null && !ORDER.matcher(text).results().anyMatch(match -> match.group().equals(id)))
                throw new IllegalArgumentException("unsupported_order_id");
            return new Ticket(root.path("category").asString(), root.path("priority").asString(), root.path("summary").asString(), id);
        } catch (IllegalArgumentException e) { throw e; }
        catch (RuntimeException e) { throw new IllegalArgumentException("invalid_json"); }
    }
}
