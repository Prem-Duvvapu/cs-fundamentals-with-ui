package com.csfundamentals.dataservices;

import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import java.util.function.*;
import org.bson.Document;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

/** Actual Redis plus an explicitly controlled original origin; this is not MongoDB evidence. */
@EnabledIfEnvironmentVariable(named="DATA_REDIS_INTEGRATION",matches="1")
@Timeout(20)
class CacheRecoveryRedisTests {
    private static final Map<String,Object> cases = new TreeMap<>();
    private static String redisVersion;
    static final class ControlledSource implements TicketSource {
        final Map<String,Ticket> rows = new ConcurrentHashMap<>();
        final AtomicInteger fullReads = new AtomicInteger(), metadataReads = new AtomicInteger();
        volatile Consumer<Ticket> afterRead = ignored -> {};
        volatile boolean fail;
        Ticket create(String principal,String id,String title) {
            var ticket = new Ticket(Ticket.tenant(principal),id,1,title,"high","open","support",List.of("original"));
            rows.put(ticket.tenant()+":"+id,ticket); return ticket;
        }
        public OptionalLong version(String principal,String id) {
            metadataReads.incrementAndGet(); var ticket = rows.get(Ticket.tenant(principal)+":"+id);
            return ticket == null ? OptionalLong.empty() : OptionalLong.of(ticket.version());
        }
        public Optional<Ticket> find(String principal,String id) {
            fullReads.incrementAndGet(); var ticket = rows.get(Ticket.tenant(principal)+":"+id);
            afterRead.accept(ticket);
            if (fail) throw new TicketSource.Unavailable();
            return Optional.ofNullable(ticket);
        }
        public Ticket rename(String principal,String id,long version,String title) {
            return rows.compute(Ticket.tenant(principal)+":"+id,(key,old) -> {
                if (old == null || old.version() != version) throw new TicketSource.Conflict();
                return new Ticket(old.tenant(),id,version+1,title,old.priority(),old.status(),old.department(),old.labels());
            });
        }
    }
    static CoalescedLoads loads(int flights,int callers,long milliseconds) {
        return new CoalescedLoads(flights,callers,Duration.ofMillis(milliseconds));
    }
    static void gate(CountDownLatch latch) {
        try { if (!latch.await(4,TimeUnit.SECONDS)) throw new IllegalStateException("controlled_origin_deadline"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new TicketSource.Unavailable(); }
    }
    static void await(BooleanSupplier condition) throws Exception {
        long expires=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);
        while (!condition.getAsBoolean() && System.nanoTime()<expires) Thread.sleep(5);
        assertTrue(condition.getAsBoolean(),"Actual bounded observation missing");
    }
    static List<Future<Optional<CacheAsideTickets.Result>>> burst(ExecutorService callers, CacheAsideTickets service,int count) {
        var start = new CountDownLatch(1); var futures = new ArrayList<Future<Optional<CacheAsideTickets.Result>>>();
        for (int i=0;i<count;i++) futures.add(callers.submit(() -> { gate(start); return service.find("alice","one"); }));
        start.countDown(); return futures;
    }
    static void stop(ExecutorService callers) throws Exception {
        callers.shutdownNow(); assertTrue(callers.awaitTermination(3,TimeUnit.SECONDS));
    }
    private static RedisCache actualCache() {
        var cache=RedisIntegrationTests.cache(); String observed=cache.observedServerVersion();
        if (redisVersion != null) assertEquals(redisVersion,observed);
        redisVersion=observed; return cache;
    }
    private static void deleted(RedisCache cache,String... keys) {
        for (String key:keys) assertTrue(cache.read(key).isEmpty(),"Exact owned key must be deleted");
    }
    @Test void actualColdBurstMeasuresSixOriginReadsVersusOneCoalescedRead() throws Exception {
        var reads=new ArrayList<Integer>(); var metadata=new ArrayList<Integer>();
        for (boolean coalesced:List.of(false,true)) {
            var cache=actualCache(); var source=new ControlledSource(); source.create("alice","one","Original");
            var entered=new CountDownLatch(coalesced?1:6); var release=new CountDownLatch(1);
            source.afterRead=ticket->{entered.countDown();gate(release);};
            var callers=Executors.newFixedThreadPool(6); var loads=loads(2,8,3000);
            var service=new CacheAsideTickets(source,cache,cache.namespace(),10000,coalesced?loads:null);
            String key=service.key("alice","one",1);
            try (cache; loads) {
                assertTrue(cache.read(key).isEmpty());
                var futures=burst(callers,service,6); assertTrue(entered.await(2,TimeUnit.SECONDS));
                if (coalesced) await(()->loads.snapshot().joined()==5);
                assertEquals(coalesced?1:6,source.fullReads.get()); release.countDown();
                for(var future:futures) assertEquals("Original",future.get(3,TimeUnit.SECONDS).orElseThrow().ticket().title());
                assertTrue(cache.read(key).orElseThrow().remainingTtlMs()>0);
                reads.add(source.fullReads.get()); metadata.add(source.metadataReads.get());
                assertEquals(coalesced?1:0,loads.snapshot().started());
            } finally { release.countDown();stop(callers);cache.close(); }
            deleted(cache,key);
        }
        assertEquals(List.of(6,1),reads); assertEquals(List.of(6,6),metadata);
        cases.put("cold-burst",Map.of("callersPerRun",6,"originFullReads",reads,"metadataReads",metadata,"ownedKeysDeleted",true));
    }
    @Test void failedSharedOriginDoesNotCacheAnErrorAndNextLoadRecovers() throws Exception {
        var cache=actualCache();var source=new ControlledSource(); source.create("alice","one","Original"); source.fail=true;
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);
        source.afterRead=ticket->{entered.countDown();gate(release);};
        var callers=Executors.newFixedThreadPool(6);var loads=loads(1,8,3000);
        var service=new CacheAsideTickets(source,cache,cache.namespace(),10000,loads);String key=service.key("alice","one",1);
        try (cache; loads) {
            var futures=burst(callers,service,6);assertTrue(entered.await(2,TimeUnit.SECONDS));await(()->loads.snapshot().joined()==5);
            release.countDown();
            for(var future:futures) assertInstanceOf(TicketSource.Unavailable.class,assertThrows(ExecutionException.class,()->future.get(3,TimeUnit.SECONDS)).getCause());
            await(()->loads.snapshot().activeFlights()==0); assertTrue(cache.read(key).isEmpty());assertEquals(1,source.fullReads.get());
            source.fail=false;source.afterRead=ignored->{};
            assertEquals("Original",service.find("alice","one").orElseThrow().ticket().title());assertEquals(2,source.fullReads.get());
            assertEquals("hit-verified-version",service.find("alice","one").orElseThrow().cacheState());
        } finally {release.countDown();stop(callers);cache.close();}
        deleted(cache,key);cases.put("origin-failure",Map.of("sharedFailures",6,"failedOriginReads",1,"totalOriginReadsAfterRecovery",source.fullReads.get(),"errorNotCached",true,"ownedKeysDeleted",true));
    }
    @Test void timedOutOwnerRetainsItsSlotUntilActualExitAndCapacityThenRecovers() throws Exception {
        var cache=actualCache();var source=new ControlledSource();source.create("alice","one","Original");source.create("alice","two","Other");
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);
        source.afterRead=ticket->{entered.countDown();gate(release);};
        var callers=Executors.newFixedThreadPool(2);var loads=loads(1,2,1000);
        var service=new CacheAsideTickets(source,cache,cache.namespace(),10000,loads);String key=service.key("alice","one",1);
        try (cache; loads) {
            var first=callers.submit(()->service.find("alice","one"));assertTrue(entered.await(2,TimeUnit.SECONDS));
            var second=callers.submit(()->service.find("alice","one"));await(()->loads.snapshot().waitingCallers()==2);
            assertThrows(CoalescedLoads.Capacity.class,()->service.find("alice","one"));
            for(var future:List.of(first,second)) assertInstanceOf(CoalescedLoads.Deadline.class,assertThrows(ExecutionException.class,()->future.get(2,TimeUnit.SECONDS)).getCause());
            assertEquals(1,loads.snapshot().activeFlights());assertEquals(0,loads.snapshot().waitingCallers());
            assertThrows(CoalescedLoads.Capacity.class,()->service.find("alice","two"));
            assertThrows(CoalescedLoads.Deadline.class,()->service.find("alice","one"));assertEquals(1,source.fullReads.get());
            release.countDown();await(()->loads.snapshot().activeFlights()==0);assertTrue(cache.read(key).isEmpty());
            source.afterRead=ignored->{};
            assertEquals("Original",service.find("alice","one").orElseThrow().ticket().title());assertEquals(2,source.fullReads.get());
        } finally {release.countDown();stop(callers);cache.close();}
        deleted(cache,key);cases.put("deadline-capacity",Map.of("timedOutCalls",loads.snapshot().timedOut(),"rejectedAdmissions",loads.snapshot().rejected(),"retainedFlightsWhileOriginBlocked",1,"originReadsBeforeRelease",1,"originReadsAfterRecovery",source.fullReads.get(),"expiredOriginNotCached",true,"ownedKeysDeleted",true));
    }
    @Test void tenantAndVersionKeysKeepNewRevisionIndependentOfDelayedOldLoad() throws Exception {
        var cache=actualCache();var source=new ControlledSource();source.create("alice","same","Old");source.create("bob","same","Other tenant");
        var entered=new CountDownLatch(1);var release=new CountDownLatch(1);
        source.afterRead=ticket->{if(ticket.tenant().equals("tenant-a") && ticket.version()==1){entered.countDown();gate(release);}};
        var callers=Executors.newSingleThreadExecutor();var loads=loads(3,6,3000);
        var service=new CacheAsideTickets(source,cache,cache.namespace(),10000,loads);
        String old=service.key("alice","same",1),current=service.key("alice","same",2),other=service.key("bob","same",1);
        try (cache; loads) {
            var delayed=callers.submit(()->service.find("alice","same"));assertTrue(entered.await(2,TimeUnit.SECONDS));
            assertTrue(service.rename("alice","same",1,"New").invalidated());
            assertEquals("New",service.find("alice","same").orElseThrow().ticket().title());
            assertEquals("Other tenant",service.find("bob","same").orElseThrow().ticket().title());
            release.countDown();assertEquals(1,delayed.get(3,TimeUnit.SECONDS).orElseThrow().ticket().version());
            assertTrue(cache.read(old).isPresent(),"Late old population is allowed but cannot select the new revision");
            assertEquals(2,service.find("alice","same").orElseThrow().ticket().version());assertEquals(3,source.fullReads.get());
            assertThrows(SecurityException.class,()->service.find("mallory","same"));
        } finally {release.countDown();stop(callers);cache.close();}
        deleted(cache,old,current,other);cases.put("tenant-version",Map.of("independentOriginReads",source.fullReads.get(),"lateOldVersion",1,"subsequentCurrentVersion",2,"tenantIsolation",true,"ownedKeysDeleted",true));
    }
    @Test void twoCoordinatorInstancesStillPerformTwoColdOriginReads() throws Exception {
        var cache=actualCache();var source=new ControlledSource();source.create("alice","one","Original");
        var entered=new CountDownLatch(2);var release=new CountDownLatch(1);
        source.afterRead=ticket->{entered.countDown();gate(release);};
        var callers=Executors.newFixedThreadPool(2);var a=loads(1,4,3000);var b=loads(1,4,3000);
        var first=new CacheAsideTickets(source,cache,cache.namespace(),10000,a);
        var second=new CacheAsideTickets(source,cache,cache.namespace(),10000,b);String key=first.key("alice","one",1);
        try (cache; a; b) {
            var one=callers.submit(()->first.find("alice","one"));var two=callers.submit(()->second.find("alice","one"));
            assertTrue(entered.await(2,TimeUnit.SECONDS));assertEquals(2,source.fullReads.get());release.countDown();
            assertEquals("Original",one.get(3,TimeUnit.SECONDS).orElseThrow().ticket().title());assertEquals("Original",two.get(3,TimeUnit.SECONDS).orElseThrow().ticket().title());
            assertEquals(1,a.snapshot().started());assertEquals(1,b.snapshot().started());
        } finally {release.countDown();stop(callers);cache.close();}
        deleted(cache,key);cases.put("coordination-scope",Map.of("coordinatorInstances",2,"originFullReads",source.fullReads.get(),"sharedRedis",true,"distributedLock",false,"ownedKeysDeleted",true));
    }
    @AfterAll static void writeActualEvidence() throws Exception {
        var report=new Document("schemaVersion",1).append("evidence","actual-redis-controlled-origin")
                .append("redisVersion",redisVersion).append("javaRuntime",Runtime.version().toString())
                .append("actualCasesExecuted",cases.size()).append("cases",cases)
                .append("scope","Actual authenticated Redis; controlled original origin, no MongoDB, cross-process lock, load benchmark or production capacity claim.");
        String data=report.toJson();assertTrue(data.length()<16384);
        Files.createDirectories(Path.of("target"));Files.writeString(Path.of("target/cache-recovery-evidence.json"),data);
    }
}
