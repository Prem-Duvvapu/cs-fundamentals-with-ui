package com.csfundamentals.dataservices;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.function.Function;

/** One bounded coordinator instance; no Redis lock or coordination between application instances. */
public final class CoalescedLoads implements AutoCloseable {
    public static final class Capacity extends RuntimeException { public Capacity() { super("cache_load_capacity"); } }
    public static final class Deadline extends RuntimeException { public Deadline() { super("cache_load_deadline"); } }
    public static final class Cancelled extends RuntimeException { public Cancelled() { super("cache_load_cancelled"); } }
    public static final class Closed extends RuntimeException { public Closed() { super("cache_load_closed"); } }
    public static final class Budget {
        private final long expires;
        private Budget(long expires) { this.expires = expires; }
        public void check() {
            if (Thread.currentThread().isInterrupted()) throw new Cancelled();
            if (remaining() <= 0) throw new Deadline();
        }
        private long remaining() { return expires - System.nanoTime(); }
    }
    private static final class Flight {
        final Budget budget;
        final CompletableFuture<Optional<CacheAsideTickets.Result>> result = new CompletableFuture<>();
        Flight(long expires) { budget = new Budget(expires); }
    }
    public record Snapshot(int activeFlights, int waitingCallers, long started, long joined, long rejected, long timedOut) {}
    private final Map<String,Flight> flights = new HashMap<>();
    private final Semaphore callers;
    private final int callerLimit, flightLimit;
    private final long budgetNanos;
    private final ThreadPoolExecutor workers;
    private final AtomicLong started = new AtomicLong(), joined = new AtomicLong(), rejected = new AtomicLong(), timedOut = new AtomicLong();
    private boolean closed;
    public CoalescedLoads(int maxFlights, int maxCallers, Duration loadAndWaitBudget) {
        if (maxFlights < 1 || maxFlights > 8 || maxCallers < maxFlights || maxCallers > 64
                || loadAndWaitBudget == null || loadAndWaitBudget.compareTo(Duration.ofMillis(10)) < 0
                || loadAndWaitBudget.compareTo(Duration.ofSeconds(5)) > 0) throw new IllegalArgumentException("bounded_cache_load_limits_required");
        callerLimit = maxCallers; flightLimit = maxFlights; callers = new Semaphore(maxCallers);
        budgetNanos = loadAndWaitBudget.toNanos();
        workers = new ThreadPoolExecutor(maxFlights,maxFlights,0,TimeUnit.MILLISECONDS,new SynchronousQueue<>(),
                new ThreadPoolExecutor.AbortPolicy());
    }
    public Optional<CacheAsideTickets.Result> load(String versionedKey, Function<Budget,Optional<CacheAsideTickets.Result>> work) {
        Objects.requireNonNull(work);
        if (versionedKey == null || versionedKey.length() > 180) throw new IllegalArgumentException("bounded_versioned_key_required");
        if (!callers.tryAcquire()) { rejected.incrementAndGet(); throw new Capacity(); }
        try {
            Flight flight;
            synchronized (this) {
                if (closed) throw new Closed();
                flight = flights.get(versionedKey);
                if (flight == null) {
                    if (flights.size() >= flightLimit) { rejected.incrementAndGet(); throw new Capacity(); }
                    flight = new Flight(System.nanoTime() + budgetNanos);
                    flights.put(versionedKey,flight);
                    Flight owned = flight;
                    try { workers.execute(() -> execute(versionedKey,owned,work)); started.incrementAndGet(); }
                    catch (RejectedExecutionException capacity) {
                        flights.remove(versionedKey,owned); rejected.incrementAndGet(); throw new Capacity();
                    }
                } else joined.incrementAndGet();
            }
            try {
                long remaining = flight.budget.remaining();
                if (remaining <= 0) throw new TimeoutException();
                return flight.result.get(remaining,TimeUnit.NANOSECONDS);
            } catch (TimeoutException expired) { timedOut.incrementAndGet(); throw new Deadline(); }
            catch (InterruptedException cancelled) { Thread.currentThread().interrupt(); throw new Cancelled(); }
            catch (ExecutionException failed) {
                if (failed.getCause() instanceof RuntimeException runtime) throw runtime;
                if (failed.getCause() instanceof Error error) throw error;
                throw new IllegalStateException("unexpected_cache_load_failure");
            }
        } finally { callers.release(); }
    }
    private void execute(String key, Flight flight, Function<Budget,Optional<CacheAsideTickets.Result>> work) {
        try {
            flight.budget.check();
            var result = work.apply(flight.budget);
            flight.budget.check();
            flight.result.complete(result);
        } catch (Throwable failure) { flight.result.completeExceptionally(failure); }
        finally {
            // Do not remove a timed-out flight while its blocking origin call is still running.
            synchronized (this) { flights.remove(key,flight); }
        }
    }
    public synchronized Snapshot snapshot() {
        return new Snapshot(flights.size(),callerLimit-callers.availablePermits(),started.get(),joined.get(),rejected.get(),timedOut.get());
    }
    @Override public void close() {
        synchronized (this) {
            closed = true;
            flights.values().forEach(flight -> flight.result.completeExceptionally(new Closed()));
            workers.shutdownNow();
        }
        try {
            if (!workers.awaitTermination(5,TimeUnit.SECONDS)) throw new IllegalStateException("cache_load_workers_not_stopped");
        } catch (InterruptedException interrupted) {
            Thread.currentThread().interrupt(); throw new IllegalStateException("cache_load_cleanup_interrupted");
        }
    }
}
