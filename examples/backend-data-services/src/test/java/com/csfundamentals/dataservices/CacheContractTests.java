package com.csfundamentals.dataservices;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.bson.Document;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

/** Local fakes test the application contract; they are NOT Redis or MongoDB evidence. */
class CacheContractTests {
    static final class FakeSource implements TicketSource {
        final Map<String,Ticket> rows = new HashMap<>();
        int fullReads;
        boolean down;
        Runnable afterFind = () -> {};
        Ticket create(String principal, String id, String title) {
            var ticket = new Ticket(Ticket.tenant(principal), id, 1, title, "high", "open", "support", List.of("original"));
            rows.put(ticket.tenant()+":"+id,ticket); return ticket;
        }
        private String key(String principal,String id) { return Ticket.tenant(principal)+":"+id; }
        @Override public OptionalLong version(String principal,String id) {
            if (down) throw new TicketSource.Unavailable();
            var ticket=rows.get(key(principal,id)); return ticket==null?OptionalLong.empty():OptionalLong.of(ticket.version());
        }
        @Override public Optional<Ticket> find(String principal,String id) {
            if (down) throw new TicketSource.Unavailable();
            fullReads++; var result=Optional.ofNullable(rows.get(key(principal,id))); afterFind.run(); return result;
        }
        @Override public Ticket rename(String principal,String id,long expectedVersion,String title) {
            var old=rows.get(key(principal,id));
            if (old==null || old.version()!=expectedVersion) throw new Conflict();
            var next=new Ticket(old.tenant(),id,old.version()+1,title,old.priority(),old.status(),old.department(),old.labels());
            rows.put(key(principal,id),next); return next;
        }
    }
    static final class FakeCache implements CachePort {
        final Map<String,Cached> rows = new HashMap<>();
        boolean down;
        Runnable beforeRemove = () -> {};
        @Override public Optional<Cached> read(String key) { if(down)throw new Unavailable(); return Optional.ofNullable(rows.get(key)); }
        @Override public void put(String key,String value,long ttl) { if(down)throw new Unavailable(); rows.put(key,new Cached(value,ttl)); }
        @Override public void remove(String key) { if(down)throw new Unavailable(); beforeRemove.run(); rows.remove(key); }
    }
    private final FakeSource source = new FakeSource();
    private final FakeCache cache = new FakeCache();
    private final CacheAsideTickets service = new CacheAsideTickets(source,cache,LocalServices.namespace(),1000);
    @Test void tenantKeysAndEmbeddedPayloadChecksPreventCrossTenantCacheData() {
        source.create("alice","same","Alice original"); var bob=source.create("bob","same","Bob private");
        assertNotEquals(service.key("alice","same",1),service.key("bob","same",1));
        cache.put(service.key("alice","same",1),bob.document().toJson(),1000);
        assertEquals("Alice original",service.find("alice","same").orElseThrow().ticket().title());
    }
    @Test void cacheHitUsesCanonicalVersionAndAvoidsFullDocumentRead() {
        source.create("alice","one","Original");
        assertEquals("miss-filled",service.find("alice","one").orElseThrow().cacheState());
        assertEquals("hit-verified-version",service.find("alice","one").orElseThrow().cacheState());
        assertEquals(1,source.fullReads);
    }
    @Test void invalidationRunsAfterSourceCommitAndConflictsDoNotInvalidate() {
        source.create("alice","one","Original"); service.find("alice","one");
        var removed=new AtomicInteger();
        cache.beforeRemove=()->{ assertEquals(2,source.version("alice","one").orElseThrow()); removed.incrementAndGet(); };
        assertTrue(service.rename("alice","one",1,"New").invalidated());
        assertThrows(TicketSource.Conflict.class,()->service.rename("alice","one",1,"Lost update"));
        assertEquals(1,removed.get());
    }
    @Test void failedInvalidationCannotMakeOldVersionCurrentAgain() {
        source.create("alice","one","Original"); service.find("alice","one");
        cache.down=true;
        assertFalse(service.rename("alice","one",1,"New").invalidated());
        assertEquals("bypass-redis-unavailable",service.find("alice","one").orElseThrow().cacheState());
        cache.down=false;
        assertTrue(cache.rows.containsKey(service.key("alice","one",1)));
        assertEquals("New",service.find("alice","one").orElseThrow().ticket().title());
    }
    @Test void lateOldPopulationDoesNotPoisonSubsequentCurrentRead() {
        source.create("alice","one","Original");
        source.afterFind=()->{ source.afterFind=()->{}; source.rename("alice","one",1,"New"); };
        assertEquals(1,service.find("alice","one").orElseThrow().ticket().version());
        assertTrue(cache.rows.containsKey(service.key("alice","one",1)));
        assertEquals(2,service.find("alice","one").orElseThrow().ticket().version());
    }
    @Test void expiredCorruptOrWrongVersionEntryIsNotReturned() {
        var ticket=source.create("alice","one","Original");
        for(var entry:List.of(new CachePort.Cached("not json",1000), new CachePort.Cached(ticket.document().toJson(),0),
                new CachePort.Cached(new Ticket(ticket.tenant(),ticket.id(),2,"Wrong",ticket.priority(),ticket.status(),ticket.department(),ticket.labels()).document().toJson(),1000))) {
            cache.rows.put(service.key("alice","one",1),entry);
            assertEquals("Original",service.find("alice","one").orElseThrow().ticket().title());
        }
    }
    @Test void unavailableOrDeletedAuthorityDoesNotServeStaleCache() {
        source.create("alice","one","Original"); service.find("alice","one");
        source.down=true;
        assertThrows(TicketSource.Unavailable.class,()->service.find("alice","one"));
        source.down=false; source.rows.clear();
        assertTrue(service.find("alice","one").isEmpty());
    }
    @Test void documentCodecPreservesAggregateAndRejectsMalformedVersions() {
        var original=source.create("alice","one","Original");
        assertEquals(original,Ticket.parse(Document.parse(original.document().toJson())));
        var wrong=original.document().append("version",1.5);
        assertThrows(IllegalArgumentException.class,()->Ticket.parse(wrong));
        assertThrows(IllegalArgumentException.class,()->new Ticket(null,"one",1,"Title","high","open","support",List.of()));
    }
    @Test void localConfigurationRequiresRuntimeAuthenticationAndOwnedKeys() {
        for(String uri:List.of("mongodb://example.com:27017", "mongodb+srv://example.com", "mongodb://localhost:27017", "mongodb://localhost:27017,example.com:27017"))
            assertThrows(IllegalArgumentException.class,()->LocalServices.mongo(uri));
        assertThrows(IllegalArgumentException.class,()->new RedisCache("remote",6379,UUID.randomUUID().toString(),LocalServices.namespace()));
        assertThrows(IllegalArgumentException.class,()->new RedisCache("127.0.0.1",6379,"",LocalServices.namespace()));
        assertThrows(IllegalArgumentException.class,()->service.key("alice","../other",1));
        assertThrows(SecurityException.class,()->service.find("mallory","one"));
    }
}
