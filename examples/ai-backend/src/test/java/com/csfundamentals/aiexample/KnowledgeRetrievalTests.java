package com.csfundamentals.aiexample;

import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import org.junit.jupiter.api.*;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.*;
import org.springframework.ai.chat.messages.AssistantMessage;
import static org.junit.jupiter.api.Assertions.*;

class KnowledgeRetrievalTests {
    private KnowledgeStore store;
    private final AtomicInteger calls = new AtomicInteger();
    private ChatClient chat;
    @BeforeEach void setup() {
        store = new KnowledgeStore("jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1", "sa", "");
        ChatModel model = prompt -> { calls.incrementAndGet(); return new ChatResponse(List.of(new Generation(new AssistantMessage("{}")))); };
        chat = ChatClient.create(model);
    }
    @Test void otherTenantOrForgedBodiesNeverReachGeneration() {
        var privateDocument = store.put("bob", "secret", 0, "Policy", "Bob secret", true);
        KnowledgeRetrieval wrongTenant = (principal, question) -> new KnowledgeRetrieval.Result("test", List.of(
                new KnowledgeRetrieval.Evidence(privateDocument, "secret:v1:c0", privateDocument.text())));
        assertThrows(SecurityException.class, () -> new KnowledgeService(store, chat, wrongTenant).ask("alice", "policy"));
        var real = store.put("alice", "policy", 0, "Policy", "14 days", true);
        var forged = new KnowledgeStore.Document(real.id(), real.tenant(), real.version(), real.title(), "Altered body", true);
        KnowledgeRetrieval wrongBody = (principal, question) -> new KnowledgeRetrieval.Result("test", List.of(
                new KnowledgeRetrieval.Evidence(forged, "policy:v1:c0", forged.text())));
        assertThrows(SecurityException.class, () -> new KnowledgeService(store, chat, wrongBody).ask("alice", "policy"));
        assertEquals(0, calls.get());
    }
    @Test void sourceRevokedDuringRetrievalFailsBeforeGeneration() {
        var real = store.put("alice", "policy", 0, "Policy", "14 days", true);
        KnowledgeRetrieval revoked = (principal, question) -> {
            store.revoke("alice", "policy", 1);
            return new KnowledgeRetrieval.Result("test", List.of(new KnowledgeRetrieval.Evidence(real, "policy:v1:c0", real.text())));
        };
        assertThrows(SecurityException.class, () -> new KnowledgeService(store, chat, revoked).ask("alice", "policy"));
        assertEquals(0, calls.get());
    }
    @Test void lexicalDefaultAndExplicitDisabledIndexHaveNoProviderSideEffects() {
        var service = new KnowledgeService(store, chat);
        assertEquals("lexical-baseline", service.ask("alice", "policy").retrieval());
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> service.rebuildIndex("alice"));
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> service.indexStatus("alice"));
        assertEquals(0, calls.get());
    }
    @Test void fingerprintTracksVersionBodyAndTenantWithoutListOrderingDependence() {
        var a = store.put("alice", "a", 0, "Policy", "14 days", true);
        var b = store.put("alice", "b", 0, "Policy", "30 days", true);
        assertEquals(EmbeddingSpace.fingerprint(List.of(a,b)), EmbeddingSpace.fingerprint(List.of(b,a)));
        var changed = store.put("alice", "a", 1, "Policy", "14 days", true);
        assertNotEquals(EmbeddingSpace.fingerprint(List.of(a,b)), EmbeddingSpace.fingerprint(List.of(changed,b)));
    }
}
