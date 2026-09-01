package com.csfundamentals.model;

import java.util.List;

public record SearchResponse(
    String query,
    String category,
    int total,
    List<SearchResult> results
) {
    public SearchResponse {
        results = List.copyOf(results);
    }
}
