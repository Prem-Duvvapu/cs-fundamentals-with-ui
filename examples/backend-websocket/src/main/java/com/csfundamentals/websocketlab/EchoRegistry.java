package com.csfundamentals.websocketlab;

import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.context.ApplicationListener;
import org.springframework.context.event.ContextClosedEvent;
import org.springframework.web.socket.*;
import org.springframework.web.socket.adapter.standard.StandardWebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

final class EchoRegistry extends TextWebSocketHandler implements AutoCloseable, ApplicationListener<ContextClosedEvent> {
    static final int GLOBAL_LIMIT = 3, PRINCIPAL_LIMIT = 2, ACK_LIMIT = 4, QUEUE_BYTES = 4096;
    static final long ACK_MILLIS = 2000, LEASE_MILLIS = 30000;
    static final String SEND_TIMEOUT = "org.apache.tomcat.websocket.BLOCKING_SEND_TIMEOUT";
    static final String CLOSE_TIMEOUT = "org.apache.tomcat.websocket.SESSION_CLOSE_TIMEOUT";
    private final Set<Reservation> reservations = new HashSet<>();
    private final ScheduledExecutorService timer;
    private final int sessionIdle;
    private final long socketIdle;
    private boolean closed;
    private int highWater, unackedHighWater, queueHighWater, nativeConfigured;
    private final Map<Integer, Integer> closedCodes = new HashMap<>();

