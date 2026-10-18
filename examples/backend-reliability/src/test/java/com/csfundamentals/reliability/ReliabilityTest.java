package com.csfundamentals.reliability;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.Timeout;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.*;
import static org.junit.jupiter.api.Assertions.*;

@Timeout(15)
class ReliabilityTest {
    static final Duration BUDGET = Duration.ofSeconds(3);
    static final Clock WALL = Clock.fixed(Instant.parse("2026-10-18T12:00:00Z"), ZoneOffset.UTC);
    static RetryPolicy policy(int attempts) { return new RetryPolicy(attempts, Duration.ofSeconds(1), Duration.ofMillis(40), Duration.ofMillis(200)); }
    static ReliableReads.Result result(CompletableFuture<ReliableReads.Result> future) throws Exception { return future.get(5, TimeUnit.SECONDS); }
    static ReliableReads client(int concurrency, RetryPolicy policy) { return new ReliableReads(concurrency, policy, new CircuitGate(2, Duration.ofMillis(100), System::nanoTime)); }

    @Test void safeReadRetriesExactlyThreeTimesAndEmitsBoundedAttemptEvidence() throws Exception {
        AtomicLong clock = new AtomicLong(); List<Long> delays = new CopyOnWriteArrayList<>();
        try (FaultServer server = new FaultServer((exchange, count) -> FaultServer.respond(exchange, count < 3 ? 503 : 200, "ok"));
             ReliableReads client = new ReliableReads(2, policy(3), new CircuitGate(2, Duration.ofSeconds(1), clock::get), clock::get, WALL, () -> .5,
                     delay -> { delays.add(delay); clock.addAndGet(delay); }, 1024)) {
            var result = result(client.execute("GET", server.uri(), BUDGET));
            assertTrue(result.successful()); assertEquals(3, result.attempts()); assertEquals(3, server.received.get());
            assertEquals(List.of(20_000_000L, 40_000_000L), delays);
            assertTrue(client.awaitIdle(Duration.ofSeconds(1)));
            assertEquals(3, client.snapshot().attempts()); assertEquals(2, client.snapshot().retries());
            assertEquals(CircuitGate.State.CLOSED, client.snapshot().breaker());
            assertEquals(3, client.events().stream().filter(e -> e.type().equals("ATTEMPT_STARTED")).count());
        }
    }

    @Test void retryAfterMinimumIsHonoredWithAnInjectedClockAndNeverClampedDown() throws Exception {
        AtomicLong clock = new AtomicLong(); List<Long> delays = new CopyOnWriteArrayList<>();
        try (FaultServer server = new FaultServer((exchange, count) -> { exchange.getResponseHeaders().add("Retry-After", "1"); FaultServer.respond(exchange, count == 1 ? 429 : 200, "ok"); });
             ReliableReads client = new ReliableReads(1, policy(3), new CircuitGate(2, Duration.ofSeconds(1), clock::get), clock::get, WALL, () -> .5,
                     delay -> { delays.add(delay); clock.addAndGet(delay); }, 1024)) {
            assertTrue(result(client.execute("GET", server.uri(), BUDGET)).successful());
            assertEquals(List.of(1_000_000_000L), delays); assertEquals(2, server.received.get());
        }
    }

    @Test void retryAfterBeyondTheCallerBudgetDoesNotWaitOrSendAnotherRequest() throws Exception {
        try (FaultServer server = new FaultServer((exchange, count) -> { exchange.getResponseHeaders().add("Retry-After", "60"); FaultServer.respond(exchange, 503, "later"); });
             ReliableReads client = client(1, policy(3))) {
            var result = result(client.execute("GET", server.uri(), BUDGET));
            assertEquals(ReliableReads.Reason.DEADLINE, result.reason()); assertEquals(1, result.attempts()); assertEquals(1, server.received.get());
            assertEquals(0, client.snapshot().retries());
        }
    }

