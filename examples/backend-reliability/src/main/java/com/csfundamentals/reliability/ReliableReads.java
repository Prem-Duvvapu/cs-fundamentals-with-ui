package com.csfundamentals.reliability;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.util.ArrayDeque;
import java.util.List;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.LockSupport;
import java.util.function.DoubleSupplier;
import java.util.function.LongSupplier;

/** Integration laboratory: automatic retries are explicitly restricted to safe GET reads. */
public final class ReliableReads implements AutoCloseable {
    public enum Reason { NONE, INVALID_REQUEST, UNSAFE_METHOD, OVERLOADED, CIRCUIT_OPEN, DEADLINE, ATTEMPT_TIMEOUT, RETRY_EXHAUSTED, UPSTREAM_STATUS, TRANSPORT, RESPONSE_LIMIT, CANCELLED, CLOSED }
    public record Result(int status, String body, int attempts, Reason reason) { public boolean successful() { return reason == Reason.NONE; } }
    public record Event(long call, String type, int attempt, int status, long delayNanos, CircuitGate.State breaker) {}
    public record Snapshot(int active, int admitted, long accepted, long overloaded, long attempts, long retries, long cancellations, CircuitGate.State breaker) {}
    @FunctionalInterface public interface Pause { void await(long nanos) throws InterruptedException; }

    private final RetryPolicy policy;
    private final CircuitGate gate;
    private final LongSupplier ticker;
    private final Clock wallClock;
    private final DoubleSupplier random;
    private final Pause pause;
    private final int bodyLimit;
    private final ThreadPoolExecutor workers;
    private final Semaphore admission;
    private final int capacity;
    private final ThreadPoolExecutor ioWorkers;
    private final HttpClient http;
    private final AtomicBoolean closed = new AtomicBoolean();
    private final AtomicLong sequence = new AtomicLong(), accepted = new AtomicLong(), overloaded = new AtomicLong(), attempts = new AtomicLong(), retries = new AtomicLong(), cancellations = new AtomicLong();
    private final ArrayDeque<Event> events = new ArrayDeque<>();
    private final Object activeMonitor = new Object();
    private int active;

    public ReliableReads(int concurrency, RetryPolicy policy, CircuitGate gate) {
        this(concurrency, policy, gate, System::nanoTime, Clock.systemUTC(), Math::random, ReliableReads::park, 64 * 1024);
    }

    public ReliableReads(int concurrency, RetryPolicy policy, CircuitGate gate, LongSupplier ticker, Clock wallClock,
                         DoubleSupplier random, Pause pause, int bodyLimit) {
        if (concurrency < 1 || concurrency > 8 || bodyLimit < 1 || bodyLimit > 64 * 1024) throw new IllegalArgumentException("Invalid capacity bounds");
        this.policy = java.util.Objects.requireNonNull(policy); this.gate = java.util.Objects.requireNonNull(gate);
        this.ticker = java.util.Objects.requireNonNull(ticker); this.wallClock = java.util.Objects.requireNonNull(wallClock);
        this.random = java.util.Objects.requireNonNull(random); this.pause = java.util.Objects.requireNonNull(pause); this.bodyLimit = bodyLimit;
        capacity = concurrency; admission = new Semaphore(concurrency);
        workers = new ThreadPoolExecutor(concurrency, concurrency, 0, TimeUnit.SECONDS, new ArrayBlockingQueue<>(concurrency), daemonFactory("reliability-call"), new ThreadPoolExecutor.AbortPolicy());
        ioWorkers = new ThreadPoolExecutor(concurrency * 4, concurrency * 4, 0, TimeUnit.SECONDS, new SynchronousQueue<>(), daemonFactory("reliability-http"), new ThreadPoolExecutor.CallerRunsPolicy());
        http = HttpClient.newBuilder().executor(ioWorkers).connectTimeout(Duration.ofSeconds(1)).version(HttpClient.Version.HTTP_1_1).followRedirects(HttpClient.Redirect.NEVER).build();
    }

