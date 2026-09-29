package com.csfundamentals.model;

import java.util.List;

public record Topic(String id, String title, String category, String level, String summary,
                    int order, List<String> prerequisiteIds, List<String> outcomes) {
    public Topic {
        prerequisiteIds = List.copyOf(prerequisiteIds);
        outcomes = List.copyOf(outcomes);
    }

    public Topic(String id, String title, String category, String level, String summary) {
        this(id, title, category, level, summary, 0, List.of(), List.of());
    }
}
