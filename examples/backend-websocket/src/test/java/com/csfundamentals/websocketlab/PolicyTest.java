package com.csfundamentals.websocketlab;

import java.util.*;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.springframework.http.server.*;
import org.springframework.mock.web.*;
import static org.junit.jupiter.api.Assertions.*;

class PolicyTest {
    @Test void invalidationBeforeLateAdmissionCannotRestoreAnOldSession() {
        try (var registry = new EchoRegistry(120, 10000)) {
            authenticate(registry, "alice", "old-session");
            var admitted = registry.reserve("alice", "old-session");
            assertNotNull(admitted);
            registry.invalidate("old-session");
            assertEquals(0, registry.active());
            assertThrows(EchoRegistry.RevokedSession.class, () -> registry.reserve("alice", "old-session"),
                "A retained request must not revive a revoked session");
        }
    }
    @Test void capturedPrincipalCannotAcquireTheRotatedSessionsNewIdentity() {
        try (var registry = new EchoRegistry(120, 10000)) {
            authenticate(registry, "alice", "before-rotation");
            registry.invalidate("before-rotation");
            authenticate(registry, "bob", "after-rotation");
            assertThrows(EchoRegistry.RevokedSession.class, () -> registry.reserve("alice", "after-rotation"));
            var current = registry.reserve("bob", "after-rotation");
            assertNotNull(current);
            registry.invalidate("after-rotation");
            assertThrows(EchoRegistry.RevokedSession.class, () -> registry.reserve("bob", "after-rotation"));
            assertTrue(current.released.get()); assertEquals(0, registry.active());
        }
    }
    @Test void alreadyDestroyedSessionCannotBeRegisteredAfterItsListenerReturns() {
        try (var registry = new EchoRegistry(120, 10000)) {
            var session = new MockHttpSession(null, "destroyed");
            session.invalidate();
            registry.invalidate("destroyed");
            assertFalse(registry.authenticated(session, "alice"));
            assertThrows(EchoRegistry.RevokedSession.class, () -> registry.reserve("alice", "destroyed"));
        }
    }
    private static void authenticate(EchoRegistry registry, String principal, String session) {
        assertTrue(registry.authenticated(new MockHttpSession(null, session), principal));
    }
    @Test void strictProtocolRejectsIdentitySelectionDuplicatesAndUnsafeStructures() {
        for (String value : List.of("{}", "[]", "null", "{}{}", "{\"type\":\"echo\",\"id\":\"x\",\"text\":\"a\",\"owner\":\"bob\"}",
                "{\"type\":\"echo\",\"type\":\"ack\",\"id\":\"x\",\"text\":\"a\"}",
                "{\"type\":\"echo\",\"id\":\"x\",\"text\":[[[]]]}", "{\"type\":\"echo\",\"id\":\"x\",\"text\":\"\\ud800\"}"))
            assertThrows(IllegalArgumentException.class, () -> Protocol.parse(value));
    }
    @Test void validProtocolKeepsAckSeparateAndHasUtf8DocumentCap() {
        assertEquals("ack", Protocol.parse("{\"type\":\"ack\",\"id\":\"a-1\"}").type());
        assertEquals("hello", Protocol.parse("{\"type\":\"echo\",\"id\":\"a-1\",\"text\":\"hello\"}").text());
        assertThrows(IllegalArgumentException.class, () -> Protocol.parse("x".repeat(1025)));
        assertThrows(IllegalArgumentException.class, () -> Protocol.parse("é".repeat(600)));
    }
    @Test void concurrentPreUpgradeAdmissionCannotExceedGlobalLimit() throws Exception {
        try (var registry = new EchoRegistry(120, 10000)) {
            ExecutorService pool = Executors.newFixedThreadPool(8);
            try {
                CountDownLatch start = new CountDownLatch(1);
                List<Future<EchoRegistry.Reservation>> attempts = new ArrayList<>();
                for (int index = 0; index < 24; index++) {
                    String principal = "synthetic-"+index;
                    authenticate(registry, principal, principal);
                    attempts.add(pool.submit(() -> { assertTrue(start.await(2, TimeUnit.SECONDS)); return registry.reserve(principal, principal); }));
                }
                start.countDown(); int admitted = 0;
                for (Future<EchoRegistry.Reservation> attempt : attempts) if (attempt.get(3, TimeUnit.SECONDS) != null) admitted++;
                assertEquals(3, admitted); assertEquals(3, registry.active());
            } finally { pool.shutdownNow(); assertTrue(pool.awaitTermination(2, TimeUnit.SECONDS)); }
        }
    }
    @Test void PrincipalCapacityAndIdempotentReleaseAndLogoutOfPendingUpgrade() {
        try (var registry = new EchoRegistry(120, 10000)) {
            authenticate(registry, "alice", "session-a"); authenticate(registry, "alice", "session-b");
            authenticate(registry, "alice", "session-c");
            var first = registry.reserve("alice", "session-a"); var second = registry.reserve("alice", "session-b");
            assertNull(registry.reserve("alice", "session-c"));
            registry.release(first); registry.release(first); assertEquals(1, registry.active());
            authenticate(registry, "bob", "session-bob");
            assertNotNull(registry.reserve("bob", "session-bob"));
            registry.invalidate("session-bob");
            registry.invalidate("session-b"); assertEquals(0, registry.active());
            assertTrue(second.released.get());
        }
    }
    @Test void FailedHandshakeReleasesAdmissionAndNeverCopiesAllSessionAttributes() {
        try (var registry = new EchoRegistry(120, 10000)) {
            var policy = new HandshakePolicy(registry);
            var request = new MockHttpServletRequest(); request.setLocalPort(12345);
            request.setUserPrincipal(() -> "alice"); request.getSession().setAttribute("private-fixture", "not-copied");
            assertTrue(registry.authenticated(request.getSession(), "alice"));
            request.addHeader("Origin", "http://127.0.0.1:12345");
            var response = new ServletServerHttpResponse(new MockHttpServletResponse());
            Map<String, Object> attributes = new HashMap<>();
            assertTrue(policy.beforeHandshake(new ServletServerHttpRequest(request), response, registry, attributes));
            assertEquals(Set.of(HandshakePolicy.RESERVATION), attributes.keySet()); assertEquals(1, registry.active());
            policy.afterHandshake(new ServletServerHttpRequest(request), response, registry, new IllegalArgumentException("fixture"));
            assertEquals(0, registry.active());
        }
    }
    @Test void shutdownRefusesNewAdmissions() {
        var registry = new EchoRegistry(120, 10000);
        authenticate(registry, "alice", "session");
        registry.reserve("alice", "session"); registry.close();
        assertEquals(0, registry.active()); assertNull(registry.reserve("alice", "session"));
    }
}
