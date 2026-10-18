package com.csfundamentals.aiexample;

import java.util.*;
import java.util.regex.Pattern;

/** A deliberately small alternative to a model, with explicit review for ambiguity. */
final class TicketRuleBaseline {
    static final String VERSION = "ticket-rules-v1";
    private static final Pattern BILLING = Pattern.compile("\\b(refund|payment|invoice|billing)\\b");
    private static final Pattern DELIVERY = Pattern.compile("\\b(delivery|shipping|arrival)\\b");
    private static final Pattern URGENT = Pattern.compile("\\burgent\\b");
    private static final Pattern LOW = Pattern.compile("\\blow[- ]priority\\b");
    private static final Pattern REVIEW = Pattern.compile("\\b(not|never|ignore)\\b");
    private static final Pattern ORDER = Pattern.compile("\\bORD-[0-9]{4}\\b");
    static ExtractionService.Ticket extract(String text) {
        if (text == null || text.isBlank() || text.length() > 8192)
            throw new IllegalArgumentException("ticket_text_required_max_8192");
        String lower = text.toLowerCase(Locale.ROOT);
        boolean billing = BILLING.matcher(lower).find(), delivery = DELIVERY.matcher(lower).find();
        boolean urgent = URGENT.matcher(lower).find(), low = LOW.matcher(lower).find();
        var orders = ORDER.matcher(text).results().map(match -> match.group()).distinct().toList();
        if ((billing && delivery) || (urgent && low) || orders.size() > 1 || REVIEW.matcher(lower).find())
            throw new IllegalArgumentException("rule_needs_review");
        String summary = text.strip();
        return new ExtractionService.Ticket(billing ? "billing" : delivery ? "delivery" : "other",
                urgent ? "high" : low ? "low" : "normal", summary.substring(0, Math.min(240, summary.length())),
                orders.isEmpty() ? null : orders.get(0));
    }
}
