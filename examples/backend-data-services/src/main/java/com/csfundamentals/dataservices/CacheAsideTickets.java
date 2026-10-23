package com.csfundamentals.dataservices;

import java.util.*;
import java.util.function.Supplier;
import org.bson.Document;

/** Cache-aside with a canonical version read: stronger freshness costs an extra source query. */
public final class CacheAsideTickets {
    private final TicketSource source;
    private final CachePort cache;
    private final String namespace;
    private final long ttlMs;
    private final CoalescedLoads loads;
    public record Result(Ticket ticket, String cacheState, long remainingTtlMs) {}
    public record Write(Ticket ticket, boolean invalidated) {}
    public CacheAsideTickets(TicketSource source, CachePort cache, String namespace, long ttlMs) {
        this(source,cache,namespace,ttlMs,null);
    }
    public CacheAsideTickets(TicketSource source, CachePort cache, String namespace, long ttlMs, CoalescedLoads loads) {
        LocalServices.namespace(namespace); RedisCache.ttl(ttlMs);
        this.source = source; this.cache = cache; this.namespace = namespace; this.ttlMs = ttlMs; this.loads = loads;
    }
    public String key(String principal, String id, long version) {
        LocalServices.id(id); if (version < 1) throw new IllegalArgumentException("invalid_version");
        return namespace + ":ticket:" + Ticket.tenant(principal) + ":" + id + ":v" + version;
    }
    private <T> T authoritative(Supplier<T> operation) {
        try { return operation.get(); }
        catch (IllegalArgumentException | SecurityException | TicketSource.Conflict expected) { throw expected; }
        catch (RuntimeException unavailable) { throw new TicketSource.Unavailable(); }
    }
    private Ticket check(String principal, String id, Ticket ticket) {
        if (!ticket.tenant().equals(Ticket.tenant(principal)) || !ticket.id().equals(id)) throw new SecurityException("invalid_source_scope");
        return ticket;
    }
    public Optional<Result> find(String principal, String id) {
        LocalServices.id(id); Ticket.tenant(principal);
        var version = authoritative(() -> source.version(principal, id));
        if (version.isEmpty()) return Optional.empty();
        String key = key(principal, id, version.getAsLong());
        Lookup lookup = cached(principal,id,version.getAsLong(),key);
        if (lookup.result().isPresent()) return lookup.result();
        if (loads == null) return fill(principal,id,lookup.unavailable(),null);
        return loads.load(key,budget -> {
            budget.check();
            // A previously completed flight may have filled Redis after this caller's first miss.
            Lookup again = lookup.unavailable() ? lookup : cached(principal,id,version.getAsLong(),key);
            budget.check();
            if (again.result().isPresent()) return again.result();
            return fill(principal,id,again.unavailable(),budget);
        });
    }
    private record Lookup(Optional<Result> result, boolean unavailable) {}
    private Lookup cached(String principal, String id, long version, String key) {
        try {
            var cached = cache.read(key);
            if (cached.isPresent()) {
                try {
                    var ticket = Ticket.parse(Document.parse(cached.get().json()));
                    if (ticket.version() == version && ticket.id().equals(id)
                            && ticket.tenant().equals(Ticket.tenant(principal)) && cached.get().remainingTtlMs() > 0)
                        return new Lookup(Optional.of(new Result(ticket, "hit-verified-version", cached.get().remainingTtlMs())),false);
                } catch (RuntimeException corrupt) { /* Reject rather than return an unvalidated cache envelope. */ }
                cache.remove(key);
            }
            return new Lookup(Optional.empty(),false);
        } catch (CachePort.Unavailable failure) { return new Lookup(Optional.empty(),true); }
    }
    private Optional<Result> fill(String principal, String id, boolean unavailable, CoalescedLoads.Budget budget) {
        if (budget != null) budget.check();
        var canonical = authoritative(() -> source.find(principal, id));
        // A late source result must not populate Redis after the shared load budget expired.
        if (budget != null) budget.check();
        if (canonical.isEmpty()) return Optional.empty();
        var ticket = check(principal, id, canonical.get());
        if (!unavailable) try { cache.put(key(principal, id, ticket.version()), ticket.document().toJson(), ttlMs); }
        catch (CachePort.Unavailable failure) { unavailable = true; }
        return Optional.of(new Result(ticket, unavailable ? "bypass-redis-unavailable" : "miss-filled", -1));
    }
    public Write rename(String principal, String id, long expectedVersion, String title) {
        var changed = check(principal, id, authoritative(() -> source.rename(principal, id, expectedVersion, title)));
        boolean invalidated = true;
        try { cache.remove(key(principal, id, expectedVersion)); }
        catch (CachePort.Unavailable unavailable) { invalidated = false; }
        return new Write(changed, invalidated);
    }
}
