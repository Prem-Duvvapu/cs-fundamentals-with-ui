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
    @Test void crossTenantPayloadUnderWrongKeyIsRejectedOnActualServices() {
        try(var source=MongoIntegrationTests.source();var cache=RedisIntegrationTests.cache()) {
            source.create("alice","one","Alice original","high"); var bob=source.create("bob","one","Bob private","high");
            var service=new CacheAsideTickets(source,cache,cache.namespace(),10000);
            cache.put(service.key("alice","one",1),bob.document().toJson(),10000);
            assertEquals("Alice original",service.find("alice","one").orElseThrow().ticket().title());
        }
    }
}
