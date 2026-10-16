package com.csfundamentals.aiexample;

import java.nio.file.Path;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.*;
import org.springframework.ai.chat.messages.AssistantMessage;
import static org.junit.jupiter.api.Assertions.*;

class KnowledgeTests {
    private KnowledgeStore store;
    @BeforeEach void setup() { store = new KnowledgeStore("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", ""); }
    private KnowledgeService service(java.util.function.Function<String, String> generate) {
        ChatModel model = prompt -> new ChatResponse(List.of(new Generation(new AssistantMessage(generate.apply(prompt.getContents())))));
        return new KnowledgeService(store, ChatClient.create(model));
    }
    @Test void tenantFilterHappensBeforeGeneration() {
        store.put("alice", "returns", 0, "Refund", "Refund within 14 days", true);
        store.put("bob", "secret", 0, "Refund", "TENANT_B_PRIVATE_VALUE", true);
        var answer = service(prompt -> {
            assertTrue(prompt.contains("Refund within 14 days")); assertFalse(prompt.contains("TENANT_B_PRIVATE_VALUE"));
            return "{\"answer\":\"Within 14 days\",\"citations\":[\"returns:v1\"]}";
        }).ask("alice", "refund policy");
        assertEquals(List.of("returns:v1"), answer.citations());
    }
    @Test void unsupportedOrOtherTenantCitationsAreRejected() {
        store.put("alice", "returns", 0, "Refund", "Refund within 14 days", true);
        assertEquals("unsupported_citation", assertThrows(IllegalArgumentException.class,
                () -> service(prompt -> "{\"answer\":\"Made up\",\"citations\":[\"secret:v1\"]}").ask("alice", "refund")).getMessage());
    }
    @Test void noMatchingEvidenceDoesNotCallModel() {
        var calls = new AtomicInteger();
        var answer = service(prompt -> { calls.incrementAndGet(); return "{}"; }).ask("alice", "refund");
        assertEquals("Insufficient evidence", answer.answer()); assertEquals(0, calls.get());
    }
    @Test void revocationDuringGenerationInvalidatesAnswer() {
        store.put("alice", "returns", 0, "Refund", "Refund within 14 days", true);
        assertThrows(SecurityException.class, () -> service(prompt -> {
            store.revoke("alice", "returns", 1);
            return "{\"answer\":\"Within 14 days\",\"citations\":[\"returns:v1\"]}";
        }).ask("alice", "refund"));
    }
    @Test void versionConflictAndTombstonePreventReusingOldCitation() {
        store.put("alice", "returns", 0, "Refund", "14 days", true);
        assertThrows(KnowledgeStore.Conflict.class, () -> store.put("alice", "returns", 0, "Refund", "30 days", true));
        store.revoke("alice", "returns", 1);
        assertTrue(store.visible("alice").isEmpty());
        assertThrows(KnowledgeStore.Conflict.class, () -> store.put("alice", "returns", 1, "Refund", "30 days", true));
        var replacement = store.put("alice", "returns", 2, "Refund", "30 days", true);
        assertEquals("returns:v3", replacement.citation());
    }
    @Test void updatesAndRevocationsAreVisibleWithoutAStaleCache() {
        store.put("alice", "returns", 0, "Refund", "14 days", true);
        var before = store.visible("alice");
        store.put("alice", "returns", 1, "Refund", "30 days", true);
        assertFalse(store.stillAuthorized("alice", before));
        assertEquals("30 days", store.visible("alice").get(0).text());
    }
    @Test void unknownPrincipalCannotChooseATenant() {
        assertThrows(SecurityException.class, () -> store.visible("admin"));
    }
    @Test void jdbcFileSurvivesStoreReconstruction(@TempDir Path directory) {
        String url = "jdbc:h2:file:" + directory.resolve("knowledge");
        var first = new KnowledgeStore(url, "sa", "");
        first.put("alice", "policy", 0, "Shipping", "Tracked delivery", true);
        var restarted = new KnowledgeStore(url, "sa", "");
        assertEquals("Tracked delivery", restarted.visible("alice").get(0).text());
        assertTrue(restarted.visible("bob").isEmpty());
    }
}
