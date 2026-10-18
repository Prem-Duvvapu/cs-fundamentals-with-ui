package com.csfundamentals.aiexample;

import java.net.URI;
import java.nio.file.*;
import java.security.MessageDigest;
import java.sql.DriverManager;
import java.time.*;
import java.util.*;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.model.*;
import tools.jackson.databind.*;

final class EvaluateKnowledge {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Set<String> SCENARIOS = Set.of("normal", "wrong-answer", "bad-citation", "provider-error", "revoke");
    record Dataset(List<JsonNode> documents, List<JsonNode> cases, String corpusHash, String casesHash) {}

    static void run(String[] args) throws Exception {
        if (args.length != 4) throw new IllegalArgumentException("Usage: --evaluate-rag <corpus.json> <cases.jsonl> <report.json>");
        var data = read(Path.of(args[1]), Path.of(args[2]));
        String evidence = System.getenv().getOrDefault("AI_EVIDENCE", "fixture");
        String model = System.getenv().getOrDefault("AI_MODEL", "teaching-fixture");
        if (!Set.of("fixture", "live-local").contains(evidence) || evidence.equals("fixture") != model.equals("teaching-fixture"))
            throw new IllegalArgumentException("Explicit model/evidence mode mismatch");
        String digest = System.getenv().getOrDefault("AI_MODEL_DIGEST", "fixture");
        String runtime = System.getenv().getOrDefault("AI_RUNTIME_VERSION", "fixture");
        if (evidence.equals("live-local") && (!digest.matches("[a-f0-9]{64}") || runtime.equals("fixture")))
            throw new IllegalArgumentException("Live runs require model digest/runtime provenance");
        ChatModel live = null;
        if (evidence.equals("live-local")) {
            URI endpoint = URI.create(System.getenv().getOrDefault("AI_ENDPOINT", "http://127.0.0.1:11434/api/chat"));
            if (!Set.of("127.0.0.1", "localhost", "[::1]").contains(endpoint.getHost()))
                throw new IllegalArgumentException("Only loopback local inference is allowed");
            int timeout = Integer.parseInt(System.getenv().getOrDefault("AI_TIMEOUT_MS", "3000"));
            if (timeout < 1 || timeout > 30000) throw new IllegalArgumentException("timeout_limit");
            live = new OllamaHttpModel(endpoint, model, Duration.ofMillis(timeout), data.cases().size());
        }
        var report = new LinkedHashMap<String, Object>();
        report.put("version", 1); report.put("evidence", evidence); report.put("model", model);
        report.put("modelDigest", digest); report.put("runtimeVersion", runtime); report.put("provenanceVerification", evidence.equals("fixture") ? "in-process-copy-fixture" : "operator-declared digest/runtime; this evaluator does not verify the running model inventory"); report.put("at", Instant.now().toString());
        report.put("corpusSha256", data.corpusHash()); report.put("casesSha256", data.casesHash());
        report.put("retrieval", "lexical-baseline/top3/v1"); report.put("promptVersion", "knowledge-json-v1");
        report.put("limits", "Authored synthetic labels; substring fact checks are diagnostics, not entailment or human judgment. Injected faults are marked per case. No dense/ANN, live-model quality, cost or production assurance follows from fixture results.");
        var rows = new ArrayList<Map<String, Object>>();
        report.put("cases", rows); report.put("state", "running");
        Path path = Path.of(args[3]).toAbsolutePath();
        for (var row : data.cases()) {
            rows.add(evaluate(data, row, live));
            report.put("summary", RetrievalEvaluation.summarize(rows));
            checkpoint(path, report);
        }
        report.put("state", "complete"); checkpoint(path, report);
        System.out.println("RAG evidence=" + evidence + " cases=" + rows.size() + " report=" + path.getFileName());
    }

