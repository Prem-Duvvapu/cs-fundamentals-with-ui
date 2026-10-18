package com.csfundamentals.dataservices;

import java.nio.channels.SocketChannel;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="DATA_REDIS_INTEGRATION",matches="1")
class RedisIntegrationTests {
    static RedisCache cache() {
        return new RedisCache("127.0.0.1",Integer.parseInt(Objects.requireNonNull(System.getenv("DATA_REDIS_PORT"))),
                Objects.requireNonNull(System.getenv("DATA_REDIS_PASSWORD")),LocalServices.namespace());
    }
    @Test void realRedisTypesTenantKeysAndAtomicExpiryMetadata() throws Exception {
        try(var cache=cache()) {
            String key=cache.namespace()+":ticket:tenant-a:one:v1";
            cache.put(key,"original",250);
            var first=cache.read(key).orElseThrow();
            assertEquals("original",first.json()); assertTrue(first.remainingTtlMs()>0 && first.remainingTtlMs()<=250);
            assertEquals("string",cache.type(key));
            assertTrue(cache.read(cache.namespace()+":ticket:tenant-b:one:v1").isEmpty());
            long deadline=System.nanoTime()+TimeUnit.SECONDS.toNanos(3);
            while(cache.read(key).isPresent() && System.nanoTime()<deadline) Thread.sleep(20);
            assertTrue(cache.read(key).isEmpty()); assertEquals("none",cache.type(key));
        }
    }
    @Test void luaCounterAndExpiryAreAtomicUnderConcurrentCalls() throws Exception {
        try(var cache=cache()) {
            var executor=Executors.newFixedThreadPool(4);
            try {
                var futures=new ArrayList<Future<List<Long>>>();
                for(int worker=0;worker<4;worker++) futures.add(executor.submit(()->{
                    var values=new ArrayList<Long>();
                    for(int i=0;i<10;i++) {
                        var count=cache.increment("alice",10000);
                        assertTrue(count.remainingTtlMs()>0 && count.remainingTtlMs()<=10000);
                        values.add(count.count());
                    }
                    return values;
                }));
                var values=new HashSet<Long>();
                for(var result:futures)values.addAll(result.get(8,TimeUnit.SECONDS));
                assertEquals(java.util.stream.LongStream.rangeClosed(1,40).boxed().collect(java.util.stream.Collectors.toSet()),values);
                assertEquals(1,cache.increment("bob",10000).count());
                var before=cache.increment("alice",10000); assertEquals(41,before.count());
                Thread.sleep(100);
                var after=cache.increment("alice",10000); assertEquals(42,after.count());
                assertTrue(after.remainingTtlMs()<=before.remainingTtlMs()-50,"later increments must not reset expiry");
            } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(3,TimeUnit.SECONDS)); }
        }
    }
    @Test void actualConnectionRefusalAndBadAuthenticationAreBounded() throws Exception {
        // Keep the local port bound but not listening, so no unrelated listener can claim it.
        try(var reserved=SocketChannel.open()) {
            reserved.bind(new java.net.InetSocketAddress("127.0.0.1",0));
            try(var cache=new RedisCache("127.0.0.1",reserved.socket().getLocalPort(),UUID.randomUUID().toString(),LocalServices.namespace())) {
                assertThrows(CachePort.Unavailable.class,()->cache.read(cache.namespace()+":ticket:tenant-a:one:v1"));
            }
        }
        try(var cache=new RedisCache("127.0.0.1",Integer.parseInt(System.getenv("DATA_REDIS_PORT")),UUID.randomUUID().toString(),LocalServices.namespace())) {
            assertThrows(CachePort.Unavailable.class,()->cache.read(cache.namespace()+":ticket:tenant-a:one:v1"));
        }
    }
    @Test void cleanupDeletesOnlyTrackedKeysAndForeignKeysAreRejected() {
        var first=cache();
        try(var second=cache()) {
            String a=first.namespace()+":ticket:tenant-a:one:v1", b=second.namespace()+":ticket:tenant-a:one:v1";
            first.put(a,"first",10000); second.put(b,"second",10000);
            assertThrows(IllegalArgumentException.class,()->first.remove(b));
            first.close();
            assertTrue(first.read(a).isEmpty()); assertEquals("second",second.read(b).orElseThrow().json());
        } finally { first.close(); }
    }
}
