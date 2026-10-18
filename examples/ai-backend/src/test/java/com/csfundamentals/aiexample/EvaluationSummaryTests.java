package com.csfundamentals.aiexample;

import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class EvaluationSummaryTests {
    private EvaluationSummary.Result result(String id, String slice, boolean accepted, boolean category, boolean priority, boolean orderId, long ms) {
        return new EvaluationSummary.Result(id, slice, accepted,
                Map.of("category", category, "priority", priority, "orderId", orderId), ms, accepted ? null : "provider_deadline");
    }
    private Map<?, ?> object(Object value) { return (Map<?, ?>) value; }

    @Test void reportsSchemaSuccessSeparatelyFromSemanticFailure() {
        var report = EvaluationSummary.summarize(List.of(result("a", "ordinary", true, true, false, false, 7)));
        assertEquals(1.0, report.get("acceptanceRate"));
        assertEquals(0.0, report.get("exactFieldMatchRate"));
        assertEquals(1.0, object(object(report.get("fields")).get("category")).get("rateOverAllCases"));
        assertEquals(0.0, object(object(report.get("fields")).get("orderId")).get("rateOverAllCases"));
    }
    @Test void failedRequestsRemainInOverallDenominatorAndAreVisibleBySlice() {
        var report = EvaluationSummary.summarize(List.of(
                result("a", "ordinary", true, true, true, true, 10),
                result("b", "adversarial", false, false, false, false, 3000)));
        assertEquals(0.5, report.get("exactFieldMatchRate"));
        var category = object(object(report.get("fields")).get("category"));
        assertEquals(0.5, category.get("rateOverAllCases"));
        assertEquals(1.0, category.get("rateOverAcceptedCases"));
        var adversarial = object(object(report.get("slices")).get("adversarial"));
        assertEquals(0.0, adversarial.get("acceptanceRate"));
        assertEquals(1L, object(adversarial.get("errors")).get("provider_deadline"));
    }
    @Test void computesNearestRankQuantilesFromObservationsNotMeans() {
        var results = new ArrayList<EvaluationSummary.Result>();
        for (int n = 1; n <= 20; n++) results.add(result("case-" + n, "ordinary", true, true, true, true, n * 10));
        Collections.reverse(results);
        var latency = object(EvaluationSummary.summarize(results).get("latencyMs"));
        assertEquals(100L, latency.get("p50")); assertEquals(190L, latency.get("p95"));
        assertEquals(2100L, latency.get("total"));
    }
    @Test void undefinedRatesAndEmptyQuantilesStayNull() {
        var report = EvaluationSummary.summarize(List.of());
        assertNull(report.get("acceptanceRate")); assertNull(report.get("exactFieldMatchRate"));
        assertNull(object(report.get("latencyMs")).get("p95"));
        var rejected = EvaluationSummary.summarize(List.of(result("a", "failure", false, false, false, false, 3)));
        assertNull(object(object(rejected.get("fields")).get("category")).get("rateOverAcceptedCases"));
    }
    @Test void refusesDuplicateCaseIdsAndContradictoryResults() {
        var first = result("same", "ordinary", true, true, true, true, 1);
        assertThrows(IllegalArgumentException.class, () -> EvaluationSummary.summarize(List.of(first, first)));
        assertThrows(IllegalArgumentException.class, () -> result("bad", "failure", false, true, false, false, 1));
        assertThrows(IllegalArgumentException.class, () -> result("bad", "failure", true, true, true, true, -1));
    }
}
