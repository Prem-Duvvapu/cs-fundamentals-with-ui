package com.csfundamentals.messaging;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.Map;

/** Version 1 permits additive metadata; required business fields keep strict types. */
public record TicketEvent(String id, String ticketId, int delta) {
    private static final ObjectMapper JSON = new ObjectMapper()
            .enable(com.fasterxml.jackson.core.JsonParser.Feature.STRICT_DUPLICATE_DETECTION)
            .enable(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_TRAILING_TOKENS);

    public TicketEvent {
        if (id == null || !id.matches("[a-zA-Z0-9-]{1,64}") || ticketId == null
                || !ticketId.matches("[a-zA-Z0-9-]{1,64}") || delta < 1 || delta > 1000) {
            throw new IllegalArgumentException("Invalid event business fields");
        }
    }

    public String json() {
        try {
            return JSON.writeValueAsString(Map.of("schemaVersion", 1, "type", "TicketActivity",
                    "id", id, "ticketId", ticketId, "delta", delta));
        } catch (Exception exception) { throw new IllegalStateException(exception); }
    }

    public static TicketEvent parse(String payload) {
        if (payload == null || payload.length() > 4096) throw new IllegalArgumentException("Event too large");
        try {
            JsonNode root = JSON.readTree(payload);
            if (!root.isObject() || !root.path("schemaVersion").isInt() || root.path("schemaVersion").intValue() != 1
                    || !root.path("type").isTextual() || !root.path("type").textValue().equals("TicketActivity")
                    || !root.path("id").isTextual() || !root.path("ticketId").isTextual()
                    || !root.path("delta").isInt()) throw new IllegalArgumentException("Unsupported event contract");
            return new TicketEvent(root.path("id").textValue(), root.path("ticketId").textValue(), root.path("delta").intValue());
        } catch (IllegalArgumentException exception) { throw exception; }
        catch (Exception exception) { throw new IllegalArgumentException("Invalid event JSON", exception); }
    }
}