    static Map<String, Object> evaluate(Dataset data, JsonNode row, ChatModel live) throws Exception {
        String url = "jdbc:h2:mem:rag_eval_" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        String password = UUID.randomUUID().toString();
        long start = System.nanoTime();
        try {
            var store = new KnowledgeStore(url, "sa", password);
            for (var document : data.documents()) store.put(document.path("principal").asString(), document.path("id").asString(),
                    0, document.path("title").asString(), document.path("text").asString(), document.path("enabled").asBoolean());
            var baseline = KnowledgeRetrieval.lexical(store);
            var selected = new ArrayList<KnowledgeRetrieval.Evidence>();
            long[] retrievalNs = {0}, modelNs = {0};
            int[] modelCalls = {0};
            KnowledgeRetrieval traced = (principal, question) -> {
                long began = System.nanoTime();
                try { var found = baseline.retrieve(principal, question); selected.addAll(found.sources()); return found; }
                finally { retrievalNs[0] += System.nanoTime() - began; }
            };
            String scenario = row.path("scenario").asString();
            ChatModel generator = prompt -> {
                modelCalls[0]++;
                long began = System.nanoTime();
                try {
                    if (scenario.equals("provider-error")) throw new OllamaHttpModel.ModelFailure("injected_provider_deadline");
                    if (scenario.equals("revoke") && !selected.isEmpty()) {
                        var doc = selected.get(0).document(); store.revoke(row.path("principal").asString(), doc.id(), doc.version());
                    }
                    if (live != null && Set.of("normal", "revoke").contains(scenario)) return live.call(prompt);
                    // The fixture copies retrieved text; it never sees expected labels or chooses a relevant source.
                    String answer = scenario.equals("wrong-answer") ? "The invented answer is 900 days."
                            : selected.stream().map(KnowledgeRetrieval.Evidence::text).reduce((a, b) -> a + " " + b).orElse("Insufficient evidence");
                    var citations = scenario.equals("bad-citation") ? List.of("unretrieved:v1")
                            : selected.stream().map(KnowledgeRetrieval.Evidence::citation).distinct().toList();
                    return new ChatResponse(List.of(new Generation(new AssistantMessage(JSON.writeValueAsString(Map.of("answer", answer, "citations", citations))))));
                } finally { modelNs[0] += System.nanoTime() - began; }
            };
            var service = new KnowledgeService(store, ChatClient.create(generator), traced);
            KnowledgeService.Answer answer = null;
            String outcome, error = null;
            try { answer = service.ask(row.path("principal").asString(), row.path("question").asString());
                outcome = answer.citations().isEmpty() ? "abstain" : "answer";
            } catch (OllamaHttpModel.ModelFailure failure) { outcome = "provider-error"; error = failure.getMessage(); }
            catch (SecurityException failure) { outcome = "rejected-source"; error = failure.getMessage(); }
            catch (IllegalArgumentException failure) { outcome = "invalid-answer"; error = failure.getMessage(); }
            var result = new LinkedHashMap<String, Object>();
            result.put("id", row.path("id").asString()); result.put("slice", row.path("slice").asString());
            result.put("scenario", scenario); result.put("modelCalls", modelCalls[0]);
            result.put("generationEvidence", modelCalls[0] == 0 ? "not-called" : scenario.equals("normal") || scenario.equals("revoke")
                    ? (live == null ? "copy-fixture" : "live-local") : "injected-fault");
            result.put("outcome", outcome); result.put("error", error);
            result.put("outcomeMatches", outcome.equals(row.path("expectedOutcome").asString()));
            result.putAll(RetrievalEvaluation.score(strings(row.path("relevantSources")), selected.stream().map(KnowledgeRetrieval.Evidence::citation).distinct().toList(),
                    answer == null ? List.of() : answer.citations(), strings(row.path("expectedFacts")), strings(row.path("forbiddenFacts")), row.path("expectAbstain").asBoolean(), answer));
            result.put("retrievalMs", retrievalNs[0] / 1_000_000.0); result.put("modelMs", modelNs[0] / 1_000_000.0);
            result.put("totalMs", (System.nanoTime() - start) / 1_000_000.0);
            return result;
        } finally {
            try (var connection = DriverManager.getConnection(url, "sa", password); var statement = connection.createStatement()) { statement.execute("SHUTDOWN"); }
        }
    }