    public CompletableFuture<Result> execute(String method, URI uri, Duration budget) {
        if (!"GET".equals(method)) return CompletableFuture.completedFuture(failure(Reason.UNSAFE_METHOD, 0, 0));
        if (uri == null || !"http".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost()) || uri.getPort() < 1 || uri.getUserInfo() != null || uri.getFragment() != null
                || budget == null || budget.isZero() || budget.isNegative() || budget.compareTo(Duration.ofSeconds(5)) > 0) return CompletableFuture.completedFuture(failure(Reason.INVALID_REQUEST, 0, 0));
        if (closed.get()) return CompletableFuture.completedFuture(failure(Reason.CLOSED, 0, 0));
        if (!admission.tryAcquire()) {
            overloaded.incrementAndGet(); record(sequence.incrementAndGet(), "REJECTED", 0, 0, 0);
            return CompletableFuture.completedFuture(failure(Reason.OVERLOADED, 0, 0));
        }
        AtomicBoolean released = new AtomicBoolean(), started = new AtomicBoolean();
        Object startLock = new Object();
        Runnable releaseSlot = () -> { if (released.compareAndSet(false, true)) { admission.release(); synchronized (activeMonitor) { activeMonitor.notifyAll(); } } };
        AtomicInteger callAttempts = new AtomicInteger();
        long call = sequence.incrementAndGet(), start = ticker.getAsLong(), total = budget.toNanos();
        CompletableFuture<Result> result = new CompletableFuture<>();
        FutureTask<Void> work = new FutureTask<>(() -> {
            synchronized (startLock) {
                if (result.isCancelled()) { releaseSlot.run(); return null; }
                started.set(true);
                synchronized (activeMonitor) { active++; }
            }
            accepted.incrementAndGet(); record(call, "ACCEPTED", 0, 0, 0);
            CircuitGate.Permit permit = null;
            Result outcome = null;
            try {
                if (Thread.currentThread().isInterrupted() || result.isCancelled()) throw new InterruptedException();
                if (closed.get()) outcome = failure(Reason.CLOSED, 0, 0);
                else {
                    CircuitGate.State before = gate.state();
                    permit = gate.enter(); transition(call, before);
                    outcome = permit == null ? failure(Reason.CIRCUIT_OPEN, 0, 0) : run(call, uri, start, total, permit.probe(), callAttempts);
                }
            } catch (InterruptedException cancellation) {
                Thread.currentThread().interrupt(); outcome = failure(Reason.CANCELLED, 0, callAttempts.get());
            } catch (RuntimeException invalidConfiguration) {
                outcome = failure(Reason.INVALID_REQUEST, 0, callAttempts.get());
            } finally {
                if (permit != null) {
                    CircuitGate.State before = gate.state();
                    boolean cancelled = result.isCancelled() || Thread.currentThread().isInterrupted() || (outcome != null && outcome.attempts() == 0);
                    gate.complete(permit, outcome == null || dependencyFailed(outcome), cancelled); transition(call, before);
                }
                if (outcome == null) outcome = failure(Reason.CANCELLED, 0, callAttempts.get());
                record(call, "COMPLETED_" + outcome.reason(), outcome.attempts(), outcome.status(), 0);
                synchronized (activeMonitor) { active--; releaseSlot.run(); activeMonitor.notifyAll(); }
                result.complete(outcome);
            }
            return null;
        });
        result.whenComplete((value, error) -> {
            if (result.isCancelled()) { cancellations.incrementAndGet(); record(call, "CANCELLED", 0, 0, 0); work.cancel(true); synchronized (startLock) { if (!started.get()) releaseSlot.run(); } }
        });
        try { workers.execute(work); }
        catch (RejectedExecutionException rejection) {
            releaseSlot.run(); overloaded.incrementAndGet(); record(call, "REJECTED", 0, 0, 0);
            result.complete(failure(closed.get() ? Reason.CLOSED : Reason.OVERLOADED, 0, 0));
        }
        return result;
    }

    private Result run(long call, URI uri, long start, long total, boolean probe, AtomicInteger callAttempts) throws InterruptedException {
        int lastStatus = 0;
        for (int attempt = 1; attempt <= (probe ? 1 : policy.maxAttempts()); attempt++) {
            if (Thread.interrupted()) throw new InterruptedException();
            long remaining = remaining(start, total);
            if (remaining <= 0) return failure(Reason.DEADLINE, lastStatus, attempt - 1);
            long allowed = Math.min(remaining, policy.attemptTimeout().toNanos()), attemptStart = ticker.getAsLong();
            HttpRequest request = HttpRequest.newBuilder(uri).GET().timeout(Duration.ofNanos(allowed)).build();
            callAttempts.set(attempt); attempts.incrementAndGet(); if (attempt > 1) retries.incrementAndGet();
            record(call, "ATTEMPT_STARTED", attempt, 0, 0);
            CompletableFuture<HttpResponse<byte[]>> pending = http.sendAsync(request, ignored -> new BoundedBody(bodyLimit));
            Reason reason; String retryAfter = null; boolean retryable;
            try {
                long wait = Math.min(remaining(start, total), allowed - (ticker.getAsLong() - attemptStart));
                if (wait <= 0) throw new TimeoutException();
                HttpResponse<byte[]> response = pending.get(wait, TimeUnit.NANOSECONDS);
                lastStatus = response.statusCode();
                if (remaining(start, total) <= 0) return failure(Reason.DEADLINE, lastStatus, attempt); record(call, "ATTEMPT_FINISHED", attempt, lastStatus, 0);
                if (lastStatus >= 200 && lastStatus < 300) return new Result(lastStatus, new String(response.body(), StandardCharsets.UTF_8), attempt, Reason.NONE);
                reason = Reason.UPSTREAM_STATUS; retryable = RetryPolicy.retryableStatus(lastStatus);
                retryAfter = response.headers().firstValue("Retry-After").orElse(null);
            } catch (TimeoutException timeout) {
                pending.cancel(true);
                reason = remaining(start, total) <= 0 || allowed == remaining ? Reason.DEADLINE : Reason.ATTEMPT_TIMEOUT;
                retryable = reason != Reason.DEADLINE;
                record(call, "ATTEMPT_" + reason, attempt, 0, 0);
            } catch (ExecutionException error) {
                Throwable cause = error.getCause();
                if (cause instanceof BoundedBody.TooLarge) { reason = Reason.RESPONSE_LIMIT; retryable = false; }
                else if (cause instanceof java.net.http.HttpTimeoutException) { reason = remaining(start, total) <= 0 || allowed == remaining ? Reason.DEADLINE : Reason.ATTEMPT_TIMEOUT; retryable = reason != Reason.DEADLINE; }
                else { reason = Reason.TRANSPORT; retryable = cause instanceof IOException && !(cause instanceof javax.net.ssl.SSLException); }
                record(call, "ATTEMPT_" + reason, attempt, 0, 0);
            } catch (InterruptedException cancellation) {
                pending.cancel(true); throw cancellation;
            }
            if (!retryable) return failure(reason, lastStatus, attempt);
            if (probe || attempt == policy.maxAttempts()) return failure(Reason.RETRY_EXHAUSTED, lastStatus, attempt);
            long delay = policy.delayNanos(attempt, retryAfter, wallClock, random);
            if (delay >= remaining(start, total)) return failure(Reason.DEADLINE, lastStatus, attempt);
            record(call, "RETRY_SCHEDULED", attempt, lastStatus, delay);
            if (delay > 0) pause.await(delay);
        }
        throw new IllegalStateException("Bounded attempt loop escaped");
    }

    private long remaining(long start, long total) { return total - (ticker.getAsLong() - start); }
    private static boolean dependencyFailed(Result outcome) {
        return outcome.reason() != Reason.NONE && (outcome.reason() != Reason.UPSTREAM_STATUS || outcome.status() >= 500 || outcome.status() == 429);
    }
    private static Result failure(Reason reason, int status, int attempts) { return new Result(status, "", attempts, reason); }
    private void transition(long call, CircuitGate.State before) { if (before != gate.state()) record(call, "BREAKER_CHANGED", 0, 0, 0); }
    private synchronized void record(long call, String type, int attempt, int status, long delay) {
        if (events.size() == 256) events.removeFirst();
        events.addLast(new Event(call, type, attempt, status, delay, gate.state()));
    }
    public synchronized List<Event> events() { return List.copyOf(events); }
    public Snapshot snapshot() { synchronized (activeMonitor) { return new Snapshot(active, capacity - admission.availablePermits(), accepted.get(), overloaded.get(), attempts.get(), retries.get(), cancellations.get(), gate.state()); } }
    public boolean awaitIdle(Duration timeout) throws InterruptedException {
        long start = System.nanoTime(), budget = timeout.toNanos();
        synchronized (activeMonitor) {
            while (active != 0 || admission.availablePermits() != capacity) { long remaining = budget - (System.nanoTime() - start); if (remaining <= 0) return false; TimeUnit.NANOSECONDS.timedWait(activeMonitor, remaining); }
            return true;
        }
    }
    private static ThreadFactory daemonFactory(String prefix) { AtomicLong ids = new AtomicLong(); return task -> { Thread thread = new Thread(task, prefix + "-" + ids.incrementAndGet()); thread.setDaemon(true); return thread; }; }
    private static void park(long nanos) throws InterruptedException {
        long start = System.nanoTime();
        while (nanos > 0) { LockSupport.parkNanos(nanos); if (Thread.interrupted()) throw new InterruptedException(); nanos -= System.nanoTime() - start; start = System.nanoTime(); }
    }
    @Override public void close() {
        if (closed.compareAndSet(false, true)) {
            for (Runnable pending : workers.shutdownNow()) pending.run();
            try { workers.awaitTermination(2, TimeUnit.SECONDS); } catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); }
            ioWorkers.shutdownNow();
        }
    }
}
