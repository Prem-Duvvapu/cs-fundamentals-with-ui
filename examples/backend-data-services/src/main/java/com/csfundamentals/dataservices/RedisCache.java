package com.csfundamentals.dataservices;

import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;
import redis.clients.jedis.*;
import redis.clients.jedis.params.SetParams;

/** Real Redis commands. Each operation opens a bounded short-lived client, without automatic retries. */
public final class RedisCache implements CachePort, AutoCloseable {
    private static final String READ = "local v=redis.call('GET',KEYS[1]); if not v then return nil end; return {v,redis.call('PTTL',KEYS[1])}";
    private static final String COUNT = "local v=redis.call('INCR',KEYS[1]); if v==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {v,redis.call('PTTL',KEYS[1])}";
    private final HostAndPort address;
    private final JedisClientConfig settings;
    private final String namespace;
    private final Set<String> ownedKeys = ConcurrentHashMap.newKeySet();
    private final Semaphore capacity = new Semaphore(8);
    public record Counter(long count, long remainingTtlMs) {}
    public RedisCache(String host, int port, String password, String namespace) {
        LocalServices.loopback(host, port); LocalServices.namespace(namespace);
        if (password == null || password.length() < 32) throw new IllegalArgumentException("runtime_redis_password_required");
        address = new HostAndPort(host, port); this.namespace = namespace;
        settings = DefaultJedisClientConfig.builder().autoNegotiateProtocol(false).password(password).connectionTimeoutMillis(500).socketTimeoutMillis(800).build();
    }
    public String namespace() { return namespace; }
    public String observedServerVersion() {
        return execute(redis -> {
            String info = redis.info("server");
            if (info.length() > 32768) throw new CachePort.Unavailable();
            return info.lines().filter(line -> line.startsWith("redis_version:")).map(line -> line.substring(14).trim())
                    .filter(value -> value.matches("[0-9]+\\.[0-9]+\\.[0-9]+(?:[-a-zA-Z0-9.]+)?") && value.length() <= 40)
                    .findFirst().orElseThrow(CachePort.Unavailable::new);
        });
    }
    private void key(String key) {
        if (key == null || !key.startsWith(namespace + ":") || key.length() > 180 || !key.matches("[a-z0-9_:-]+"))
            throw new IllegalArgumentException("foreign_cache_key");
    }
    private synchronized void own(String key) {
        key(key);
        if (!ownedKeys.contains(key) && ownedKeys.size() >= 128) throw new CachePort.Unavailable();
        ownedKeys.add(key);
    }
    private <T> T execute(Function<Jedis, T> operation) {
        if (!capacity.tryAcquire()) throw new CachePort.Unavailable();
        try (var redis = new Jedis(address, settings)) { return operation.apply(redis); }
        catch (RuntimeException failure) { throw new CachePort.Unavailable(); }
        finally { capacity.release(); }
    }
    static void ttl(long value) { if (value < 10 || value > 60000) throw new IllegalArgumentException("ttl_must_be_10_to_60000_ms"); }
    @Override public Optional<Cached> read(String key) {
        key(key);
        return execute(redis -> {
            Object result = redis.eval(READ, List.of(key), List.of());
            if (result == null) return Optional.empty();
            var values = (List<?>) result;
            long ttl = ((Number) values.get(1)).longValue();
            return ttl <= 0 ? Optional.empty() : Optional.of(new Cached((String) values.get(0), ttl));
        });
    }
    @Override public void put(String key, String json, long ttlMs) {
        ttl(ttlMs); own(key);
        if (json == null || json.length() > 8192) throw new IllegalArgumentException("cache_payload_limit");
        execute(redis -> redis.set(key, json, SetParams.setParams().px(ttlMs)));
    }
    @Override public void remove(String key) { key(key); execute(redis -> redis.del(key)); }
    public Counter increment(String principal, long ttlMs) {
        ttl(ttlMs); String key = namespace + ":rate:" + Ticket.tenant(principal); own(key);
        return execute(redis -> {
            var values = (List<?>) redis.eval(COUNT, List.of(key), List.of(Long.toString(ttlMs)));
            long remaining = ((Number) values.get(1)).longValue();
            if (remaining < 1) throw new CachePort.Unavailable();
            return new Counter(((Number) values.get(0)).longValue(), remaining);
        });
    }
    public String type(String key) { key(key); return execute(redis -> redis.type(key)); }
    @Override public void close() {
        if (!ownedKeys.isEmpty()) execute(redis -> redis.del(ownedKeys.toArray(String[]::new)));
        ownedKeys.clear();
    }
}
