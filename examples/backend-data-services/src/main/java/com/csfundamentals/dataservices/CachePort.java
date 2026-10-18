package com.csfundamentals.dataservices;

import java.util.Optional;

public interface CachePort {
    record Cached(String json, long remainingTtlMs) {}
    Optional<Cached> read(String key);
    void put(String key, String json, long ttlMs);
    void remove(String key);
    final class Unavailable extends RuntimeException { public Unavailable() { super("redis_unavailable_or_capacity"); } }
}
