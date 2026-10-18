package com.csfundamentals.example.observability;

/** Decision rule for two externally collected five-minute delta windows, not a scheduler. */
public final class ProbeAlert {
    public enum Decision { INSUFFICIENT_VOLUME, CLEAR, DEPENDENCY_ERRORS, DEPENDENCY_LATENCY }
    public record Window(long requests,long failures,long over250Millis) {
        public Window {
            if(requests<0 || failures<0 || over250Millis<0 || failures>requests || over250Millis>requests)
                throw new IllegalArgumentException("Use nonnegative delta counts from one complete five-minute window");
        }
    }
    public static Decision evaluate(Window earlier,Window recent) {
        if(earlier.requests()<20 || recent.requests()<20)return Decision.INSUFFICIENT_VOLUME;
        if(rate(earlier.failures(),earlier.requests())>.05 && rate(recent.failures(),recent.requests())>.05)
            return Decision.DEPENDENCY_ERRORS;
        if(rate(earlier.over250Millis(),earlier.requests())>.05 && rate(recent.over250Millis(),recent.requests())>.05)
            return Decision.DEPENDENCY_LATENCY;
        return Decision.CLEAR;
    }
    private static double rate(long value,long total) { return (double)value/total; }
    private ProbeAlert() {}
}
