package com.csfundamentals.messaging;

import java.nio.file.*;
import java.sql.*;
import java.util.*;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.messaging.DurableSaga.State.*;
import static com.csfundamentals.messaging.DurableSagaParticipant.Fault.*;
import static com.csfundamentals.messaging.DurableSagaParticipant.Outcome.*;

@Timeout(40)
class DurableSagaTest {
    @TempDir Path directory;
    private final String password=UUID.randomUUID().toString();
    private final SagaRequest request=new SagaRequest("tenant-a","order-1","widget",2,1200);
    private record SystemUnderTest(DurableSaga saga,DurableSagaParticipant inventory,DurableSagaParticipant payment) {}
    private SystemUnderTest reopen(Path path) throws Exception {
        var inventory=new DurableSagaParticipant(path.resolve("inventory"),password,DurableSagaParticipant.Kind.INVENTORY);
        var payment=new DurableSagaParticipant(path.resolve("payment"),password,DurableSagaParticipant.Kind.PAYMENT);
        return new SystemUnderTest(new DurableSaga(path.resolve("coordinator"),password,inventory,payment),inventory,payment);
    }
    private SystemUnderTest reopen() throws Exception {return reopen(directory);}
    private DurableSaga.Snapshot drive(Path path) throws Exception {
        for(int count=0;count<8;count++) {
            var reopened=reopen(path);var result=reopened.saga().get(request.tenant(),request.id());
            if(result.terminal())return result;
            reopened.saga().tick(request.tenant(),request.id());
        }
        throw new AssertionError("Bounded driver did not reach a terminal/manual state");
    }
    @Test void durableIntentPrecedesEffectsAndExactRequestIsIdempotent() throws Exception {
        var system=reopen();var first=system.saga().start(request);
        assertEquals(RESERVE_PENDING,first.state());assertEquals(first,reopen().saga().start(request));
        assertEquals(0,system.inventory().effects("reserve"));assertEquals(0,system.payment().effects("charge"));
        assertThrows(DurableSaga.Conflict.class,()->reopen().saga().start(new SagaRequest("tenant-a","order-1","widget",3,1200)));
    }
    @Test void successSurvivesReopeningEveryStepAndTerminalReplayHasNoNewEffects() throws Exception {
        reopen().saga().start(request);assertEquals(CONFIRMED,drive(directory).state());
        var system=reopen();assertEquals(8,system.inventory().stock("tenant-a"));assertEquals(1200,system.payment().captured("tenant-a"));
        assertEquals(1,system.inventory().effects("reserve"));assertEquals(1,system.payment().effects("charge"));
        for(int i=0;i<3;i++)assertEquals(CONFIRMED,reopen().saga().tick("tenant-a","order-1").state());
        assertEquals(1200,reopen().payment().captured("tenant-a"));
    }
    @Test void missingInventoryIsDurablyRejectedWithoutCallingPayment() throws Exception {
        var missing=new SagaRequest("tenant-a","order-1","unknown",2,1200);
        reopen().saga().start(missing);assertEquals(REJECTED,drive(directory).state());
        assertEquals(0,reopen().payment().effects("charge"));assertEquals(10,reopen().inventory().stock("tenant-a"));
    }
    @Test void persistedPaymentDeclineTriggersExactInventoryCompensation() throws Exception {
        var system=reopen();system.saga().start(request);system.payment().fault(request,"charge",DECLINE,1);
        assertEquals(COMPENSATED,drive(directory).state());
        assertEquals(10,reopen().inventory().stock("tenant-a"));assertEquals(0,reopen().payment().captured("tenant-a"));
        assertEquals(1,reopen().inventory().effects("release"));
    }
    @Test void timeoutAfterReservationCommitReconcilesStoredReceiptWithoutAnotherReserve() throws Exception {
        var system=reopen();system.saga().start(request);system.inventory().fault(request,"reserve",TIMEOUT_AFTER_COMMIT,1);
        var uncertain=system.saga().tick("tenant-a","order-1");
        assertEquals(RESERVE_PENDING,uncertain.state());assertEquals(1,uncertain.failures());assertEquals(8,reopen().inventory().stock("tenant-a"));
        assertEquals(CONFIRMED,drive(directory).state());assertEquals(1,reopen().inventory().effects("reserve"));
    }
    @Test void timeoutAfterChargeCommitMustNotBeMisreadAsADeclineOrRelease() throws Exception {
        var system=reopen();system.saga().start(request);system.saga().tick("tenant-a","order-1");
        system.payment().fault(request,"charge",TIMEOUT_AFTER_COMMIT,1);
        assertEquals(PAYMENT_PENDING,system.saga().tick("tenant-a","order-1").state());
        assertEquals(1200,reopen().payment().captured("tenant-a"));assertEquals(0,reopen().inventory().effects("release"));
        assertEquals(CONFIRMED,drive(directory).state());assertEquals(1,reopen().payment().effects("charge"));
    }
    @Test void timeoutAfterCompensationCommitReconcilesWithoutAddingStockTwice() throws Exception {
        var system=reopen();system.saga().start(request);system.payment().fault(request,"charge",DECLINE,1);
        system.saga().tick("tenant-a","order-1");system.saga().tick("tenant-a","order-1");
        system.inventory().fault(request,"release",TIMEOUT_AFTER_COMMIT,1);
        assertEquals(RELEASE_PENDING,system.saga().tick("tenant-a","order-1").state());
        assertEquals(10,reopen().inventory().stock("tenant-a"));
        assertEquals(COMPENSATED,drive(directory).state());assertEquals(1,reopen().inventory().effects("release"));
    }
    @Test void compensationOutageHitsPersistedRetryLimitAndRequiresVersionCheckedReview() throws Exception {
        var system=reopen();system.saga().start(request);system.payment().fault(request,"charge",DECLINE,1);
        system.saga().tick("tenant-a","order-1");system.saga().tick("tenant-a","order-1");
        system.inventory().fault(request,"release",LOOKUP_UNAVAILABLE,3);
        for(int i=0;i<3;i++)reopen().saga().tick("tenant-a","order-1");
        var manual=reopen().saga().get("tenant-a","order-1");
        assertEquals(MANUAL_REVIEW,manual.state());assertEquals(RELEASE_PENDING,manual.resumeState());assertEquals(3,manual.failures());
        assertEquals(manual,reopen().saga().tick("tenant-a","order-1"));assertEquals(8,reopen().inventory().stock("tenant-a"));
        assertThrows(DurableSaga.Conflict.class,()->reopen().saga().resumeAfterReview("tenant-a","order-1",manual.version()-1,"dependency recovered"));
        reopen().saga().resumeAfterReview("tenant-a","order-1",manual.version(),"dependency recovered");
        assertEquals(COMPENSATED,drive(directory).state());assertEquals(10,reopen().inventory().stock("tenant-a"));
        assertEquals("dependency recovered",reopen().saga().get("tenant-a","order-1").reviewNote());
    }
    @Test void compensationBindsExactReservationPayloadAndTenant() throws Exception {
        var system=reopen();system.inventory().execute(request,"reserve");
        var altered=new SagaRequest("tenant-a","order-1","widget",3,1200);
        assertThrows(DurableSagaParticipant.BindingConflict.class,()->system.inventory().execute(altered,"release"));
        var otherTenant=new SagaRequest("tenant-b","order-1","widget",2,1200);
        assertThrows(IllegalStateException.class,()->system.inventory().execute(otherTenant,"release"));
        assertEquals(8,system.inventory().stock("tenant-a"));assertEquals(10,system.inventory().stock("tenant-b"));
        assertEquals(RELEASED,system.inventory().execute(request,"release"));assertEquals(RELEASED,reopen().inventory().execute(request,"release"));
        assertEquals(10,reopen().inventory().stock("tenant-a"));
    }
    @Test void actualJdbcLockTimeoutPreservesIntentAndEventuallyRequestsReview() throws Exception {
        var system=reopen();system.saga().start(request);
        String url="jdbc:h2:file:"+directory.resolve("inventory").toAbsolutePath()+";WRITE_DELAY=0;LOCK_TIMEOUT=1000";
        try(var holder=DriverManager.getConnection(url,"lab",password);var lock=holder.createStatement()) {
            holder.setAutoCommit(false);lock.executeUpdate("UPDATE saga_resources SET stock=stock WHERE id='tenant-a:widget'");
            for(int i=0;i<3;i++)system.saga().tick("tenant-a","order-1");
            assertEquals(MANUAL_REVIEW,reopen().saga().get("tenant-a","order-1").state());
            holder.rollback();
        }
        assertEquals(10,reopen().inventory().stock("tenant-a"));assertEquals(0,reopen().payment().effects("charge"));
    }
    @Test void realOwnedJvmHaltsAfterEachCommittedParticipantBoundaryAndReconciles() throws Exception {
        for(var crash:List.of(DurableSaga.Crash.AFTER_RESERVE_COMMIT,DurableSaga.Crash.AFTER_PAYMENT_COMMIT,DurableSaga.Crash.AFTER_RELEASE_COMMIT)) {
            Path path=Files.createDirectory(directory.resolve(crash.name().toLowerCase(Locale.ROOT)));
            var system=reopen(path);system.saga().start(request);
            if(crash==DurableSaga.Crash.AFTER_RELEASE_COMMIT)system.payment().fault(request,"charge",DECLINE,1);
            String classpath=System.getProperty("surefire.test.class.path",System.getProperty("java.class.path"));
            var builder=new ProcessBuilder(Path.of(System.getProperty("java.home"),"bin","java").toString(),"-Xmx96m","-cp",classpath,
                    SagaCrashWorker.class.getName(),path.toString(),crash.name());
            builder.environment().put("SAGA_LAB_PASSWORD",password);
            var output=path.resolve("owned-worker.log");builder.redirectErrorStream(true).redirectOutput(output.toFile());
            var process=builder.start();
            try {
                assertTrue(process.waitFor(15,TimeUnit.SECONDS),"Owned saga child deadline");
                assertEquals(93,process.exitValue(),Files.readString(output));
                assertTrue(Files.readString(output).contains("OWNED_WORKER_HALTING_AFTER="+crash));
            } finally {
                if(process.isAlive()) {process.destroy();if(!process.waitFor(2,TimeUnit.SECONDS)) {process.destroyForcibly();process.waitFor(2,TimeUnit.SECONDS);}}
            }
            assertEquals(crash==DurableSaga.Crash.AFTER_RELEASE_COMMIT?COMPENSATED:CONFIRMED,drive(path).state());
            assertEquals(1,reopen(path).inventory().effects("reserve"));
            assertEquals(crash==DurableSaga.Crash.AFTER_RELEASE_COMMIT?10:8,reopen(path).inventory().stock("tenant-a"));
            assertEquals(crash==DurableSaga.Crash.AFTER_RELEASE_COMMIT?0:1200,reopen(path).payment().captured("tenant-a"));
        }
    }
}