    @Test void nonRetryableClientErrorAndRedirectAreNotRetried() throws Exception {
        for (int status : List.of(400, 401, 403, 404, 409, 302, 500)) {
            try (FaultServer server = new FaultServer((exchange, count) -> { exchange.getResponseHeaders().add("Location", "/other"); FaultServer.respond(exchange, status, "stop"); });
                 ReliableReads client = client(1, policy(3))) {
                assertEquals(ReliableReads.Reason.UPSTREAM_STATUS, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertEquals(1, server.received.get()); assertEquals(0, client.snapshot().retries());
            }
        }
    }

    @Test void aBodyThatNeverCompletesCannotEscapeTheEndToEndDeadline() throws Exception {
        CountDownLatch started = new CountDownLatch(1), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> { exchange.sendResponseHeaders(200, 10); exchange.getResponseBody().write('x'); exchange.getResponseBody().flush(); started.countDown(); release.await(); });
             ReliableReads client = client(1, policy(3))) {
            try {
                var future = client.execute("GET", server.uri(), Duration.ofMillis(800));
                assertTrue(started.await(2, TimeUnit.SECONDS));
                var outcome = result(future);
                assertEquals(ReliableReads.Reason.DEADLINE, outcome.reason()); assertEquals(1, server.received.get());
                assertTrue(client.awaitIdle(Duration.ofSeconds(1)));
            } finally { release.countDown(); }
        }
    }

    @Test void aCancelledCallerCancelsTheHttpWaitAndReleasesTheLocalBulkhead() throws Exception {
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> { if (count == 1) { entered.countDown(); release.await(); } FaultServer.respond(exchange, 200, "ok"); });
             ReliableReads client = client(1, policy(3))) {
            try {
                var first = client.execute("GET", server.uri(), BUDGET);
                assertTrue(entered.await(2, TimeUnit.SECONDS)); assertTrue(first.cancel(true));
                assertThrows(CancellationException.class, first::join); assertTrue(client.awaitIdle(Duration.ofSeconds(2)));
                assertEquals(1, client.snapshot().cancellations());
                assertTrue(result(client.execute("GET", server.uri(), BUDGET)).successful());
                assertEquals(2, server.received.get());
            } finally { release.countDown(); }
        }
    }

    @Test void bulkheadRejectsExcessCallersWithoutAdmissionWaitAndRecoversAfterRelease() throws Exception {
        CountDownLatch entered = new CountDownLatch(2), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> { if (count <= 2) { entered.countDown(); release.await(); } FaultServer.respond(exchange, 200, "ok"); });
             ReliableReads client = client(2, policy(3))) {
            try {
                var first = client.execute("GET", server.uri(), BUDGET); var second = client.execute("GET", server.uri(), BUDGET);
                assertTrue(entered.await(2, TimeUnit.SECONDS));
                List<CompletableFuture<ReliableReads.Result>> rejected = new ArrayList<>();
                for (int i = 0; i < 25; i++) rejected.add(client.execute("GET", server.uri(), BUDGET));
                for (var pending : rejected) assertEquals(ReliableReads.Reason.OVERLOADED, result(pending).reason());
                assertEquals(2, server.received.get()); assertEquals(2, client.snapshot().active());
                assertEquals(25, client.snapshot().overloaded()); assertEquals(CircuitGate.State.CLOSED, client.snapshot().breaker());
                release.countDown(); assertTrue(result(first).successful()); assertTrue(result(second).successful());
                assertTrue(client.awaitIdle(Duration.ofSeconds(1)));
                assertTrue(result(client.execute("GET", server.uri(), BUDGET)).successful());
            } finally { release.countDown(); }
        }
    }

    @Test void oversizeResponseIsCancelledWithoutRetry() throws Exception {
        try (FaultServer server = new FaultServer((exchange, count) -> FaultServer.respond(exchange, 200, "x".repeat(2048)));
             ReliableReads client = new ReliableReads(1, policy(3), new CircuitGate(2, Duration.ofSeconds(1), System::nanoTime), System::nanoTime, WALL, () -> 0,
                     nanos -> fail("Body-limit failures must not retry"), 100)) {
            assertEquals(ReliableReads.Reason.RESPONSE_LIMIT, result(client.execute("GET", server.uri(), BUDGET)).reason());
            assertEquals(1, server.received.get());
        }
    }

    @Test void absoluteBudgetSurvivesBackoffAndIsNotResetForEachAttempt() throws Exception {
        AtomicLong clock = new AtomicLong();
        try (FaultServer server = new FaultServer((exchange, count) -> FaultServer.respond(exchange, 503, "no"));
             ReliableReads client = new ReliableReads(1, policy(3), new CircuitGate(2, Duration.ofSeconds(1), clock::get), clock::get, WALL, () -> .5,
                     ignored -> clock.addAndGet(Duration.ofSeconds(4).toNanos()), 1024)) {
            var result = result(client.execute("GET", server.uri(), BUDGET));
            assertEquals(ReliableReads.Reason.DEADLINE, result.reason()); assertEquals(1, result.attempts()); assertEquals(1, server.received.get());
        }
    }

    @Test void breakerCountsLogicalCallsAndAllowsOnlyOneNonRetriedHalfOpenProbe() throws Exception {
        AtomicLong clock = new AtomicLong(); AtomicBoolean healthy = new AtomicBoolean();
        CountDownLatch probeEntered = new CountDownLatch(1), releaseProbe = new CountDownLatch(1);
        CircuitGate gate = new CircuitGate(2, Duration.ofSeconds(1), clock::get);
        try (FaultServer server = new FaultServer((exchange, count) -> {
            if (count == 7) { probeEntered.countDown(); releaseProbe.await(); }
            FaultServer.respond(exchange, healthy.get() ? 200 : 503, "response");
        }); ReliableReads client = new ReliableReads(2, policy(3), gate, clock::get, WALL, () -> 0, clock::addAndGet, 1024)) {
            try {
                assertEquals(ReliableReads.Reason.RETRY_EXHAUSTED, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertTrue(client.awaitIdle(Duration.ofSeconds(1))); assertEquals(CircuitGate.State.CLOSED, gate.state());
                assertEquals(3, server.received.get());
                assertEquals(ReliableReads.Reason.RETRY_EXHAUSTED, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertTrue(client.awaitIdle(Duration.ofSeconds(1))); assertEquals(CircuitGate.State.OPEN, gate.state());
                assertEquals(ReliableReads.Reason.CIRCUIT_OPEN, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertEquals(6, server.received.get()); clock.addAndGet(Duration.ofSeconds(1).toNanos()); healthy.set(true);
                var probe = client.execute("GET", server.uri(), BUDGET);
                assertTrue(probeEntered.await(2, TimeUnit.SECONDS)); assertEquals(CircuitGate.State.HALF_OPEN, gate.state());
                assertEquals(ReliableReads.Reason.CIRCUIT_OPEN, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertEquals(7, server.received.get()); releaseProbe.countDown(); assertTrue(result(probe).successful());
                assertTrue(client.awaitIdle(Duration.ofSeconds(1))); assertEquals(CircuitGate.State.CLOSED, gate.state());
                assertTrue(client.events().stream().anyMatch(e -> e.breaker() == CircuitGate.State.OPEN && e.type().equals("BREAKER_CHANGED")));
                assertTrue(client.events().stream().anyMatch(e -> e.breaker() == CircuitGate.State.HALF_OPEN && e.type().equals("BREAKER_CHANGED")));
            } finally { releaseProbe.countDown(); }
        }
    }

    @Test void mutationMayCommitBeforeAClientTimeoutAndAutomaticMutationRetryIsRejected() throws Exception {
        AtomicInteger committed = new AtomicInteger(); CountDownLatch committedSignal = new CountDownLatch(1), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> { if (exchange.getRequestMethod().equals("POST")) committed.incrementAndGet(); committedSignal.countDown(); release.await(); FaultServer.respond(exchange, 200, "committed"); });
             ReliableReads client = client(1, policy(3))) {
            try {
                var request = HttpRequest.newBuilder(server.uri()).POST(HttpRequest.BodyPublishers.noBody()).build();
                var raw = HttpClient.newHttpClient().sendAsync(request, HttpResponse.BodyHandlers.discarding());
                assertTrue(committedSignal.await(2, TimeUnit.SECONDS));
                assertThrows(TimeoutException.class, () -> raw.get(100, TimeUnit.MILLISECONDS)); raw.cancel(true);
                assertEquals(1, committed.get());
                assertEquals(ReliableReads.Reason.UNSAFE_METHOD, result(client.execute("POST", server.uri(), BUDGET)).reason());
                assertEquals(1, server.received.get()); assertEquals(1, committed.get());
            } finally { release.countDown(); }
        }
    }

    @Test void perAttemptTimeoutCanRetryASafeReadWithinTheOriginalDeadline() throws Exception {
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        var shortAttempt = new RetryPolicy(3, Duration.ofSeconds(1), Duration.ZERO, Duration.ZERO);
        try (FaultServer server = new FaultServer((exchange, count) -> { if (count == 1) { entered.countDown(); release.await(); } FaultServer.respond(exchange, 200, "ok"); });
             ReliableReads client = client(1, shortAttempt)) {
            try {
                var pending = client.execute("GET", server.uri(), Duration.ofSeconds(5));
                assertTrue(entered.await(2, TimeUnit.SECONDS));
                var outcome = result(pending); assertTrue(outcome.successful(), () -> outcome + " / " + client.events());
                assertEquals(2, outcome.attempts()); assertEquals(2, server.received.get());
                assertTrue(client.events().stream().anyMatch(e -> e.type().equals("ATTEMPT_ATTEMPT_TIMEOUT")));
            } finally { release.countDown(); }
        }
    }

    @Test void backoffRetainsOneAdmissionSlotAndCallerCancellationPreventsTheRetry() throws Exception {
        CountDownLatch waiting = new CountDownLatch(1), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> FaultServer.respond(exchange, count == 1 ? 503 : 200, "response"));
             ReliableReads client = new ReliableReads(1, policy(3), new CircuitGate(2, Duration.ofSeconds(1), System::nanoTime), System::nanoTime, WALL, () -> .5,
                     nanos -> { waiting.countDown(); release.await(); }, 1024)) {
            try {
                var pending = client.execute("GET", server.uri(), BUDGET);
                assertTrue(waiting.await(2, TimeUnit.SECONDS));
                assertEquals(1, client.snapshot().admitted());
                assertEquals(ReliableReads.Reason.OVERLOADED, result(client.execute("GET", server.uri(), BUDGET)).reason());
                assertTrue(pending.cancel(true)); assertTrue(client.awaitIdle(Duration.ofSeconds(1)));
                assertEquals(1, server.received.get()); assertEquals(0, client.snapshot().retries());
                assertTrue(result(client.execute("GET", server.uri(), BUDGET)).successful());
            } finally { release.countDown(); }
        }
    }

    @Test void closingTheClientInterruptsOwnedCallsAndDoesNotRetryOrLeakAdmission() throws Exception {
        CountDownLatch entered = new CountDownLatch(1), release = new CountDownLatch(1);
        try (FaultServer server = new FaultServer((exchange, count) -> { entered.countDown(); release.await(); FaultServer.respond(exchange, 200, "ok"); });
             ReliableReads client = client(1, policy(3))) {
            try {
                var pending = client.execute("GET", server.uri(), BUDGET);
                assertTrue(entered.await(2, TimeUnit.SECONDS)); client.close();
                var cancelled = result(pending);
                assertEquals(ReliableReads.Reason.CANCELLED, cancelled.reason()); assertEquals(1, cancelled.attempts());
                assertEquals(0, client.snapshot().admitted()); assertEquals(0, client.snapshot().active()); assertEquals(1, server.received.get());
            } finally { release.countDown(); }
        }
    }

    @Test void invalidRequestsAndClosedClientMakeNoNetworkCalls() throws Exception {
        try (FaultServer server = new FaultServer((exchange, count) -> FaultServer.respond(exchange, 200, "ok"))) {
            ReliableReads client = client(1, policy(3));
            assertEquals(ReliableReads.Reason.INVALID_REQUEST, result(client.execute("GET", URI.create("http://example.com/"), BUDGET)).reason());
            assertEquals(ReliableReads.Reason.INVALID_REQUEST, result(client.execute("GET", server.uri(), Duration.ofSeconds(6))).reason());
            client.close(); assertEquals(ReliableReads.Reason.CLOSED, result(client.execute("GET", server.uri(), BUDGET)).reason());
            assertEquals(0, server.received.get());
        }
    }
}
