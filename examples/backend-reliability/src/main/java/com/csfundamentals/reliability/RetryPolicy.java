package com.csfundamentals.reliability;

import java.time.Clock;
import java.time.Duration;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;
import java.util.function.DoubleSupplier;

public record RetryPolicy(int maxAttempts, Duration attemptTimeout, Duration baseDelay, Duration maxBackoff) {
    public RetryPolicy {
        if (maxAttempts < 1 || maxAttempts > 3 || attemptTimeout == null || baseDelay == null || maxBackoff == null
                || attemptTimeout.isNegative() || attemptTimeout.isZero() || attemptTimeout.compareTo(Duration.ofSeconds(5)) > 0
                || baseDelay.isNegative() || maxBackoff.isNegative() || baseDelay.compareTo(maxBackoff) > 0
                || maxBackoff.compareTo(Duration.ofSeconds(1)) > 0) throw new IllegalArgumentException("Invalid bounded retry policy");
    }

    public long delayNanos(int failedAttempt, String retryAfter, Clock wallClock, DoubleSupplier random) {
        if (failedAttempt < 1 || failedAttempt > 3) throw new IllegalArgumentException("Invalid attempt");
        double unit = random.getAsDouble();
        if (!Double.isFinite(unit) || unit < 0 || unit >= 1) throw new IllegalArgumentException("Jitter source must return [0, 1)");
        long cap = Math.min(maxBackoff.toNanos(), baseDelay.toNanos() * (1L << (failedAttempt - 1)));
        long jitter = (long) (unit * cap);
        return Math.max(jitter, retryAfterNanos(retryAfter, wallClock));
    }

    static long retryAfterNanos(String value, Clock clock) {
        if (value == null || value.isBlank()) return 0;
        try {
            long seconds = Long.parseLong(value.strip());
            if (seconds < 0) return 0;
            return seconds > Long.MAX_VALUE / 1_000_000_000L ? Long.MAX_VALUE : seconds * 1_000_000_000L;
        } catch (NumberFormatException ignored) {
            if (value.strip().matches("[0-9]+")) return Long.MAX_VALUE;
            try {
                Duration delay = Duration.between(clock.instant(), ZonedDateTime.parse(value, DateTimeFormatter.RFC_1123_DATE_TIME).toInstant());
                if (delay.isNegative()) return 0;
                try { return delay.toNanos(); } catch (ArithmeticException overflow) { return Long.MAX_VALUE; }
            } catch (java.time.DateTimeException malformed) { return 0; }
        }
    }

    public static boolean retryableStatus(int status) { return status == 429 || status == 502 || status == 503 || status == 504; }
}
