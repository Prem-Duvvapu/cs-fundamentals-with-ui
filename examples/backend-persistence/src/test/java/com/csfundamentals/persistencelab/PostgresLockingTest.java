package com.csfundamentals.persistencelab;

import java.sql.*;
import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.persistencelab.PgEvidence.*;

@EnabledIfEnvironmentVariable(named="PERSISTENCE_TESTS",matches="true")
@Timeout(35)
class PostgresLockingTest {
    record Worker(int pid,String outcome) { }
    record Cas(List<String> transactions,List<Integer> changedRows) { }

    @Test void actualWaitCycleChoosesOneDeadlockVictimThenConsistentOrderRepairsIt() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment(),3);Connection observer=database.connection()) {
            sql(observer,"CREATE TABLE locks(id INT PRIMARY KEY,value INT NOT NULL); INSERT INTO locks VALUES(1,0),(2,0)");
            ExecutorService workers=Executors.newFixedThreadPool(2);
            ArrayBlockingQueue<Integer> aReady=new ArrayBlockingQueue<>(1), bReady=new ArrayBlockingQueue<>(1);
            CountDownLatch secondLocks=new CountDownLatch(1);
            List<String> outcomes;
            try {
                Future<Worker> a=workers.submit(()->opposite(database,1,2,aReady,secondLocks));
                Future<Worker> b=workers.submit(()->opposite(database,2,1,bReady,secondLocks));
                Integer aPid=aReady.poll(2,TimeUnit.SECONDS),bPid=bReady.poll(2,TimeUnit.SECONDS);
                assertNotNull(aPid); assertNotNull(bPid); assertNotEquals(aPid,bPid);
                secondLocks.countDown();
                boolean cycle=false; long deadline=System.nanoTime()+TimeUnit.MILLISECONDS.toNanos(1500);
                do {
                    if(blockedBy(observer,aPid,bPid) && blockedBy(observer,bPid,aPid)) { cycle=true; break; }
                    Thread.sleep(5);
                } while(System.nanoTime()<deadline);
                assertTrue(cycle,"Both actual owned blockers must form a cycle before PostgreSQL selects its victim");
                outcomes=List.of(a.get(5,TimeUnit.SECONDS).outcome(),b.get(5,TimeUnit.SECONDS).outcome()).stream().sorted().toList();
                assertEquals(List.of("40P01","COMMITTED"),outcomes);
                assertEquals(List.of(1,1),ids(observer,"SELECT value FROM locks ORDER BY id"));
            } finally { secondLocks.countDown(); stop(workers); }

            sql(observer,"UPDATE locks SET value=0");
            ExecutorService repaired=Executors.newFixedThreadPool(2);
            ArrayBlockingQueue<Integer> firstReady=new ArrayBlockingQueue<>(1),secondReady=new ArrayBlockingQueue<>(1);
            CountDownLatch releaseFirst=new CountDownLatch(1);
            boolean singleWait;
            try {
                Future<Worker> first=repaired.submit(()->ordered(database,firstReady,releaseFirst));
                Integer firstPid=firstReady.poll(2,TimeUnit.SECONDS); assertNotNull(firstPid);
                Future<Worker> second=repaired.submit(()->ordered(database,secondReady,null));
                Integer secondPid=secondReady.poll(2,TimeUnit.SECONDS); assertNotNull(secondPid);
                singleWait=awaitBlock(observer,secondPid,firstPid); assertTrue(singleWait);
                assertFalse(blockedBy(observer,firstPid,secondPid));
                releaseFirst.countDown();
                assertEquals("COMMITTED",first.get(5,TimeUnit.SECONDS).outcome());
                assertEquals("COMMITTED",second.get(5,TimeUnit.SECONDS).outcome());
                assertEquals(List.of(2,2),ids(observer,"SELECT value FROM locks ORDER BY id"));
            } finally { releaseFirst.countDown(); stop(repaired); }
            write("deadlock",Map.of("actualTwoWayBlockerCycle",true,"outcomes",outcomes,"afterVictimRollback",List.of(1,1),
                "repairObservedOneWayWait",singleWait,"repairedBothCommitted",true,"repairedValues",List.of(2,2),"ownedWorkersJoined",true));
        }
    }
    private Worker opposite(OwnedDatabase database,int first,int second,ArrayBlockingQueue<Integer> ready,CountDownLatch go) throws Exception {
        try(Connection connection=database.connection()) {
            begin(connection,Connection.TRANSACTION_READ_COMMITTED); int pid=pid(connection);
            try {
                sql(connection,"UPDATE locks SET value=value+1 WHERE id="+first);
                assertTrue(ready.offer(pid,2,TimeUnit.SECONDS)); await(go);
                sql(connection,"UPDATE locks SET value=value+1 WHERE id="+second); connection.commit(); return new Worker(pid,"COMMITTED");
            } catch(SQLException failure) { connection.rollback(); return new Worker(pid,failure.getSQLState()); }
            catch(Exception|Error failure) { connection.rollback(); throw failure; }
        }
    }
    private Worker ordered(OwnedDatabase database,ArrayBlockingQueue<Integer> ready,CountDownLatch pause) throws Exception {
        try(Connection connection=database.connection()) {
            begin(connection,Connection.TRANSACTION_READ_COMMITTED); int pid=pid(connection);
            try {
                // The holder reports after locking; the waiter must report before its blocking command.
                if(pause==null)assertTrue(ready.offer(pid,2,TimeUnit.SECONDS));
                sql(connection,"UPDATE locks SET value=value+1 WHERE id=1");
                if(pause!=null) { assertTrue(ready.offer(pid,2,TimeUnit.SECONDS)); await(pause); }
                sql(connection,"UPDATE locks SET value=value+1 WHERE id=2"); connection.commit(); return new Worker(pid,"COMMITTED");
            } catch(Exception|Error failure) { connection.rollback(); throw failure; }
        }
    }

    @Test void optimisticCompareAndChangeRetriesFreshWhileForUpdateWaitsAndReadsTheWinner() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment(),3);Connection observer=database.connection()) {
            sql(observer,"CREATE TABLE counters(id INT PRIMARY KEY,value INT NOT NULL,version INT NOT NULL); INSERT INTO counters VALUES(1,0,0)");
            ExecutorService workers=Executors.newFixedThreadPool(2); CyclicBarrier bothRead=new CyclicBarrier(2);
            List<Cas> optimistic;
            try {
                Future<Cas> first=workers.submit(()->optimistic(database,bothRead));
                Future<Cas> second=workers.submit(()->optimistic(database,bothRead));
                optimistic=List.of(first.get(6,TimeUnit.SECONDS),second.get(6,TimeUnit.SECONDS));
                assertEquals(List.of(1,2),optimistic.stream().map(item->item.transactions().size()).sorted().toList());
                assertEquals(1,optimistic.stream().flatMap(item->item.changedRows().stream()).filter(value->value==0).count());
                assertTrue(optimistic.stream().allMatch(item->item.transactions().stream().distinct().count()==item.transactions().size()));
                assertEquals(2,number(observer,"SELECT value FROM counters WHERE id=1"));
                assertEquals(2,number(observer,"SELECT version FROM counters WHERE id=1"));
            } finally { stop(workers); }
            sql(observer,"UPDATE counters SET value=0,version=0");
            ExecutorService locked=Executors.newFixedThreadPool(2);
            ArrayBlockingQueue<Integer> firstReady=new ArrayBlockingQueue<>(1),secondReady=new ArrayBlockingQueue<>(1);
            CountDownLatch release=new CountDownLatch(1);
            long secondRead;
            try {
                Future<Long> first=locked.submit(()->pessimistic(database,firstReady,release));
                Integer firstPid=firstReady.poll(2,TimeUnit.SECONDS); assertNotNull(firstPid);
                Future<Long> second=locked.submit(()->pessimistic(database,secondReady,null));
                Integer secondPid=secondReady.poll(2,TimeUnit.SECONDS); assertNotNull(secondPid);
                assertTrue(awaitBlock(observer,secondPid,firstPid)); assertFalse(second.isDone()); release.countDown();
                assertEquals(0,first.get(5,TimeUnit.SECONDS)); secondRead=second.get(5,TimeUnit.SECONDS); assertEquals(1,secondRead);
                assertEquals(2,number(observer,"SELECT value FROM counters WHERE id=1"));
                assertEquals(2,number(observer,"SELECT version FROM counters WHERE id=1"));
            } finally { release.countDown(); stop(locked); }
            write("locking-strategies",Map.of("optimistic",optimistic.stream().map(item->Map.of("transactionIds",item.transactions(),"changedRows",item.changedRows())).toList(),
                "applicationVersionConflicts",1,"pessimisticActualWait",true,"pessimisticSecondLockedRead",secondRead,
                "bothStrategiesFinalValue",2,"bothStrategiesFinalVersion",2,"ownedWorkersJoined",true));
        }
    }
    private Cas optimistic(OwnedDatabase database,CyclicBarrier bothRead) throws Exception {
        List<String> transactions=new ArrayList<>(); List<Integer> changes=new ArrayList<>();
        for(int attempt=1;attempt<=2;attempt++) {
            try(Connection connection=database.connection()) {
                begin(connection,Connection.TRANSACTION_READ_COMMITTED);
                try {
                    transactions.add(text(connection,"SELECT txid_current()::text"));
                    long version=number(connection,"SELECT version FROM counters WHERE id=1");
                    if(attempt==1)bothRead.await(2,TimeUnit.SECONDS);
                    int changed;
                    try(PreparedStatement update=connection.prepareStatement("UPDATE counters SET value=value+1,version=version+1 WHERE id=1 AND version=?")) {
                        update.setLong(1,version); changed=update.executeUpdate(); changes.add(changed);
                    }
                    if(changed==1) { connection.commit(); return new Cas(List.copyOf(transactions),List.copyOf(changes)); }
                    assertEquals(0,changed); assertEquals(1,number(connection,"SELECT 1")); connection.rollback();
                } catch(Exception|Error failure) { connection.rollback(); throw failure; }
            }
        }
        throw new IllegalStateException("Two whole optimistic attempts exhausted");
    }
    private long pessimistic(OwnedDatabase database,ArrayBlockingQueue<Integer> ready,CountDownLatch pause) throws Exception {
        try(Connection connection=database.connection()) {
            begin(connection,Connection.TRANSACTION_READ_COMMITTED);
            try {
                if(pause==null)assertTrue(ready.offer(pid(connection),2,TimeUnit.SECONDS));
                long before=number(connection,"SELECT value FROM counters WHERE id=1 FOR UPDATE");
                if(pause!=null) { assertTrue(ready.offer(pid(connection),2,TimeUnit.SECONDS)); await(pause); }
                sql(connection,"UPDATE counters SET value=value+1,version=version+1 WHERE id=1"); connection.commit(); return before;
            } catch(Exception|Error failure) { connection.rollback(); throw failure; }
        }
    }
}