    static Dataset read(Path corpusPath, Path casesPath) throws Exception {
        byte[] corpus = bounded(corpusPath), cases = bounded(casesPath);
        var documents = JSON.readTree(corpus);
        if (!documents.isArray() || documents.isEmpty() || documents.size() > 32) throw new IllegalArgumentException("invalid_corpus");
        var docs = new ArrayList<JsonNode>(); var sourceIds = new HashSet<String>();
        for (var doc : documents) {
            if (!Set.of("alice", "bob").contains(doc.path("principal").asString()) || !label(doc, "id", 64)
                    || !text(doc, "title", 160) || !text(doc, "text", 1200) || !doc.path("enabled").isBoolean()
                    || !sourceIds.add(doc.path("principal").asString() + "/" + doc.path("id").asString()))
                throw new IllegalArgumentException("invalid_corpus_document");
            docs.add(doc);
        }
        var rows = new ArrayList<JsonNode>(); var ids = new HashSet<String>();
        for (var line : new String(cases, java.nio.charset.StandardCharsets.UTF_8).lines().filter(value -> !value.isBlank()).toList()) {
            var row = JSON.readTree(line);
            if (!label(row, "id", 80) || !ids.add(row.path("id").asString()) || !label(row, "slice", 40)
                    || !Set.of("alice", "bob").contains(row.path("principal").asString()) || !text(row, "question", 1000)
                    || !SCENARIOS.contains(row.path("scenario").asString()) || !row.path("expectAbstain").isBoolean()
                    || !Set.of("answer", "abstain", "provider-error", "rejected-source", "invalid-answer").contains(row.path("expectedOutcome").asString()))
                throw new IllegalArgumentException("invalid_rag_case");
            for (String key : List.of("relevantSources", "expectedFacts", "forbiddenFacts")) {
                var values = strings(row.path(key));
                if (values.size() > 8 || new HashSet<>(values).size() != values.size()
                        || values.stream().anyMatch(value -> value.isBlank() || value.length() > 160)) throw new IllegalArgumentException("invalid_rag_labels");
            }
            for (String citation : strings(row.path("relevantSources"))) {
                String id = citation.replaceFirst(":v1$", "");
                if (!citation.equals(id + ":v1") || docs.stream().noneMatch(doc -> doc.path("principal").asString().equals(row.path("principal").asString())
                        && doc.path("id").asString().equals(id) && doc.path("enabled").asBoolean())) throw new IllegalArgumentException("unauthorized_expected_source");
            }
            rows.add(row); if (rows.size() > 100) throw new IllegalArgumentException("case_limit");
        }
        if (rows.isEmpty()) throw new IllegalArgumentException("empty_cases");
        return new Dataset(List.copyOf(docs), List.copyOf(rows), hash(corpus), hash(cases));
    }
    private static boolean label(JsonNode node, String field, int limit) { return node.path(field).isString() && node.path(field).asString().matches("[a-z0-9][a-z0-9-]{0," + (limit - 1) + "}"); }
    private static boolean text(JsonNode node, String field, int limit) { return node.path(field).isString() && !node.path(field).asString().isBlank() && node.path(field).asString().length() <= limit; }
    private static List<String> strings(JsonNode array) {
        if (!array.isArray()) throw new IllegalArgumentException("array_required");
        var values = new ArrayList<String>(); for (var value : array) { if (!value.isString()) throw new IllegalArgumentException("string_label_required"); values.add(value.asString()); } return values;
    }
    private static byte[] bounded(Path path) throws Exception {
        try (var input = Files.newInputStream(path)) {
            byte[] bytes = input.readNBytes(1024 * 1024 + 1);
            if (bytes.length > 1024 * 1024) throw new IllegalArgumentException("dataset_size_limit");
            // Refuse malformed UTF-8 instead of silently changing authored labels/questions.
            java.nio.charset.StandardCharsets.UTF_8.newDecoder().decode(java.nio.ByteBuffer.wrap(bytes));
            return bytes;
        }
    }
    private static String hash(byte[] bytes) throws Exception { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
    private static void checkpoint(Path path, Map<String, Object> report) throws Exception {
        Path pending = Files.createTempFile(path.getParent(), ".rag-evaluation-", ".json");
        try { Files.writeString(pending, JSON.writerWithDefaultPrettyPrinter().writeValueAsString(report)); Files.move(pending, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE); }
        finally { Files.deleteIfExists(pending); }
    }
}
