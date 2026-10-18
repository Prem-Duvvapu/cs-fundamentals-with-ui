package com.csfundamentals.testing;

import java.util.*;

/** All attempts, including transport failures and non-2xx results, enter the same histogram. */
record LoadSummary(int attempts, int successes, int errors, long elapsedNanos, double throughputPerSecond,
                   double p50Ms, double p95Ms, Map<String, Integer> latencyBuckets,
                   Map<String, Integer> outcomes) {
    record Attempt(long nanos, String outcome, boolean success) {
        Attempt { if (nanos < 0 || outcome == null) throw new IllegalArgumentException("invalid_attempt"); }
    }
    static LoadSummary of(List<Attempt> attempts, long elapsedNanos) {
        if (attempts.isEmpty() || attempts.size() > 100 || elapsedNanos <= 0) throw new IllegalArgumentException("bounded_nonempty_run_required");
        var sorted = attempts.stream().mapToLong(Attempt::nanos).sorted().toArray();
        int successes = (int) attempts.stream().filter(Attempt::success).count();
        var buckets = new LinkedHashMap<String, Integer>();
        for (String label : List.of("le25ms", "25to100ms", "100to250ms", "250to500ms", "500to1000ms", "1000to5000ms", "gt5000ms")) buckets.put(label, 0);
        var outcomes = new TreeMap<String, Integer>();
        for (var attempt : attempts) {
            double ms = attempt.nanos() / 1_000_000.0;
            String bucket = ms <= 25 ? "le25ms" : ms <= 100 ? "25to100ms" : ms <= 250 ? "100to250ms" : ms <= 500 ? "250to500ms"
                    : ms <= 1000 ? "500to1000ms" : ms <= 5000 ? "1000to5000ms" : "gt5000ms";
            buckets.merge(bucket, 1, Integer::sum); outcomes.merge(attempt.outcome(), 1, Integer::sum);
        }
        return new LoadSummary(attempts.size(), successes, attempts.size() - successes, elapsedNanos,
                attempts.size() * 1_000_000_000.0 / elapsedNanos, percentile(sorted, .50), percentile(sorted, .95), buckets, outcomes);
    }
    private static double percentile(long[] sorted, double fraction) {
        return sorted[(int) Math.ceil(fraction * sorted.length) - 1] / 1_000_000.0;
    }
}
