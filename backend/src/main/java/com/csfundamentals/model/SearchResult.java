package com.csfundamentals.model;

import java.util.List;

public record SearchResult(
    String topicId,
    String title,
    String category,
    String level,
    String summary,
    String matchedHeading,
    String excerpt,
    List<String> matchedTerms,
    int score
) {
    public SearchResult {
        matchedTerms = List.copyOf(matchedTerms);
    }
}
