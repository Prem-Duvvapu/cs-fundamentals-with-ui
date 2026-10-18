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
    public record Result(Ticket ticket, String cacheState, long remainingTtlMs) {}
    public record Write(Ticket ticket, boolean invalidated) {}
    public CacheAsideTickets(TicketSource source, CachePort cache, String namespace, long ttlMs) {
        LocalServices.namespace(namespace); RedisCache.ttl(ttlMs);
        this.source = source; this.cache = cache; this.namespace = namespace; this.ttlMs = ttlMs;
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
        boolean unavailable = false;
        try {
            var cached = cache.read(key);
            if (cached.isPresent()) {
                try {
                    var ticket = Ticket.parse(Document.parse(cached.get().json()));
                    if (ticket.version() == version.getAsLong() && ticket.id().equals(id)
                            && ticket.tenant().equals(Ticket.tenant(principal)) && cached.get().remainingTtlMs() > 0)
                        return Optional.of(new Result(ticket, "hit-verified-version", cached.get().remainingTtlMs()));
                } catch (RuntimeException corrupt) { /* Reject rather than return an unvalidated cache envelope. */ }
                cache.remove(key);
            }
        } catch (CachePort.Unavailable failure) { unavailable = true; }
        var canonical = authoritative(() -> source.find(principal, id));
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
