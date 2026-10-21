package com.csfundamentals.dataservices;

import java.net.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="DATA_SERVICES_INTEGRATION",matches="1")
class CacheMongoIntegrationTests {
    @Test void realRedisCacheAsideHitThenCommittedMongoUpdateInvalidatesOldVersion() {
        try(var source=MongoIntegrationTests.source();var cache=RedisIntegrationTests.cache()) {
            source.create("alice","same","Alice original","high"); source.create("bob","same","Bob private","high");
            var service=new CacheAsideTickets(source,cache,cache.namespace(),10000);
            assertEquals("miss-filled",service.find("alice","same").orElseThrow().cacheState());
            assertEquals("hit-verified-version",service.find("alice","same").orElseThrow().cacheState());
            assertEquals("Bob private",service.find("bob","same").orElseThrow().ticket().title());
            assertTrue(service.rename("alice","same",1,"Alice updated").invalidated());
            assertTrue(cache.read(service.key("alice","same",1)).isEmpty());
            assertEquals("Alice updated",service.find("alice","same").orElseThrow().ticket().title());
        }
    }
    @Test void failedRedisInvalidationLeavesOldBytesButCurrentMongoVersionPreventsStaleReturn() throws Exception {
        try(var source=MongoIntegrationTests.source();var healthy=RedisIntegrationTests.cache();var reserved=new ServerSocket()) {
            source.create("alice","one","Original","high");
            var working=new CacheAsideTickets(source,healthy,healthy.namespace(),10000); working.find("alice","one");
            reserved.bind(new InetSocketAddress("127.0.0.1",0));
            try(var unavailable=new RedisCache("127.0.0.1",reserved.getLocalPort(),java.util.UUID.randomUUID().toString(),healthy.namespace())) {
                var degraded=new CacheAsideTickets(source,unavailable,healthy.namespace(),10000);
                assertFalse(degraded.rename("alice","one",1,"New").invalidated());
                assertTrue(healthy.read(working.key("alice","one",1)).isPresent());
                var observed=degraded.find("alice","one").orElseThrow();
                assertEquals("New",observed.ticket().title()); assertEquals("bypass-redis-unavailable",observed.cacheState());
            }
            assertEquals("New",working.find("alice","one").orElseThrow().ticket().title());
        }
    }
    @Test void coalescedColdReadsUseActualMongoAuthorityAndKeepVersionFreshness() throws Exception {
        try(var source=MongoIntegrationTests.source();var cache=RedisIntegrationTests.cache();
            var loads=new CoalescedLoads(2,8,java.time.Duration.ofSeconds(3))) {
            source.create("alice","one","Original","high");
            var fullReads=new java.util.concurrent.atomic.AtomicInteger();
            var entered=new java.util.concurrent.CountDownLatch(1);var release=new java.util.concurrent.CountDownLatch(1);
            TicketSource counted=new TicketSource() {
                public java.util.OptionalLong version(String principal,String id){return source.version(principal,id);}
                public java.util.Optional<Ticket> find(String principal,String id){
                    fullReads.incrementAndGet();entered.countDown();CacheRecoveryRedisTests.gate(release);return source.find(principal,id);
                }
                public Ticket rename(String principal,String id,long version,String title){return source.rename(principal,id,version,title);}
            };
            var service=new CacheAsideTickets(counted,cache,cache.namespace(),10000,loads);
            var callers=java.util.concurrent.Executors.newFixedThreadPool(6);
            try {
                var futures=CacheRecoveryRedisTests.burst(callers,service,6);
                assertTrue(entered.await(2,java.util.concurrent.TimeUnit.SECONDS));
                CacheRecoveryRedisTests.await(()->loads.snapshot().joined()==5);release.countDown();
                for(var future:futures)assertEquals("Original",future.get(3,java.util.concurrent.TimeUnit.SECONDS).orElseThrow().ticket().title());
                assertEquals(1,fullReads.get());assertTrue(service.rename("alice","one",1,"New").invalidated());
                assertEquals(2,service.find("alice","one").orElseThrow().ticket().version());assertEquals(2,fullReads.get());
            } finally {release.countDown();CacheRecoveryRedisTests.stop(callers);}
        }
    }
    @Test void crossTenantPayloadUnderWrongKeyIsRejectedOnActualServices() {
        try(var source=MongoIntegrationTests.source();var cache=RedisIntegrationTests.cache()) {
            source.create("alice","one","Alice original","high"); var bob=source.create("bob","one","Bob private","high");
            var service=new CacheAsideTickets(source,cache,cache.namespace(),10000);
            cache.put(service.key("alice","one",1),bob.document().toJson(),10000);
            assertEquals("Alice original",service.find("alice","one").orElseThrow().ticket().title());
        }
    }
}
