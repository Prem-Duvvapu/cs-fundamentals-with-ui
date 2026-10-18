package com.csfundamentals.persistencelab;

import jakarta.persistence.EntityManager;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import java.nio.file.*;
import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import static org.junit.jupiter.api.Assertions.*;

@EnabledIfEnvironmentVariable(named="PERSISTENCE_TESTS",matches="true")
@Timeout(30)
class PostgresIncidentTest {
    record View(long id,String name,List<String> tasks) {}
    private List<View> read(SessionFactory factory,boolean fetch) {
        try(EntityManager manager=factory.createEntityManager()) {
            manager.getTransaction().begin();
            List<LabProject> rows=manager.createQuery(fetch?"select distinct p from LabProject p left join fetch p.tasks order by p.id":"select p from LabProject p order by p.id",LabProject.class).getResultList();
            List<View> result=rows.stream().map(project->new View(project.id(),project.name(),project.tasks().stream().map(LabTask::title).sorted().toList())).toList();
            manager.getTransaction().commit(); return result;
        }
    }
    @Test void diagnoseNPlusOneUsingActualPreparedStatementsAndEquivalentResults() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment())) {
            SessionFactory factory=database.orm();
            factory.getStatistics().clear(); List<View> before=read(factory,false);
            long naive=factory.getStatistics().getPrepareStatementCount();
            factory.getStatistics().clear(); List<View> after=read(factory,true);
            long fetched=factory.getStatistics().getPrepareStatementCount();
            assertEquals(before,after); assertEquals(3,before.size()); assertEquals(6,before.stream().mapToInt(view->view.tasks().size()).sum());
            assertEquals(4,naive); assertEquals(1,fetched);
            evidence("nplusone","{\"projects\":3,\"tasks\":6,\"naive_statements\":"+naive+",\"fetch_join_statements\":"+fetched+",\"equivalent_results\":true}");
        }
    }
    @Test void boundedPoolExhaustionTimesOutAndRecoversAfterRelease() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment());Connection first=database.connection();Connection second=database.connection()) {
            ExecutorService executor=Executors.newSingleThreadExecutor();
            long elapsed;
            try {
                Future<Long> blocked=executor.submit(()->{
                    long start=System.nanoTime();
                    assertThrows(SQLTransientConnectionException.class,()->{try(Connection unexpected=database.connection()){fail("Pool must be exhausted");}});
                    return TimeUnit.NANOSECONDS.toMillis(System.nanoTime()-start);
                });
                long deadline=System.nanoTime()+Duration.ofMillis(400).toNanos();
                while(database.pool.getHikariPoolMXBean().getThreadsAwaitingConnection()==0 && System.nanoTime()<deadline)Thread.sleep(5);
                assertEquals(2,database.pool.getHikariPoolMXBean().getActiveConnections());
                assertEquals(1,database.pool.getHikariPoolMXBean().getThreadsAwaitingConnection());
                elapsed=blocked.get(3,TimeUnit.SECONDS); assertTrue(elapsed>=450 && elapsed<2500);
                first.close();
                try(Connection recovered=database.connection();Statement statement=recovered.createStatement();ResultSet result=statement.executeQuery("SELECT 42")) {
                    assertTrue(result.next()); assertEquals(42,result.getInt(1));
                }
            } finally { executor.shutdownNow(); assertTrue(executor.awaitTermination(3,TimeUnit.SECONDS)); }
            evidence("pool","{\"maximum_connections\":2,\"waiting_threads_observed\":1,\"timeout_ms\":"+elapsed+",\"recovered_query\":42}");
        }
    }
    @Test void compatibleExpansionBackfillFencedContractAndRollbackPreserveData() throws Exception {
        try(OwnedDatabase database=new OwnedDatabase(TestSettings.environment());Connection connection=database.connection();Statement sql=connection.createStatement()) {
            sql.execute("CREATE TABLE notes(id INT PRIMARY KEY,title TEXT NOT NULL)");
            sql.execute("INSERT INTO notes VALUES(1,'first'),(2,'second')");
            ExpandContract.expand(connection);
            sql.execute("INSERT INTO notes(id,title) VALUES(3,'legacy-writer')");
            assertEquals(List.of("first","second","legacy-writer"),values(sql,"SELECT COALESCE(display_name,title) FROM notes ORDER BY id"));
            ExpandContract.backfill(connection);
            sql.execute("INSERT INTO notes VALUES(4,'dual-write','dual-write')");
            List<String> expected=values(sql,"SELECT title FROM notes ORDER BY id");
            assertEquals(expected,values(sql,"SELECT display_name FROM notes ORDER BY id"));
            assertThrows(IllegalStateException.class,()->ExpandContract.contract(connection,false,false));
            assertThrows(IllegalStateException.class,()->ExpandContract.contract(connection,true,true));
            assertEquals(expected,values(sql,"SELECT title FROM notes ORDER BY id"));
            ExpandContract.contract(connection,true,false);
            assertEquals(expected,values(sql,"SELECT display_name FROM notes ORDER BY id"));
            SQLException incompatible=assertThrows(SQLException.class,()->sql.executeQuery("SELECT title FROM notes")); assertEquals("42703",incompatible.getSQLState());
            sql.execute("INSERT INTO notes(id,display_name) VALUES(5,'after-contract')");
            assertThrows(IllegalStateException.class,()->ExpandContract.reexpandForOldBinary(connection,false));
            ExpandContract.reexpandForOldBinary(connection,true);
            sql.execute("INSERT INTO notes(id,title) VALUES(6,'rolled-back-old-writer')");
            assertEquals(List.of("first","second","legacy-writer","dual-write","after-contract","rolled-back-old-writer"),values(sql,"SELECT title FROM notes ORDER BY id"));
            assertEquals(values(sql,"SELECT title FROM notes ORDER BY id"),values(sql,"SELECT COALESCE(display_name,title) FROM notes ORDER BY id"));
            evidence("migration","{\"expanded_legacy_write\":true,\"contract_fence_enforced\":true,\"ddl_rollback_preserved_rows\":true,\"committed_contract_breaks_old_reader\":true,\"reexpanded_rows\":6,\"old_writer_restored\":true}");
        }
    }
    private List<String> values(Statement statement,String query) throws SQLException {
        List<String> rows=new ArrayList<>();try(ResultSet result=statement.executeQuery(query)){while(result.next())rows.add(result.getString(1));}return rows;
    }
    private void evidence(String name,String json) throws Exception {
        Path directory=Path.of("target","evidence");Files.createDirectories(directory);Files.writeString(directory.resolve(name+".json"),json+"\n");
    }
}
