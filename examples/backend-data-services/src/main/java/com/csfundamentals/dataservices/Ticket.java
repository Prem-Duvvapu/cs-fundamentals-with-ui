package com.csfundamentals.dataservices;

import java.util.*;
import org.bson.Document;

public record Ticket(String tenant, String id, long version, String title, String priority, String status,
                     String department, List<String> labels) {
    public Ticket {
        if (tenant == null || !Set.of("tenant-a", "tenant-b").contains(tenant) || id == null || !id.matches("[a-z0-9-]{1,48}")
                || version < 1 || title == null || title.isBlank() || title.length() > 160
                || priority == null || !Set.of("low", "high").contains(priority) || status == null || !Set.of("open", "closed").contains(status)
                || department == null || !department.matches("[a-z]{1,32}") || labels == null || labels.size() > 5
                || labels.stream().anyMatch(label -> label == null || !label.matches("[a-z-]{1,24}")))
            throw new IllegalArgumentException("invalid_ticket");
        labels = List.copyOf(labels);
    }
    public static String tenant(String principal) {
        if (principal == null) throw new SecurityException("unknown_principal");
        return switch (principal) { case "alice" -> "tenant-a"; case "bob" -> "tenant-b"; default -> throw new SecurityException("unknown_principal"); };
    }
    public Document document() {
        return new Document("tenant", tenant).append("ticketId", id).append("version", version)
                .append("title", title).append("priority", priority).append("status", status)
                .append("details", new Document("department", department).append("labels", labels));
    }
    public static Ticket parse(Document document) {
        try {
            var details = document.get("details", Document.class);
            Object revision = document.get("version");
            if (!(revision instanceof Integer || revision instanceof Long)) throw new IllegalArgumentException("invalid_version_type");
            return new Ticket(document.getString("tenant"), document.getString("ticketId"), ((Number) revision).longValue(),
                    document.getString("title"), document.getString("priority"), document.getString("status"),
                    details.getString("department"), details.getList("labels", String.class));
        } catch (RuntimeException malformed) { throw new IllegalArgumentException("invalid_ticket_document"); }
    }
}
