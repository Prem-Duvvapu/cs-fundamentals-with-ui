package com.csfundamentals.persistencelab;

import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.persistencelab.PgEvidence.*;

@EnabledIfEnvironmentVariable(named="PERSISTENCE_TESTS",matches="true")
@Timeout(35)
class PostgresIsolationTest {
    @Test void actualSnapshotsSeparateDirtyNonrepeatableAndPhantomReadsOnPostgresql16() throws Exception {
        List<Map<String,Object>> histories=new ArrayList<>();
        long serverVersion;
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment())) {
            try(Connection setup=database.connection()) {
                serverVersion=number(setup,"SHOW server_version_num"); assertTrue(serverVersion>=160000 && serverVersion<170000);
                sql(setup,"CREATE TABLE readings(id INT PRIMARY KEY,value INT NOT NULL)");
            }
            for(int level:List.of(Connection.TRANSACTION_READ_UNCOMMITTED,Connection.TRANSACTION_READ_COMMITTED,
                                 Connection.TRANSACTION_REPEATABLE_READ,Connection.TRANSACTION_SERIALIZABLE)) {
                try(Connection reader=database.connection();Connection writer=database.connection()) {
                    sql(writer,"TRUNCATE readings; INSERT INTO readings VALUES(1,10)");
                    begin(reader,level);
                    String actualLevel=text(reader,"SHOW transaction_isolation");
                    assertEquals(10,number(reader,"SELECT value FROM readings WHERE id=1"));
                    assertEquals(1,number(reader,"SELECT count(*) FROM readings WHERE value>=10"));
                    begin(writer,Connection.TRANSACTION_READ_COMMITTED);
                    sql(writer,"UPDATE readings SET value=20 WHERE id=1; INSERT INTO readings VALUES(2,30)");
                    long uncommittedValue=number(reader,"SELECT value FROM readings WHERE id=1");
                    long uncommittedCount=number(reader,"SELECT count(*) FROM readings WHERE value>=10");
                    assertEquals(10,uncommittedValue); assertEquals(1,uncommittedCount);
                    writer.commit();
                    long reread=number(reader,"SELECT value FROM readings WHERE id=1");
                    long recount=number(reader,"SELECT count(*) FROM readings WHERE value>=10");
                    boolean statementSnapshots=level==Connection.TRANSACTION_READ_UNCOMMITTED || level==Connection.TRANSACTION_READ_COMMITTED;
                    assertEquals(statementSnapshots?20:10,reread); assertEquals(statementSnapshots?2:1,recount);
                    reader.commit();
                    assertEquals(20,number(reader,"SELECT value FROM readings WHERE id=1"));
                    reader.commit();
                    histories.add(Map.of("requestedJdbcLevel",level,"actualServerSetting",actualLevel,
                        "uncommittedValue",uncommittedValue,"uncommittedCount",uncommittedCount,
                        "afterOtherCommitValue",reread,"afterOtherCommitCount",recount,"freshTransactionValue",20));
                }
            }
        }
        write("isolation",Map.of("histories",histories,"postgresReadUncommittedUsesReadCommittedBehavior",true,
            "postgresRepeatableReadPreventsThesePhantoms",true,"ownedSchemaRemoved",true,
            "runtime",Map.of("serverVersionNum",serverVersion,"javaFeature",Runtime.version().feature(),
                "javaRuntime",Runtime.version().toString(),"postgresJdbc",org.postgresql.Driver.getVersion())));
    }

    @Test void repeatableReadWriteSkewBecomesSerializableAbortThenFreshWholeTransactionRetry() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment())) {
            try(Connection setup=database.connection()) { sql(setup,"CREATE TABLE duty(id INT PRIMARY KEY,active BOOLEAN NOT NULL); INSERT INTO duty VALUES(1,true),(2,true)"); }
            try(Connection first=database.connection();Connection second=database.connection()) {
                begin(first,Connection.TRANSACTION_REPEATABLE_READ); begin(second,Connection.TRANSACTION_REPEATABLE_READ);
                assertEquals(2,number(first,"SELECT count(*) FROM duty WHERE active"));
                assertEquals(2,number(second,"SELECT count(*) FROM duty WHERE active"));
                sql(first,"UPDATE duty SET active=false WHERE id=1"); first.commit();
                sql(second,"UPDATE duty SET active=false WHERE id=2"); second.commit();
                assertEquals(0,number(first,"SELECT count(*) FROM duty WHERE active")); first.commit();
            }
            try(Connection setup=database.connection()) { sql(setup,"UPDATE duty SET active=true"); }
            ExecutorService worker=Executors.newSingleThreadExecutor();
            CountDownLatch readBoth=new CountDownLatch(1), firstCommitted=new CountDownLatch(1);
            TransactionRetry.Result<Long> outcome; AtomicBoolean rejectedFailedTransaction=new AtomicBoolean();
            try(Connection first=database.connection()) {
                begin(first,Connection.TRANSACTION_SERIALIZABLE);
                assertEquals(2,number(first,"SELECT count(*) FROM duty WHERE active"));
                Future<TransactionRetry.Result<Long>> second=worker.submit(()->TransactionRetry.run(database,Connection.TRANSACTION_SERIALIZABLE,3,(connection,attempt)->{
                    long active=number(connection,"SELECT count(*) FROM duty WHERE active");
                    if(attempt==1) { assertEquals(2,active); readBoth.countDown(); await(firstCommitted); }
                    if(active>1) {
                        try { sql(connection,"UPDATE duty SET active=false WHERE id=2"); }
                        catch(SQLException failure) {
                            assertEquals("40001",failure.getSQLState());
                            assertEquals("25P02",assertThrows(SQLException.class,()->number(connection,"SELECT 1")).getSQLState());
                            rejectedFailedTransaction.set(true);
                            throw failure;
                        }
                    }
                    return active;
                }));
                try {
                    await(readBoth); sql(first,"UPDATE duty SET active=false WHERE id=1"); first.commit(); firstCommitted.countDown();
                    outcome=second.get(8,TimeUnit.SECONDS);
                } finally { firstCommitted.countDown(); }
                assertTrue(rejectedFailedTransaction.get(),"Observe the failed transaction before rollback");
                assertEquals(1L,outcome.value().longValue());
                assertEquals(List.of("40001","COMMITTED"),outcome.attempts().stream().map(TransactionRetry.Attempt::outcome).toList());
                assertEquals(2,outcome.attempts().stream().map(TransactionRetry.Attempt::transactionId).distinct().count());
                assertEquals(1,number(first,"SELECT count(*) FROM duty WHERE active")); first.commit();
            } finally { firstCommitted.countDown(); stop(worker); }
            write("serialization-retry",Map.of("repeatableReadBothCommittedActive",0,"serializableFinalActive",1,
                "failedTransactionRejectsFurtherSql","25P02","attempts",attempts(outcome.attempts()),"ownedWorkersJoined",true));
        }
    }

    @Test void repeatedActualSerializationConflictsStopAtCapAndUniqueViolationsNeverRetry() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment())) {
            try(Connection setup=database.connection()) { sql(setup,"CREATE TABLE revisions(id INT PRIMARY KEY,value INT NOT NULL); INSERT INTO revisions VALUES(1,0)"); }
            ExecutorService worker=Executors.newSingleThreadExecutor();
            ArrayBlockingQueue<Integer> ready=new ArrayBlockingQueue<>(1); Semaphore advance=new Semaphore(0);
            TransactionRetry.Failed failure;
            try(Connection writer=database.connection()) {
                Future<TransactionRetry.Failed> stopped=worker.submit(()->assertThrows(TransactionRetry.Failed.class,()->
                    TransactionRetry.run(database,Connection.TRANSACTION_SERIALIZABLE,3,(connection,attempt)->{
                        number(connection,"SELECT value FROM revisions WHERE id=1");
                        assertTrue(ready.offer(attempt,2,TimeUnit.SECONDS)); assertTrue(advance.tryAcquire(2,TimeUnit.SECONDS));
                        sql(connection,"UPDATE revisions SET value=value+100 WHERE id=1"); return 0;
                    })));
                try {
                    for(int attempt=1;attempt<=3;attempt++) {
                        assertEquals(attempt,ready.poll(3,TimeUnit.SECONDS));
                        sql(writer,"UPDATE revisions SET value=value+1 WHERE id=1"); advance.release();
                    }
                    failure=stopped.get(5,TimeUnit.SECONDS);
                } finally { advance.release(3); }
                assertEquals("40001",failure.getSQLState()); assertEquals(3,failure.attempts().size());
                assertTrue(failure.attempts().stream().allMatch(item->item.outcome().equals("40001")));
                assertEquals(3,failure.attempts().stream().map(TransactionRetry.Attempt::transactionId).distinct().count());
                assertEquals(3,number(writer,"SELECT value FROM revisions WHERE id=1"));
            } finally { advance.release(3); stop(worker); }
            TransactionRetry.Failed unique=assertThrows(TransactionRetry.Failed.class,()->TransactionRetry.run(database,Connection.TRANSACTION_READ_COMMITTED,3,(connection,attempt)->{
                sql(connection,"INSERT INTO revisions VALUES(1,999)"); return 0;
            }));
            assertEquals("23505",unique.getSQLState()); assertEquals(1,unique.attempts().size());
            assertFalse(TransactionRetry.knownAborted("08006")); assertFalse(TransactionRetry.knownAborted("55P03"));
            write("retry-exhaustion",Map.of("serializationAttempts",attempts(failure.attempts()),"preservedWinnerValue",3,
                "nonretryableState",unique.getSQLState(),"nonretryableAttempts",unique.attempts().size(),
                "unknownConnectionOutcomeNotRetried",true,"lockTimeoutNotAutomaticallyRetried",true));
        }
    }
}
