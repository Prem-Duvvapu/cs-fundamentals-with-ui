package com.csfundamentals.aiexample;

import java.util.*;

/** Task metrics include rejected requests; JSON validity alone is not field correctness. */
final class EvaluationSummary {
    static final List<String> FIELDS = List.of("category", "priority", "orderId");

    record Result(String id, String slice, boolean accepted, Map<String, Boolean> fieldMatches,
                  long totalMs, String error) {
        Result {
            if (id == null || id.isBlank() || slice == null || slice.isBlank() || totalMs < 0
                    || !fieldMatches.keySet().equals(Set.copyOf(FIELDS))
                    || fieldMatches.values().stream().anyMatch(Objects::isNull)
                    || (!accepted && fieldMatches.containsValue(true)))
                throw new IllegalArgumentException("invalid_evaluation_result");
            fieldMatches = Map.copyOf(fieldMatches);
        }
        boolean fieldsCorrect() { return accepted && fieldMatches.values().stream().allMatch(Boolean::booleanValue); }
    }

    static Map<String, Object> summarize(List<Result> results) {
        if (results.stream().map(Result::id).distinct().count() != results.size())
            throw new IllegalArgumentException("duplicate_case_id");
        var summary = aggregate(results);
        var slices = new TreeMap<String, Object>();
        for (String slice : results.stream().map(Result::slice).distinct().toList())
            slices.put(slice, aggregate(results.stream().filter(result -> result.slice().equals(slice)).toList()));
        summary.put("slices", slices);
        return summary;
    }

    private static LinkedHashMap<String, Object> aggregate(List<Result> results) {
        int count = results.size();
        long accepted = results.stream().filter(Result::accepted).count();
        long exact = results.stream().filter(Result::fieldsCorrect).count();
        var fields = new LinkedHashMap<String, Object>();
        for (String field : FIELDS) {
            long correct = results.stream().filter(result -> result.fieldMatches().get(field)).count();
            var metric = new LinkedHashMap<String, Object>();
            metric.put("correct", correct);
            metric.put("rateOverAllCases", rate(correct, count));
            metric.put("rateOverAcceptedCases", rate(correct, accepted));
            fields.put(field, metric);
        }
        var timings = results.stream().mapToLong(Result::totalMs).sorted().toArray();
        var latency = new LinkedHashMap<String, Object>();
        latency.put("samples", count);
        latency.put("p50", percentile(timings, 0.50));
        latency.put("p95", percentile(timings, 0.95));
        latency.put("total", results.stream().mapToLong(Result::totalMs).sum());
        var errors = new TreeMap<String, Long>();
        results.stream().filter(result -> !result.accepted()).forEach(result ->
                errors.merge(result.error() == null ? "unspecified_rejection" : result.error(), 1L, Long::sum));
        var summary = new LinkedHashMap<String, Object>();
        summary.put("cases", count); summary.put("accepted", accepted); summary.put("exactFieldMatches", exact);
        summary.put("acceptanceRate", rate(accepted, count)); summary.put("exactFieldMatchRate", rate(exact, count));
        summary.put("fields", fields); summary.put("latencyMs", latency); summary.put("errors", errors);
        return summary;
    }
    private static Double rate(long numerator, long denominator) { return denominator == 0 ? null : (double) numerator / denominator; }
    private static Long percentile(long[] sorted, double quantile) {
        return sorted.length == 0 ? null : sorted[(int) Math.ceil(quantile * sorted.length) - 1];
    }
}
