package com.csfundamentals.reliability;

import org.junit.jupiter.api.Test;
import java.time.*;
import java.util.concurrent.atomic.AtomicLong;
import static org.junit.jupiter.api.Assertions.*;

class PolicyTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"), ZoneOffset.UTC);
    @Test void retryAfterSupportsDeltaSecondsHttpDatePastDatesAndMalformedValues() {
        assertEquals(2_000_000_000L, RetryPolicy.retryAfterNanos("2", CLOCK));
        assertEquals(2_000_000_000L, RetryPolicy.retryAfterNanos("Sun, 18 Oct 2026 12:00:02 GMT", CLOCK));
        assertEquals(0, RetryPolicy.retryAfterNanos("Sun, 18 Oct 2026 11:59:59 GMT", CLOCK));
        assertEquals(0, RetryPolicy.retryAfterNanos("-1", CLOCK));
        assertEquals(0, RetryPolicy.retryAfterNanos("tomorrow", CLOCK));
        assertEquals(Long.MAX_VALUE, RetryPolicy.retryAfterNanos("999999999999999999999999", CLOCK));
    }
    @Test void exponentialFullJitterIsCappedAndInvalidRandomValuesAreRejected() {
        var policy = new RetryPolicy(3, Duration.ofSeconds(1), Duration.ofMillis(100), Duration.ofMillis(150));
        assertEquals(50_000_000L, policy.delayNanos(1, null, CLOCK, () -> .5));
        assertEquals(75_000_000L, policy.delayNanos(2, null, CLOCK, () -> .5));
        for (double invalid : new double[]{Double.NaN, -0.1, 1, Double.POSITIVE_INFINITY}) assertThrows(IllegalArgumentException.class, () -> policy.delayNanos(1, null, CLOCK, () -> invalid));
        assertThrows(IllegalArgumentException.class, () -> new RetryPolicy(4, Duration.ofSeconds(1), Duration.ZERO, Duration.ZERO));
    }
    @Test void staleSuccessfulCallCannotCloseANewerOpenCircuit() {
        AtomicLong ticker = new AtomicLong(); var gate = new CircuitGate(1, Duration.ofSeconds(1), ticker::get);
        var slowEarlier = gate.enter(); var failing = gate.enter(); gate.complete(failing, true, false);
        assertEquals(CircuitGate.State.OPEN, gate.state()); gate.complete(slowEarlier, false, false);
        assertEquals(CircuitGate.State.OPEN, gate.state());
    }
    @Test void failedAndCancelledProbesReopenAndRequireAnotherFullCooldown() {
        AtomicLong ticker = new AtomicLong(); var gate = new CircuitGate(1, Duration.ofSeconds(1), ticker::get);
        gate.complete(gate.enter(), true, false); assertNull(gate.enter());
        ticker.addAndGet(1_000_000_000L); var first = gate.enter(); assertTrue(first.probe()); assertNull(gate.enter());
        gate.complete(first, true, false); assertEquals(CircuitGate.State.OPEN, gate.state()); assertNull(gate.enter());
        ticker.addAndGet(1_000_000_000L); var second = gate.enter(); gate.complete(second, false, true);
        assertEquals(CircuitGate.State.OPEN, gate.state()); assertNull(gate.enter());
        ticker.addAndGet(1_000_000_000L); var third = gate.enter(); gate.complete(third, false, false);
        assertEquals(CircuitGate.State.CLOSED, gate.state());
    }
}
