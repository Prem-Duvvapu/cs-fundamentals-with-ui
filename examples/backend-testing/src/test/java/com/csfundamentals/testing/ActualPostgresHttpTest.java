package com.csfundamentals.testing;

import com.csfundamentals.example.TaskTrackerApplication;
import com.zaxxer.hikari.HikariDataSource;
import com.zaxxer.hikari.HikariPoolMXBean;
import com.github.dockerjava.api.model.*;
import java.lang.management.*;
import java.net.URI;
import java.nio.file.*;
import java.sql.*;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.boot.web.server.context.WebServerApplicationContext;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class ActualPostgresHttpTest {
    static final String IMAGE = "postgres:16.15@sha256:ca0bd484cb98bf4b24eb1010e73fb3fcbd6714d240fbc1a10eea5b7dbecb641d";
    static final String PASSWORD = UUID.randomUUID().toString() + UUID.randomUUID();
    static PostgreSQLContainer database;
    static ConfigurableApplicationContext application;
    static URI api;
    static final BoundedHttp HTTP = new BoundedHttp();
    static final Map<String, Object> evidence = new LinkedHashMap<>();
    static final List<String> provenCases = new ArrayList<>();
    static long savedId;
    static int savedRows;

    @BeforeAll static void startOwnedDatabaseAndUnchangedApplication() throws Throwable {
        String stage = "container-create";
        try {
        // No disabledWithoutDocker/assumption/fallback: missing Docker is an actual failure of this suite.
        database = new PostgreSQLContainer(DockerImageName.parse(IMAGE))
                .withDatabaseName("testing_lab").withUsername("teaching_owner").withPassword(PASSWORD)
                .withReuse(false).withStartupTimeout(Duration.ofSeconds(70))
                .withLabel("backend-testing-owned", "true")
                .withCreateContainerCmdModifier(command -> command.getHostConfig().withPortBindings(
                        new PortBinding(Ports.Binding.bindIp("127.0.0.1"), new ExposedPort(5432))));
        stage = "container-start";
        database.start();
        stage = "container-host-check";
        if (!Set.of("localhost", "127.0.0.1", "::1").contains(database.getHost()))
            throw new IllegalStateException("local_owned_docker_daemon_required");
        stage = "application-start";
        startApplication();
        evidence.put("evidence", "actual-testcontainers-postgresql-and-unchanged-task-tracker-http");
        evidence.put("image", IMAGE); evidence.put("javaVersion", System.getProperty("java.version"));
        evidence.put("testcontainersVersion", org.testcontainers.containers.GenericContainer.class.getPackage().getImplementationVersion());
        evidence.put("springBootVersion", org.springframework.boot.SpringBootVersion.getVersion());
        evidence.put("hibernateVersion", org.hibernate.Version.getVersionString());
        evidence.put("scope", "Bounded single-JVM loopback teaching run; not production capacity, external arrival traffic, HA or a distributed load generator.");
        } catch (Throwable failure) {
            SetupDiagnostics.write(stage, failure);
            throw failure;
        }
    }
    static void startApplication() {
        application = new SpringApplicationBuilder(TaskTrackerApplication.class).profiles("persistence")
                .properties(Map.of("spring.main.banner-mode", "off", "logging.level.root", "OFF"))
                .run("--server.address=127.0.0.1", "--server.port=0", "--spring.datasource.url=" + database.getJdbcUrl(),
                        "--spring.datasource.username=" + database.getUsername(), "--spring.datasource.password=" + PASSWORD,
                        "--spring.datasource.hikari.maximum-pool-size=2", "--spring.datasource.hikari.minimum-idle=2",
                        "--spring.datasource.hikari.connection-timeout=500", "--spring.jpa.hibernate.ddl-auto=validate",
                        "--spring.jpa.show-sql=false", "--spring.flyway.enabled=true", "--server.tomcat.threads.max=8",
                        "--server.tomcat.threads.min-spare=2", "--management.endpoints.web.exposure.include=health",
                        "--spring.lifecycle.timeout-per-shutdown-phase=5s");
        api = URI.create("http://127.0.0.1:" + ((WebServerApplicationContext) application).getWebServer().getPort() + "/api/tasks");
    }
    static HikariDataSource source() { return application.getBean(HikariDataSource.class); }

    @Test @Order(1) void actualPostgresqlRunsExistingMigrationsAndRejectsInvalidRows() throws Exception {
        try (var connection = source().getConnection(); var statement = connection.createStatement()) {
            try (var row = statement.executeQuery("select current_setting('server_version')")) {
                assertTrue(row.next()); assertTrue(row.getString(1).startsWith("16.15")); evidence.put("postgresqlVersion", row.getString(1));
            }
            try (var row = statement.executeQuery("select count(*) from flyway_schema_history where success")) {
                assertTrue(row.next()); assertEquals(2, row.getInt(1));
            }
            var error = assertThrows(SQLException.class, () -> statement.executeUpdate("insert into tasks(title, completed, version) values (null, false, 0)"));
            assertEquals("23502", error.getSQLState());
        }
        provenCases.add("actual-pg16-existing-flyway-v1-v2-not-null-constraint");
    }
    @Test @Order(2) void realProviderMatchesConsumerContractAndConcurrentCreatesLoseNoRows() throws Exception {
        var created = HTTP.request(api, "POST", "{\"title\":\"  Synthetic retained task  \"}");
        savedId = BoundedHttp.createdTask(created); assertEquals("Synthetic retained task", created.json().path("title").asString());
        var invalid = HTTP.request(api, "POST", "{\"title\":\"   \"}");
        assertEquals(400, invalid.status());
        assertTrue(invalid.headers().firstValue("Content-Type").orElse("").startsWith("application/problem+json"));
        assertEquals(400, invalid.json().path("status").asInt()); assertTrue(invalid.json().path("detail").isString());
        String invalidText = new String(invalid.body(), java.nio.charset.StandardCharsets.UTF_8);
        for (String privateMarker : List.of("java.lang", "stackTrace", "jdbc:", PASSWORD)) assertFalse(invalidText.contains(privateMarker));
        assertEquals(404, HTTP.request(URI.create(api + "/999999999"), "GET", null).status());
        assertEquals(400, HTTP.request(URI.create(api + "/" + savedId + "/completion"), "PUT", "{}").status());
        var clients = Executors.newFixedThreadPool(4);
        try {
            var ready = new CountDownLatch(4); var start = new CountDownLatch(1);
            var responses = new ArrayList<Future<List<Long>>>();
            for (int worker = 0; worker < 4; worker++) {
                int owner = worker;
                responses.add(clients.submit(() -> {
                    ready.countDown(); if (!start.await(3, TimeUnit.SECONDS)) throw new IllegalStateException("concurrent_start_deadline");
                    var ids = new ArrayList<Long>();
                    for (int i = 0; i < 6; i++) ids.add(BoundedHttp.createdTask(HTTP.request(api, "POST", "{\"title\":\"Synthetic worker " + owner + " item " + i + "\"}")));
                    return ids;
                }));
            }
            assertTrue(ready.await(3, TimeUnit.SECONDS)); start.countDown();
            var ids = new HashSet<Long>();
            for (var response : responses) for (long id : response.get(20, TimeUnit.SECONDS)) assertTrue(ids.add(id), "Database generated distinct identities");
            assertEquals(24, ids.size());
            var rows = HTTP.request(api, "GET", null).json(); assertEquals(25, rows.size());
            assertEquals(25, rows.valueStream().map(row -> row.path("title").asString()).distinct().count());
            savedRows = rows.size();
        } finally { clients.shutdownNow(); assertTrue(clients.awaitTermination(5, TimeUnit.SECONDS)); }
        provenCases.add("actual-http-problem-details-validation-missing-record-and-consumer-create-contract");
        provenCases.add("four-concurrent-http-clients-24-independent-inserts-25-unique-persisted-rows");
    }
    @Test @Order(3) void boundedLoadIncludesPoolTimeoutErrorsAndObservesRecoveryWithoutCapacityClaims() throws Exception {
        // Explicit warm-up is excluded from all measured counts and times.
        for (int i = 0; i < 4; i++) assertEquals(200, HTTP.request(URI.create(api + "/" + savedId), "GET", null).status());
        var phases = new LinkedHashMap<String, Object>();
        var healthy = load(24, 2); assertEquals(24, healthy.summary().successes()); phases.put("healthy", healthy);
        // Controlled dependency starvation, not a claim that production saturates at four clients.
        try (var heldOne = source().getConnection(); var heldTwo = source().getConnection()) {
            var starved = load(12, 4); assertEquals(12, starved.summary().errors()); assertEquals(12, starved.summary().outcomes().get("500"));
            assertTrue(starved.maxActiveConnections() >= 2); assertTrue(starved.maxWaitingForConnection() >= 1);
            phases.put("all-two-connections-deliberately-held", starved);
        }
        var recovered = load(24, 2); assertEquals(24, recovered.summary().successes()); phases.put("recovered", recovered);
        assertEquals(savedRows, HTTP.request(api, "GET", null).json().size());
        evidence.put("load", phases); evidence.put("warmupRequestsExcluded", 4); evidence.put("measuredAttempts", 60);
        evidence.put("loadModel", "Closed loop: each of the stated clients issues its next request only after its previous response; finite capped request budget. Latency includes transport errors and non-2xx responses. Percentiles use nearest rank; throughput uses measured phase wall time, not summed durations.");
        evidence.put("firstObservedBottleneck", "Intentional test-held Hikari pool: exactly two checked-out connections, observed waiters and actual HTTP 500 acquisition-timeout responses. No inferred production bottleneck or arbitrary p95 speed threshold.");
        provenCases.add("bounded-error-inclusive-load-and-observed-hikari-starvation-recovery");
    }
    @Test @Order(4) void restartUnchangedApplicationRetainsCommittedRowsAndRevalidatesMigrations() throws Exception {
        assertEquals(200, HTTP.request(URI.create(api + "/" + savedId + "/completion"), "PUT", "{\"completed\":true}").status());
        application.close(); application = null; startApplication();
        assertEquals(savedRows, HTTP.request(api, "GET", null).json().size());
        var task = HTTP.request(URI.create(api + "/" + savedId), "GET", null); assertEquals(200, task.status()); assertTrue(task.json().path("completed").asBoolean());
        provenCases.add("application-context-restart-same-owned-pg-preserves-committed-completion-and-rows");
    }
    record Phase(LoadSummary summary, int concurrency, int requestCap, long phaseDeadlineMs, int maxActiveConnections,
                 int maxWaitingForConnection, long peakHeapUsedBytes, int peakJvmThreads, Long processCpuNanosDelta) {}
    static Phase load(int requests, int concurrency) throws Exception {
        if (requests < 1 || requests > 64 || concurrency < 1 || concurrency > 4) throw new IllegalArgumentException("load_limits");
        var workers = Executors.newFixedThreadPool(concurrency); var sampler = Executors.newSingleThreadScheduledExecutor();
        var attempts = new ConcurrentLinkedQueue<LoadSummary.Attempt>(); var ticket = new AtomicInteger();
        var maxActive = new AtomicInteger(); var maxWaiting = new AtomicInteger(); var maxThreads = new AtomicInteger(); var heap = new AtomicLong();
        HikariPoolMXBean pool = source().getHikariPoolMXBean();
        Runnable sample = () -> {
            maxActive.accumulateAndGet(pool.getActiveConnections(), Math::max); maxWaiting.accumulateAndGet(pool.getThreadsAwaitingConnection(), Math::max);
            maxThreads.accumulateAndGet(ManagementFactory.getThreadMXBean().getThreadCount(), Math::max);
            heap.accumulateAndGet(ManagementFactory.getMemoryMXBean().getHeapMemoryUsage().getUsed(), Math::max);
        };
        long started = System.nanoTime(), deadline = started + TimeUnit.SECONDS.toNanos(20); Long cpuBefore = processCpu();
        var futures = new ArrayList<Future<?>>();
        try {
            sample.run(); sampler.scheduleAtFixedRate(sample, 0, 5, TimeUnit.MILLISECONDS);
            for (int client = 0; client < concurrency; client++) futures.add(workers.submit(() -> {
                while (ticket.getAndIncrement() < requests) {
                    if (Thread.currentThread().isInterrupted()) throw new CancellationException("owned_worker_cancelled");
                    if (System.nanoTime() >= deadline) throw new IllegalStateException("closed_loop_phase_deadline");
                    long before = System.nanoTime(); String outcome; boolean success;
                    try { int status = HTTP.request(URI.create(api + "/" + savedId), "GET", null).status(); outcome = Integer.toString(status); success = status == 200; }
                    catch (InterruptedException error) { Thread.currentThread().interrupt(); throw new CancellationException("owned_http_cancelled"); }
                    catch (Exception error) { outcome = "transport"; success = false; }
                    attempts.add(new LoadSummary.Attempt(System.nanoTime() - before, outcome, success));
                }
            }));
            for (var future : futures) future.get(Math.max(1, deadline - System.nanoTime()), TimeUnit.NANOSECONDS);
            long elapsed = System.nanoTime() - started; Long cpuAfter = processCpu(); sample.run();
            assertEquals(requests, attempts.size());
            return new Phase(LoadSummary.of(List.copyOf(attempts), elapsed), concurrency, requests, 20000,
                    maxActive.get(), maxWaiting.get(), heap.get(), maxThreads.get(), cpuBefore == null || cpuAfter == null ? null : cpuAfter - cpuBefore);
        } finally {
            futures.forEach(future -> future.cancel(true)); workers.shutdownNow(); sampler.shutdownNow();
            assertTrue(workers.awaitTermination(5, TimeUnit.SECONDS)); assertTrue(sampler.awaitTermination(3, TimeUnit.SECONDS));
        }
    }
    static Long processCpu() {
        return ManagementFactory.getOperatingSystemMXBean() instanceof com.sun.management.OperatingSystemMXBean os && os.getProcessCpuTime() >= 0 ? os.getProcessCpuTime() : null;
    }
    @AfterAll static void cleanupOwnedResourcesAndWriteSanitizedEvidence() throws Exception {
        try { if (application != null) { application.close(); application = null; } }
        finally {
            if (database != null) database.stop();
            if (database != null && database.isRunning()) throw new IllegalStateException("owned_database_did_not_stop");
        }
        if (provenCases.size() != 5) return; // Incomplete/failed suite cannot manufacture complete evidence.
        evidence.put("provenCases", List.copyOf(provenCases)); evidence.put("applicationClosed", true); evidence.put("ownedContainerStopped", true);
        byte[] report = new ObjectMapper().writerWithDefaultPrettyPrinter().writeValueAsBytes(evidence);
        String text = new String(report, java.nio.charset.StandardCharsets.UTF_8);
        for (String sensitive : List.of(PASSWORD, "jdbc:", "Synthetic worker", "Synthetic retained")) if (text.contains(sensitive)) throw new IllegalStateException("evidence_privacy_guard");
        if (report.length > 65536) throw new IllegalStateException("evidence_size_limit");
        var path = Path.of("target/evidence/actual-testing.json"); Files.createDirectories(path.getParent()); Files.write(path, report);
    }
}
