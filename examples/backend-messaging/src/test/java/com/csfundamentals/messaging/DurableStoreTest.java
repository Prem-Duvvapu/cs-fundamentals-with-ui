package com.csfundamentals.messaging;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;
import static com.csfundamentals.messaging.DurableStore.Crash.*;

class DurableStoreTest {
    @TempDir Path directory;
    private final String password = UUID.randomUUID().toString();
    private DurableStore reopen() throws Exception { return new DurableStore("jdbc:h2:file:" + directory.resolve("owned"), password); }
    private final TicketEvent event = new TicketEvent("event-1", "ticket-1", 3);

    @Test void sourceAndOutboxCommitTogetherOrRollback() throws Exception {
        DurableStore store = reopen();
        assertThrows(DurableStore.SimulatedCrash.class, () -> store.enqueue(event, BEFORE_SOURCE_COMMIT));
        assertEquals(0, reopen().sourceAmount("ticket-1")); assertTrue(reopen().pending().isEmpty());
        store.enqueue(event, NONE);
        assertEquals(3, reopen().sourceAmount("ticket-1")); assertEquals(List.of(event), reopen().pending());
    }
    @Test void publishThenCrashRepublishesSameIdAfterReopen() throws Exception {
        DurableStore store = reopen(); store.enqueue(event, NONE);
        List<TicketEvent> fakeDeliveries = new ArrayList<>();
        assertThrows(DurableStore.SimulatedCrash.class, () -> store.relay(fakeDeliveries::add, AFTER_PUBLISH));
        assertEquals(List.of(event), reopen().pending());
        reopen().relay(fakeDeliveries::add, NONE);
        assertEquals(List.of(event, event), fakeDeliveries); assertTrue(reopen().pending().isEmpty());
    }
    @Test void effectAndInboxRollbackTogetherBeforeCommit() throws Exception {
        assertThrows(DurableStore.SimulatedCrash.class, () -> reopen().consume(event, BEFORE_EFFECT_COMMIT));
        assertEquals(0, reopen().projectionAmount("ticket-1"));
        assertTrue(reopen().consume(event, NONE)); assertEquals(3, reopen().projectionAmount("ticket-1"));
    }
    @Test void crashAfterEffectBeforeAckIsDeduplicatedAfterReopen() throws Exception {
        assertThrows(DurableStore.SimulatedCrash.class, () -> reopen().consume(event, AFTER_EFFECT_COMMIT));
        assertEquals(3, reopen().projectionAmount("ticket-1"));
        assertFalse(reopen().consume(event, NONE)); assertEquals(3, reopen().projectionAmount("ticket-1"));
    }
    @Test void duplicateIdCannotChangePayloadOrLocalBusinessEffect() throws Exception {
        reopen().consume(event, NONE);
        assertThrows(IllegalArgumentException.class, () -> reopen().consume(new TicketEvent(event.id(), event.ticketId(), 9), NONE));
        assertEquals(3, reopen().projectionAmount("ticket-1"));
    }
    @Test void storageRefusesRemoteUrlsAndMissingGeneratedSecret() {
        assertThrows(IllegalArgumentException.class, () -> new DurableStore("jdbc:h2:tcp://remote/example",password));
        assertThrows(IllegalArgumentException.class, () -> new DurableStore("jdbc:h2:file:owned;AUTO_SERVER=TRUE",password));
        assertThrows(IllegalArgumentException.class, () -> new DurableStore("jdbc:h2:file:owned",null));
    }
    @Test void failedPublishKeepsPendingEvent() throws Exception {
        reopen().enqueue(event, NONE);
        assertThrows(java.io.IOException.class, () -> reopen().relay(ignored -> { throw new java.io.IOException("Ambiguous send"); }, NONE));
        assertEquals(List.of(event), reopen().pending());
    }
    @Test void additiveMetadataIsCompatibleButBreakingVersionAndWrongTypesAreRejected() {
        String json = event.json();
        assertEquals(event, TicketEvent.parse(json.substring(0,json.length()-1) + ",\"traceId\":\"synthetic\"}"));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse(json.replace("\"schemaVersion\":1", "\"schemaVersion\":2")));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse(json.replace("\"delta\":3", "\"delta\":\"3\"")));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse("{"));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse(json + " {}"));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse(json.substring(0,json.length()-1) + ",\"delta\":2}"));
        assertThrows(IllegalArgumentException.class, () -> TicketEvent.parse("x".repeat(4097)));
        assertThrows(IllegalArgumentException.class, () -> new TicketEvent("id", "ticket", 0));
    }
}
