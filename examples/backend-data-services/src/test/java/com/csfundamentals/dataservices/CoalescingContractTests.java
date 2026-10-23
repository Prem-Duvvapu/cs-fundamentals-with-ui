package com.csfundamentals.dataservices;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

/** Coordinator contracts only; these cases do not establish Redis behavior. */
class CoalescingContractTests {
    @Test void admissionConfigurationIsFiniteAndClosedCoordinatorRejectsNewWork() {
        for (int[] invalid:List.of(new int[]{0,1},new int[]{9,9},new int[]{2,1},new int[]{1,65}))
            assertThrows(IllegalArgumentException.class,()->new CoalescedLoads(invalid[0],invalid[1],Duration.ofSeconds(1)));
        assertThrows(IllegalArgumentException.class,()->new CoalescedLoads(1,2,Duration.ofSeconds(6)));
        var loads=new CoalescedLoads(1,2,Duration.ofSeconds(1));loads.close();
        assertThrows(CoalescedLoads.Closed.class,()->loads.load("owned-key",budget->Optional.empty()));
        assertEquals(0,loads.snapshot().waitingCallers());
    }
    @Test void optionalCoordinatorPreservesRedisBypassAndUnverifiableAuthorityFailure() {
        var source=new CacheContractTests.FakeSource();var cache=new CacheContractTests.FakeCache();
        source.create("alice","one","Original");cache.down=true;
        try(var loads=new CoalescedLoads(1,4,Duration.ofSeconds(1))) {
            var service=new CacheAsideTickets(source,cache,LocalServices.namespace(),1000,loads);
            assertEquals("bypass-redis-unavailable",service.find("alice","one").orElseThrow().cacheState());
            source.down=true;assertThrows(TicketSource.Unavailable.class,()->service.find("alice","one"));
            source.down=false;cache.down=false;assertEquals("Original",service.find("alice","one").orElseThrow().ticket().title());
            assertThrows(SecurityException.class,()->service.find("mallory","one"));
        }
    }
    @Test void sameOriginalFailureReachesCallerAndThreadContextDoesNotTransfer() {
        var failure=new SecurityException("original-only-local-fixture");
        try(var loads=new CoalescedLoads(1,2,Duration.ofSeconds(1))) {
            assertSame(failure,assertThrows(SecurityException.class,()->loads.load("owned-key",budget->{throw failure;})));
            assertFalse(Thread.currentThread().isInterrupted());
        }
    }
    @Test void interruptedWaiterKeepsInterruptAndCannotCancelAnotherCallersSharedLoad() throws Exception {
        var release=new CountDownLatch(1);var entered=new CountDownLatch(1);var interrupted=new AtomicBoolean();
        var loads=new CoalescedLoads(1,2,Duration.ofSeconds(3));var callers=Executors.newSingleThreadExecutor();
        Thread waiter=null;
        try(loads) {
            var leader=callers.submit(()->loads.load("owned-key",budget->{entered.countDown();CacheRecoveryRedisTests.gate(release);return Optional.empty();}));
            assertTrue(entered.await(1,TimeUnit.SECONDS));
            waiter=new Thread(()->{
                assertThrows(CoalescedLoads.Cancelled.class,()->loads.load("owned-key",budget->{fail("Waiter cannot start a second load");return Optional.empty();}));
                interrupted.set(Thread.currentThread().isInterrupted());
            });waiter.start();CacheRecoveryRedisTests.await(()->loads.snapshot().joined()==1);
            waiter.interrupt();waiter.join(1000);assertFalse(waiter.isAlive());assertTrue(interrupted.get());
            assertFalse(leader.isDone());release.countDown();assertTrue(leader.get(1,TimeUnit.SECONDS).isEmpty());
            assertEquals(1,loads.snapshot().started());
        } finally {
            release.countDown();if(waiter!=null){waiter.interrupt();waiter.join(1000);assertFalse(waiter.isAlive());}
            callers.shutdownNow();assertTrue(callers.awaitTermination(2,TimeUnit.SECONDS));
        }
    }
}
