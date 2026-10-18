package com.csfundamentals.aiexample;

import java.sql.*;
import java.util.*;
import java.util.concurrent.atomic.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.model.*;
import org.springframework.ai.chat.messages.AssistantMessage;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

/** Explicit-env integration: absent pgvector is a skip locally, never invented vector evidence. */
@EnabledIfEnvironmentVariable(named="AI_VECTOR_TEST_JDBC_URL", matches="jdbc:postgresql:.*")
class PgVectorTests {
    private final String baseUrl = System.getenv("AI_VECTOR_TEST_JDBC_URL");
    private final String user = System.getenv().getOrDefault("AI_VECTOR_TEST_DB_USER", "postgres");
    private final String password = System.getenv().getOrDefault("AI_VECTOR_TEST_DB_PASSWORD", "");
    private String schema;
    private String url;
    private KnowledgeStore store;
    private PgVectorKnowledgeIndex index;
    private FixtureEmbeddings provider;
    private static EmbeddingSpace space(String name, int dimensions) {
        return new EmbeddingSpace(name, "fixture:geometry", "a".repeat(64), dimensions, EmbeddingSpace.CHUNK_POLICY);
    }
    private static final class FixtureEmbeddings implements EmbeddingProvider {
        private final EmbeddingSpace space;
        private final AtomicInteger calls = new AtomicInteger();
        private boolean fail;
        private Runnable duringEmbed = () -> {};
        FixtureEmbeddings(EmbeddingSpace space) { this.space = space; }
        @Override public EmbeddingSpace space() { return space; }
        @Override public List<float[]> embed(List<String> inputs) {
            calls.incrementAndGet(); duringEmbed.run();
            if (fail) throw new Failure("fixture_failure");
            return inputs.stream().map(text -> text.contains("Refund") ? new float[]{1,0.01f,0}
                    : text.contains("sports") ? new float[]{0,1,0}
                    : text.contains("distant") ? new float[]{0,0,1} : new float[]{1,0.01f,0}).toList();
        }
    }
    @BeforeEach void setup() throws Exception {
        schema = "cs_vector_test_" + UUID.randomUUID().toString().replace("-", "");
        try (var connection = DriverManager.getConnection(baseUrl, user, password); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + schema);
        }
        url = baseUrl + (baseUrl.contains("?") ? "&" : "?") + "currentSchema=" + schema + ",public";
        store = new KnowledgeStore(url, user, password);
        index = new PgVectorKnowledgeIndex(url, user, password, space("fixture_v1", 3));
        provider = new FixtureEmbeddings(space("fixture_v1", 3));
    }
    @AfterEach void cleanup() throws Exception {
        if (schema == null) return;
        try (var connection = DriverManager.getConnection(baseUrl, user, password); var statement = connection.createStatement()) {
            statement.execute("SET lock_timeout='2s'"); statement.execute("SET statement_timeout='5s'");
            statement.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
    private VectorKnowledgeRetrieval retrieval(PgVectorKnowledgeIndex.Mode mode) {
        return new VectorKnowledgeRetrieval(store, provider, index, mode);
    }
    private List<String> ids(KnowledgeRetrieval.Result result) { return result.sources().stream().map(KnowledgeRetrieval.Evidence::citation).toList(); }
    private static boolean executedHnsw(tools.jackson.databind.JsonNode node) {
        if (node.isObject() && node.path("Index Name").isString()
                && node.path("Index Name").asString().equals("knowledge_vectors_fixture_v1_a_ann")
                && node.path("Actual Loops").asDouble(0)>0) return true;
        for (var child : node) if (executedHnsw(child)) return true;
        return false;
    }
    @Test void actualPgvectorExactAnnTenantIsolationAndHnswPlan() throws Exception {
        store.put("alice", "refund", 0, "Refund", "Refund within 14 days", true);
        store.put("alice", "sports", 0, "Sports", "sports basketball", true);
        store.put("alice", "distant", 0, "Distant", "distant geography", true);
        store.put("bob", "secret", 0, "Refund", "TENANT_B_PRIVATE Refund within 99 days", true);
        var exact = retrieval(PgVectorKnowledgeIndex.Mode.EXACT);
        assertFalse(exact.status("alice").ready());
        exact.rebuild("alice"); exact.rebuild("bob");
        var exactResult = exact.retrieve("alice", "Refund");
        var annResult = retrieval(PgVectorKnowledgeIndex.Mode.ANN).retrieve("alice", "Refund");
        assertEquals("refund:v1:c0", ids(exactResult).get(0));
        assertEquals("refund:v1:c0", ids(annResult).get(0));
        assertTrue(annResult.sources().stream().allMatch(source -> source.document().tenant().equals("tenant-a")));
        assertFalse(annResult.sources().stream().anyMatch(source -> source.text().contains("TENANT_B_PRIVATE")));
        String exactPlan = index.explain("alice", new float[]{1,0,0}, PgVectorKnowledgeIndex.Mode.EXACT, false);
        String annPlan = index.explain("alice", new float[]{1,0,0}, PgVectorKnowledgeIndex.Mode.ANN, true);
        assertFalse(exactPlan.contains("_ann"), exactPlan);
        assertTrue(annPlan.contains("knowledge_vectors_fixture_v1_a_ann"), annPlan);
        assertTrue(executedHnsw(new ObjectMapper().readTree(annPlan)), annPlan);
        // This fixture discourages seqscan and sort only for the diagnostic, and asserts the
        // real HNSW access path actually executed. Runtime queries retain normal planner freedom.
        // It does not claim a production planner choice, ANN error rate, semantic relevance or speedup.
        System.out.println("PGVECTOR_EXACT_PLAN=" + exactPlan.replaceAll("\\s+", " "));
        System.out.println("PGVECTOR_HNSW_PLAN=" + annPlan.replaceAll("\\s+", " "));
        System.out.println("PGVECTOR_GEOMETRY=" + new ObjectMapper().writeValueAsString(Map.of(
                "exact_ids", ids(exactResult), "ann_ids", ids(annResult),
                "ann_overlap_at_3", ids(annResult).stream().filter(ids(exactResult)::contains).count() / 3.0,
                "fixture_relevant_id", "sports:v1:c0", "fixture_passage_recall_at_1", 0,
                "ann_overlap_at_1", ids(annResult).get(0).equals(ids(exactResult).get(0)) ? 1 : 0,
                "scope", "authored geometry and label; no embedding-model semantics")));
    }
    @Test void staleUpdateRevocationAndFailedRebuildCannotPublishPartialState() {
        store.put("alice", "policy", 0, "Policy", "Refund 14 days", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT);
        var initial = retrieval.rebuild("alice");
        store.put("alice", "policy", 1, "Policy", "Refund 30 days", true);
        int calls = provider.calls.get();
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> retrieval.retrieve("alice", "Refund"));
        assertEquals(calls, provider.calls.get(), "stale index must fail before spending another embedding call");
        provider.fail = true;
        assertThrows(EmbeddingProvider.Failure.class, () -> retrieval.rebuild("alice"));
        assertEquals(initial.generation(), retrieval.status("alice").generation());
        provider.fail = false;
        retrieval.rebuild("alice");
        assertEquals("policy:v2:c0", ids(retrieval.retrieve("alice", "Refund")).get(0));
        store.revoke("alice", "policy", 2);
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> retrieval.retrieve("alice", "Refund"));
        retrieval.rebuild("alice");
        int afterRebuild = provider.calls.get();
        assertTrue(retrieval.retrieve("alice", "Refund").sources().isEmpty());
        assertEquals(afterRebuild, provider.calls.get(), "empty corpus must avoid embedding calls too");
    }
    @Test void sourceChangesDuringEmbeddingPreventStaleGenerationActivation() {
        store.put("alice", "policy", 0, "Policy", "Refund 14 days", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT);
        var initial = retrieval.rebuild("alice");
        provider.duringEmbed = () -> store.put("alice", "policy", 1, "Policy", "Refund 30 days", true);
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> retrieval.rebuild("alice"));
        assertEquals(initial.generation(), retrieval.status("alice").generation());
    }
    @Test void namespacesCannotMixDimensionsAndNewNamespaceMigrationDoesNotMutateOldOne() {
        store.put("alice", "policy", 0, "Policy", "Refund 14 days", true);
        var first = retrieval(PgVectorKnowledgeIndex.Mode.EXACT); first.rebuild("alice");
        assertThrows(IllegalArgumentException.class, () -> new PgVectorKnowledgeIndex(url, user, password, space("fixture_v1", 2)));
        var secondSpace = space("fixture_v2", 3);
        var secondIndex = new PgVectorKnowledgeIndex(url, user, password, secondSpace);
        assertThrows(IllegalArgumentException.class, () -> new VectorKnowledgeRetrieval(store, provider, secondIndex, PgVectorKnowledgeIndex.Mode.EXACT));
        var second = new VectorKnowledgeRetrieval(store, new FixtureEmbeddings(secondSpace), secondIndex, PgVectorKnowledgeIndex.Mode.EXACT);
        assertFalse(second.status("alice").ready());
        assertTrue(first.status("alice").ready());
        second.rebuild("alice");
        assertEquals(ids(first.retrieve("alice", "Refund")), ids(second.retrieve("alice", "Refund")));
        assertThrows(SecurityException.class, () -> second.status("mallory"));
    }
    @Test void javaRagUsesFreshChunksAndChecksRevocationAfterAnswerGeneration() {
        store.put("alice", "policy", 0, "Policy", "Refund within 14 days", true);
        store.put("bob", "secret", 0, "Policy", "TENANT_B_PRIVATE", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT); retrieval.rebuild("alice");
        ChatModel chat = prompt -> {
            assertTrue(prompt.getContents().contains("Refund within 14 days"));
            assertFalse(prompt.getContents().contains("TENANT_B_PRIVATE"));
            return new ChatResponse(List.of(new Generation(new AssistantMessage("{\"answer\":\"14 days\",\"citations\":[\"policy:v1:c0\"]}"))));
        };
        var service = new KnowledgeService(store, ChatClient.create(chat), retrieval);
        assertEquals(List.of("policy:v1:c0"), service.ask("alice", "Refund").citations());
        assertEquals("pgvector-exact", service.ask("alice", "Refund").retrieval());
        ChatModel revokeDuringGeneration = prompt -> {
            store.revoke("alice", "policy", 1);
            return chat.call(prompt);
        };
        assertThrows(SecurityException.class, () -> new KnowledgeService(store, ChatClient.create(revokeDuringGeneration), retrieval).ask("alice", "Refund"));
    }
    @Test void laterDocumentChunkCanReachActualAnswerContextAndChunkCitation() {
        store.put("alice", "long-policy", 0, "Policy", "sports ".repeat(200) + "Refund within 14 days", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT); retrieval.rebuild("alice");
        ChatModel chat = prompt -> {
            assertTrue(prompt.getContents().contains("Refund within 14 days"));
            return new ChatResponse(List.of(new Generation(new AssistantMessage("{\"answer\":\"14 days\",\"citations\":[\"long-policy:v1:c1\"]}"))));
        };
        assertEquals(List.of("long-policy:v1:c1"), new KnowledgeService(store, ChatClient.create(chat), retrieval).ask("alice", "Refund").citations());
    }
    @Test void revocationDuringQuestionEmbeddingPreventsContextAssembly() {
        store.put("alice", "policy", 0, "Policy", "Refund within 14 days", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT); retrieval.rebuild("alice");
        provider.duringEmbed = () -> store.revoke("alice", "policy", 1);
        assertThrows(KnowledgeRetrieval.Unavailable.class, () -> retrieval.retrieve("alice", "Refund"));
    }
    @Test void staleRowsCannotJoinAChangedSourceEvenIfManifestIsTampered() throws Exception {
        store.put("alice", "policy", 0, "Policy", "Refund 14 days", true);
        var retrieval = retrieval(PgVectorKnowledgeIndex.Mode.EXACT); retrieval.rebuild("alice");
        store.put("alice", "policy", 1, "Policy", "Refund 30 days", true);
        // Deliberate SQL fault injection bypasses the manifest gate, to exercise the separate version join.
        try (var connection = DriverManager.getConnection(url, user, password);
             var statement = connection.prepareStatement("UPDATE knowledge_vector_manifests SET fingerprint=? WHERE namespace='fixture_v1' AND tenant='tenant-a'")) {
            statement.setString(1, EmbeddingSpace.fingerprint(store.visible("alice"))); statement.executeUpdate();
        }
        assertTrue(retrieval.retrieve("alice", "Refund").sources().isEmpty());
    }
}
