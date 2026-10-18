package com.csfundamentals.aiexample;

import java.math.*;
import java.time.LocalDate;
import java.util.*;

/** User-supplied scenario arithmetic. It does not discover prices or reconstruct missing usage. */
public final class StreamingOllamaCosts {
    private StreamingOllamaCosts() {}
    public record Prices(BigDecimal inputPerMillion, BigDecimal outputPerMillion, String currency,
                         LocalDate asOf, String assumption) {
        public Prices {
            if (inputPerMillion == null || outputPerMillion == null || inputPerMillion.signum() < 0
                    || outputPerMillion.signum() < 0 || inputPerMillion.compareTo(new BigDecimal("1000000")) > 0
                    || outputPerMillion.compareTo(new BigDecimal("1000000")) > 0 || inputPerMillion.scale() > 12
                    || outputPerMillion.scale() > 12 || currency == null || !currency.matches("[A-Z]{3}")
                    || asOf == null || assumption == null || assumption.isBlank() || assumption.length() > 200)
                throw new IllegalArgumentException("invalid_explicit_price_assumptions");
        }
    }
    public record Reviewed(StreamingOllamaResult result, boolean accepted) {
        public Reviewed {
            Objects.requireNonNull(result);
            if (accepted && !result.transportComplete()) throw new IllegalArgumentException("cannot_accept_incomplete_transport");
        }
    }
    public record Summary(int calls, long acceptedResults, int callsWithKnownUsage, int callsWithUnknownUsage,
                          BigDecimal knownUsageScenarioSubtotal, BigDecimal scenarioTotal,
                          BigDecimal scenarioCostPerAcceptedResult, Prices assumptions) {}
    public static Summary summarize(List<Reviewed> calls, Prices prices) {
        if (calls == null || calls.size() > 100) throw new IllegalArgumentException("cost_call_limit");
        Objects.requireNonNull(prices);
        BigDecimal subtotal = BigDecimal.ZERO; int known = 0;
        for (var call : calls) {
            var result = call.result();
            if (result.inputTokens() == null || result.outputTokens() == null) continue;
            subtotal = subtotal.add(BigDecimal.valueOf(result.inputTokens()).multiply(prices.inputPerMillion())
                    .add(BigDecimal.valueOf(result.outputTokens()).multiply(prices.outputPerMillion())).movePointLeft(6));
            known++;
        }
        long accepted = calls.stream().filter(Reviewed::accepted).count();
        BigDecimal total = known == calls.size() ? subtotal : null;
        BigDecimal perAccepted = total == null || accepted == 0 ? null : total.divide(BigDecimal.valueOf(accepted), 12, RoundingMode.HALF_UP);
        return new Summary(calls.size(), accepted, known, calls.size() - known, subtotal, total, perAccepted, prices);
    }
}
