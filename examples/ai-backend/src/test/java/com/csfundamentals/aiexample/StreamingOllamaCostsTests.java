package com.csfundamentals.aiexample;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.aiexample.StreamingOllamaResult.*;

class StreamingOllamaCostsTests {
    private StreamingOllamaCosts.Prices assumptions() {
        return new StreamingOllamaCosts.Prices(new BigDecimal("2"), new BigDecimal("8"), "USD", LocalDate.of(2026, 10, 18),
                "Invented classroom scenario; uniform rates, no cached-token discount or hosting cost");
    }
    private StreamingOllamaResult result(Status status, Long input, Long output) {
        return new StreamingOllamaResult(status, Failure.NONE, "synthetic", "stop", input, input == null ? null : input / 2, output, null, 0L, 1, 1, 100, 200, true);
    }
    @Test void failedButMeteredCallsRemainInCostPerAcceptedResultAndCachedInputIsNotAddedTwice() {
        var calls = List.of(new StreamingOllamaCosts.Reviewed(result(Status.COMPLETE, 1000L, 500L), true),
                new StreamingOllamaCosts.Reviewed(result(Status.INCOMPLETE, 2000L, 250L), false));
        var summary = StreamingOllamaCosts.summarize(calls, assumptions());
        assertEquals(2, summary.calls()); assertEquals(1, summary.acceptedResults());
        assertEquals(0, new BigDecimal("0.012").compareTo(summary.scenarioTotal()));
        assertEquals(0, new BigDecimal("0.012").compareTo(summary.scenarioCostPerAcceptedResult()));
    }
    @Test void unknownFailureUsageDoesNotBecomeZeroOrAFabricatedTotal() {
        var calls = List.of(new StreamingOllamaCosts.Reviewed(result(Status.COMPLETE, 1000L, 500L), true),
                new StreamingOllamaCosts.Reviewed(result(Status.FAILED, null, null), false));
        var summary = StreamingOllamaCosts.summarize(calls, assumptions());
        assertEquals(1, summary.callsWithKnownUsage()); assertEquals(1, summary.callsWithUnknownUsage());
        assertEquals(0, new BigDecimal("0.006").compareTo(summary.knownUsageScenarioSubtotal()));
        assertNull(summary.scenarioTotal()); assertNull(summary.scenarioCostPerAcceptedResult());
    }
    @Test void noAcceptedResultsHasUndefinedPerAcceptedCostAndCompletionDoesNotImplyAcceptance() {
        var summary = StreamingOllamaCosts.summarize(List.of(new StreamingOllamaCosts.Reviewed(result(Status.COMPLETE, 100L, 10L), false)), assumptions());
        assertEquals(0, summary.acceptedResults()); assertNotNull(summary.scenarioTotal()); assertNull(summary.scenarioCostPerAcceptedResult());
        assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Reviewed(result(Status.REFUSED, 1L, 1L), true));
    }
    @Test void arithmeticRequiresExplicitSaneDatedCurrencyAssumptionsAndBoundedCalls() {
        assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Prices(new BigDecimal("-1"), BigDecimal.ONE, "USD", LocalDate.now(), "scenario"));
        assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Prices(BigDecimal.ONE, BigDecimal.ONE, "", LocalDate.now(), "scenario"));
        assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Prices(BigDecimal.ONE, BigDecimal.ONE, "USD", null, "scenario"));
        assertThrows(IllegalArgumentException.class, () -> new StreamingOllamaCosts.Prices(BigDecimal.ONE, BigDecimal.ONE, "USD", LocalDate.now(), ""));
        assertThrows(IllegalArgumentException.class, () -> StreamingOllamaCosts.summarize(Collections.nCopies(101,
                new StreamingOllamaCosts.Reviewed(result(Status.COMPLETE, 1L, 1L), false)), assumptions()));
    }
}
