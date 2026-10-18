package com.csfundamentals.reliability;

import java.time.Duration;
import java.util.function.LongSupplier;

public final class CircuitGate {
    public enum State { CLOSED, OPEN, HALF_OPEN }
    record Permit(long generation, boolean probe) {}
    private final int threshold;
    private final long cooldownNanos;
    private final LongSupplier ticker;
    private State state = State.CLOSED;
    private int failures;
    private long generation;
    private long openedAt;

    public CircuitGate(int threshold, Duration cooldown, LongSupplier ticker) {
        if (threshold < 1 || threshold > 10 || cooldown == null || cooldown.isZero() || cooldown.isNegative()
                || cooldown.compareTo(Duration.ofSeconds(30)) > 0) throw new IllegalArgumentException("Invalid breaker bounds");
        this.threshold = threshold; this.cooldownNanos = cooldown.toNanos(); this.ticker = ticker;
    }

    synchronized Permit enter() {
        if (state == State.CLOSED) return new Permit(generation, false);
        if (state == State.OPEN && ticker.getAsLong() - openedAt >= cooldownNanos) {
            state = State.HALF_OPEN; generation++;
            return new Permit(generation, true);
        }
        return null;
    }

    synchronized void complete(Permit permit, boolean failure, boolean cancelled) {
        if (permit.generation() != generation) return;
        if (state == State.HALF_OPEN) {
            if (failure || cancelled) open();
            else { state = State.CLOSED; failures = 0; generation++; }
        } else if (state == State.CLOSED && !cancelled) {
            if (!failure) failures = 0;
            else if (++failures >= threshold) open();
        }
    }

    private void open() { state = State.OPEN; openedAt = ticker.getAsLong(); failures = 0; generation++; }
    public synchronized State state() { return state; }
}