    static final class Reservation {
        final String principal, session;
        final long created = System.nanoTime();
        final AtomicBoolean released = new AtomicBoolean();
        volatile Connection connection;
        Reservation(String principal, String session) { this.principal = principal; this.session = session; }
        boolean bound() { return connection != null; }
    }
    EchoRegistry(int sessionIdle, long socketIdle) {
        this.sessionIdle = sessionIdle; this.socketIdle = socketIdle;
        timer = Executors.newSingleThreadScheduledExecutor(runnable -> {
            Thread thread = new Thread(runnable, "owned-ws-deadlines"); thread.setDaemon(true); return thread;
        });
        timer.scheduleAtFixedRate(this::expire, 100, 100, TimeUnit.MILLISECONDS);
    }
    int sessionIdleSeconds() { return sessionIdle; }
    synchronized Reservation reserve(String principal, String session) {
        if (closed || reservations.size() >= GLOBAL_LIMIT
                || reservations.stream().filter(item -> item.principal.equals(principal)).count() >= PRINCIPAL_LIMIT) return null;
        Reservation reservation = new Reservation(principal, session);
        reservations.add(reservation); highWater = Math.max(highWater, reservations.size());
        return reservation;
    }
    synchronized void release(Reservation reservation) {
        if (reservation.released.compareAndSet(false, true)) reservations.remove(reservation);
    }
    void reject(Reservation reservation) {
        Connection connection;
        synchronized (this) {
            connection = reservation.connection;
            if (connection == null) { release(reservation); return; }
        }
        connection.stop(1008);
    }
    private synchronized void expirePending(Reservation reservation, long now) {
        // Recheck under the same lock as bind: logout/deadline must not orphan a newly opened socket.
        if (reservation.connection == null && now-reservation.created >= TimeUnit.SECONDS.toNanos(2)) release(reservation);
    }
    synchronized int active() { return reservations.size(); }
    synchronized Map<String, Object> evidence() {
        return Map.of("active", active(), "connectionHighWater", highWater, "unackedHighWater", unackedHighWater,
            "queueBytesHighWater", queueHighWater, "nativeSessionsConfigured", nativeConfigured,
            "closeCodes", new TreeMap<>(closedCodes));
    }
    private synchronized List<Reservation> snapshot() { return List.copyOf(reservations); }
    void invalidate(String session) {
        for (Reservation reservation : snapshot()) if (reservation.session.equals(session)) {
            reject(reservation);
        }
    }
    private void expire() {
        long now = System.nanoTime();
        for (Reservation reservation : snapshot()) {
            Connection connection = reservation.connection;
            if (connection != null) connection.expire(now);
            else expirePending(reservation, now);
        }
    }
    @Override public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        Object value = session.getAttributes().get(HandshakePolicy.RESERVATION);
        if (!(value instanceof Reservation reservation) || reservation.released.get()
                || session.getPrincipal() == null || !reservation.principal.equals(session.getPrincipal().getName())) {
            session.close(new CloseStatus(1008, "policy")); return;
        }
        try {
            if (!(session instanceof StandardWebSocketSession standard)) throw new IllegalStateException("Expected standard container");
            jakarta.websocket.Session nativeSession = standard.getNativeSession();
            if (!nativeSession.getClass().getName().startsWith("org.apache.tomcat.websocket."))
                throw new IllegalStateException("Expected declared Tomcat container");
            nativeSession.getUserProperties().put(SEND_TIMEOUT, 500L);
            nativeSession.getUserProperties().put(CLOSE_TIMEOUT, 500L);
            nativeSession.getAsyncRemote().setSendTimeout(500L);
            if (!Long.valueOf(500).equals(nativeSession.getUserProperties().get(SEND_TIMEOUT))
                    || !Long.valueOf(500).equals(nativeSession.getUserProperties().get(CLOSE_TIMEOUT))
                    || nativeSession.getAsyncRemote().getSendTimeout() != 500)
                throw new IllegalStateException("Native deadline configuration not retained");
            session.setTextMessageSizeLimit(1024); session.setBinaryMessageSizeLimit(1024);
            Connection connection = new Connection(session, nativeSession, reservation);
            synchronized (this) {
                if (reservation.released.get() || closed) { session.close(new CloseStatus(1008, "policy")); return; }
                reservation.connection = connection;
                nativeConfigured++;
            }
        } catch (Exception failure) { release(reservation); throw failure; }
    }
    @Override protected void handleTextMessage(WebSocketSession session, TextMessage message) {
        Connection connection = connection(session);
        if (connection != null) connection.receive(message.getPayload());
    }
    @Override protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        Connection connection = connection(session); if (connection != null) connection.stop(1003);
    }
    @Override public void handleTransportError(WebSocketSession session, Throwable failure) {
        Connection connection = connection(session); if (connection != null) connection.stop(1011);
    }
    @Override public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Connection connection = connection(session); if (connection != null) connection.finished(status.getCode());
    }
    private Connection connection(WebSocketSession session) {
        Object value = session.getAttributes().get(HandshakePolicy.RESERVATION);
        return value instanceof Reservation reservation ? reservation.connection : null;
    }
    @Override public void onApplicationEvent(ContextClosedEvent event) { close(); }
    @Override public void close() {
        synchronized (this) { closed = true; }
        timer.shutdownNow();
        for (Reservation reservation : snapshot()) {
            if (reservation.connection != null) reservation.connection.stop(1001); else release(reservation);
        }
        try { if (!timer.awaitTermination(2, TimeUnit.SECONDS)) throw new IllegalStateException("Owned deadline worker not stopped"); }
        catch (InterruptedException interrupted) { Thread.currentThread().interrupt(); throw new IllegalStateException("Interrupted cleanup"); }
    }

    private final class Connection {
        final WebSocketSession socket;
        final jakarta.websocket.Session nativeSession;
        final Reservation reservation;
        final long created = System.nanoTime();
        final Map<String, Long> awaiting = new LinkedHashMap<>();
        final Set<String> seen = new HashSet<>();
        final ArrayDeque<String> outbound = new ArrayDeque<>();
        long touched = created;
        int queueBytes, messages;
        boolean sending, stopped;
        Connection(WebSocketSession socket, jakarta.websocket.Session nativeSession, Reservation reservation) {
            this.socket = socket; this.nativeSession = nativeSession; this.reservation = reservation;
        }
        synchronized void receive(String payload) {
            if (stopped) return;
            if (++messages > 32) { stop(1008); return; }
            if (payload.getBytes(StandardCharsets.UTF_8).length > 1024) { stop(1009); return; }
            Protocol.Command command;
            try { command = Protocol.parse(payload); }
            catch (IllegalArgumentException failure) { stop(1008); return; }
            touched = System.nanoTime();
            if (command.type().equals("ack")) {
                if (awaiting.remove(command.id()) == null) stop(1008);
                return;
            }
            if (awaiting.size() >= ACK_LIMIT) { stop(1013); return; }
            if (!seen.add(command.id())) { stop(1008); return; }
            awaiting.put(command.id(), touched);
            String response = Protocol.echo(command, reservation.principal);
            int bytes = response.getBytes(StandardCharsets.UTF_8).length;
            if (outbound.size() >= ACK_LIMIT || queueBytes+bytes > QUEUE_BYTES) { stop(1013); return; }
            outbound.add(response); queueBytes += bytes;
            synchronized (EchoRegistry.this) {
                unackedHighWater = Math.max(unackedHighWater, awaiting.size());
                queueHighWater = Math.max(queueHighWater, queueBytes);
            }
            sendNext();
        }
        private synchronized void sendNext() {
            if (stopped || sending || outbound.isEmpty()) return;
            String response = outbound.remove(); queueBytes -= response.getBytes(StandardCharsets.UTF_8).length;
            sending = true;
            try {
                nativeSession.getAsyncRemote().sendText(response, result -> {
                    synchronized (Connection.this) {
                        sending = false;
                        if (!result.isOK()) stop(1011); else sendNext();
                    }
                });
            } catch (RuntimeException failure) { sending = false; stop(1011); }
        }
        synchronized void expire(long now) {
            if (stopped) return;
            if (!awaiting.isEmpty() && now-awaiting.values().iterator().next() >= TimeUnit.MILLISECONDS.toNanos(ACK_MILLIS)) stop(1013);
            else if (now-touched >= TimeUnit.MILLISECONDS.toNanos(socketIdle) || now-created >= TimeUnit.MILLISECONDS.toNanos(LEASE_MILLIS)) stop(1008);
        }
        synchronized void stop(int code) {
            if (stopped) return;
            finished(code);
            try { socket.close(new CloseStatus(code, "bounded policy")); }
            catch (Exception ignored) { /* Native send/close deadlines plus owned-process deadline bound cleanup. */ }
        }
        synchronized void finished(int code) {
            if (stopped) return;
            stopped = true; awaiting.clear(); outbound.clear(); queueBytes = 0;
            synchronized (EchoRegistry.this) { closedCodes.merge(code, 1, Integer::sum); }
            release(reservation);
        }
    }
}
