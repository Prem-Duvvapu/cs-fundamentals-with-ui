package com.csfundamentals.aiexample;

import java.net.URI;
import java.nio.file.*;
import java.security.MessageDigest;
import java.time.*;
import java.util.*;
import org.springframework.ai.chat.client.ChatClient;
import tools.jackson.databind.ObjectMapper;

final class EvaluateTickets {
    static void run(String[] args) throws Exception {
        if (args.length != 3) throw new IllegalArgumentException("Usage: --evaluate|--evaluate-rules <cases.jsonl> <report.json>");
        boolean rules = args[0].equals("--evaluate-rules");
        String evidence = rules ? "rule" : System.getenv().getOrDefault("AI_EVIDENCE", "fixture");
        if (!rules && !Set.of("fixture", "live-local").contains(evidence)) throw new IllegalArgumentException("Use fixture or live-local evidence");
        String model = rules ? TicketRuleBaseline.VERSION : System.getenv().getOrDefault("AI_MODEL", "teaching-fixture");
        java.util.function.Function<String, ExtractionService.Ticket> extract;
        if (rules) extract = TicketRuleBaseline::extract;
        else {
            String endpoint = System.getenv().getOrDefault("AI_ENDPOINT", "http://127.0.0.1:9193/api/chat");
            URI uri = URI.create(endpoint);
            if (!Set.of("127.0.0.1", "localhost", "[::1]").contains(uri.getHost()))
                throw new IllegalArgumentException("This evaluator only contacts a loopback fixture/local model");
            if (evidence.equals("fixture") != model.equals("teaching-fixture"))
                throw new IllegalArgumentException("Explicit model/evidence mode mismatch");
            int timeout = Integer.parseInt(System.getenv().getOrDefault("AI_TIMEOUT_MS", "3000"));
            int budget = Integer.parseInt(System.getenv().getOrDefault("AI_MAX_CALLS", "100"));
            var service = new ExtractionService(ChatClient.create(new OllamaHttpModel(uri, model, Duration.ofMillis(timeout), budget)));
            extract = service::extract;
        }
        var json = new ObjectMapper();
        Path datasetPath = Path.of(args[1]);
        if (Files.size(datasetPath) > 8 * 1024 * 1024) throw new IllegalArgumentException("dataset_size_limit");
        byte[] dataset = Files.readAllBytes(datasetPath);
        var datasetCases = readCases(json, dataset);
        var cases = new ArrayList<Map<String, Object>>();
        var outcomes = new ArrayList<EvaluationSummary.Result>();
        int accepted = 0, correct = 0;
        long totalMs = 0;
        Path reportPath = Path.of(args[2]).toAbsolutePath();
        String digest = rules ? "not-applicable" : System.getenv().getOrDefault("AI_MODEL_DIGEST", "fixture");
        String runtime = rules ? System.getProperty("java.runtime.version") : System.getenv().getOrDefault("AI_RUNTIME_VERSION", "fixture");
        if (evidence.equals("live-local") && (!digest.matches("[a-f0-9]{64}") || runtime.equals("fixture")))
            throw new IllegalArgumentException("Live runs require AI_MODEL_DIGEST and AI_RUNTIME_VERSION provenance");
        var report = new LinkedHashMap<String, Object>();
        report.put("evidence", evidence); report.put("model", model); report.put("modelDigest", digest);
        report.put("runtimeVersion", runtime); report.put("promptVersion", rules ? TicketRuleBaseline.VERSION : ExtractionService.PROMPT_VERSION);
        report.put("datasetSha256", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(dataset)));
        report.put("datasetLfSha256", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(
                new String(dataset, java.nio.charset.StandardCharsets.UTF_8).replace("\r\n", "\n").getBytes(java.nio.charset.StandardCharsets.UTF_8))));
        report.put("usesModel", !rules);
        report.put("at", Instant.now().toString()); report.put("cases", cases); report.put("state", "running");
        report.put("limits", "Synthetic teaching set; field match excludes summary factuality. No judge, calibration, production assurance or paid-provider cost measurement.");
        for (var row : datasetCases) {
            long start = System.nanoTime();
            var result = new LinkedHashMap<String, Object>();
            result.put("id", row.path("id").asString());
            result.put("slice", row.path("slice").asString());
            var fieldMatches = new LinkedHashMap<String, Boolean>();
            EvaluationSummary.FIELDS.forEach(field -> fieldMatches.put(field, false));
            boolean schemaAccepted = false;
            String errorCode = null;
            try {
                var ticket = extract.apply(row.path("text").asString());
                accepted++;
                fieldMatches.put("category", ticket.category().equals(row.path("expected").path("category").asString()));
                fieldMatches.put("priority", ticket.priority().equals(row.path("expected").path("priority").asString()));
                fieldMatches.put("orderId", Objects.equals(ticket.orderId(), row.path("expected").path("orderId").asString(null)));
                boolean match = fieldMatches.values().stream().allMatch(Boolean::booleanValue);
                schemaAccepted = true;
                correct += match ? 1 : 0;
                result.put("accepted", true); result.put("fieldsCorrect", match);
            } catch (IllegalArgumentException | OllamaHttpModel.ModelFailure error) {
                errorCode = error.getMessage();
                result.put("accepted", false); result.put("fieldsCorrect", false); result.put("error", errorCode);
            }
            long ms = (System.nanoTime() - start) / 1_000_000;
            totalMs += ms; result.put("totalMs", ms); result.put("fieldMatches", fieldMatches); cases.add(result);
            outcomes.add(new EvaluationSummary.Result(row.path("id").asString(), row.path("slice").asString(), schemaAccepted, fieldMatches, ms, errorCode));
            report.put("summary", EvaluationSummary.summarize(outcomes));
            report.put("metricDefinition", "Field rates include rejected cases; accepted-only field rates are also shown. Latency uses nearest-rank observed milliseconds, including failures. Small synthetic slices are descriptive, not population guarantees.");
            report.put("accepted", accepted); report.put("fieldsCorrect", correct); report.put("totalMs", totalMs);
            checkpoint(json, reportPath, report);
        }
        report.put("state", "complete");
        checkpoint(json, reportPath, report);
        System.out.println("Evidence=" + evidence + " cases=" + cases.size() + " accepted=" + accepted + " fieldsCorrect=" + correct);
    }
    static List<tools.jackson.databind.JsonNode> readCases(ObjectMapper json, byte[] dataset) {
        var rows = new ArrayList<tools.jackson.databind.JsonNode>();
        var ids = new HashSet<String>();
        for (String line : new String(dataset, java.nio.charset.StandardCharsets.UTF_8).lines().filter(value -> !value.isBlank()).toList()) {
            var row = json.readTree(line);
            var expected = row.path("expected");
            if (!row.path("id").isString() || !row.path("id").asString().matches("[a-z0-9][a-z0-9-]{0,79}")
                    || !ids.add(row.path("id").asString()) || !row.path("slice").isString()
                    || !row.path("slice").asString().matches("[a-z0-9][a-z0-9-]{0,39}")
                    || !row.path("text").isString() || row.path("text").asString().isBlank()
                    || row.path("text").asString().length() > 8192 || !expected.isObject() || expected.size() != 3
                    || !expected.path("category").isString() || !Set.of("billing", "delivery", "other").contains(expected.path("category").asString())
                    || !expected.path("priority").isString() || !Set.of("low", "normal", "high").contains(expected.path("priority").asString())
                    || (!expected.path("orderId").isNull() && (!expected.path("orderId").isString()
                        || !expected.path("orderId").asString().matches("ORD-[0-9]{4}"))))
                throw new IllegalArgumentException("invalid_evaluation_dataset");
            rows.add(row);
            if (rows.size() > 1000) throw new IllegalArgumentException("dataset_case_limit");
        }
        if (rows.isEmpty()) throw new IllegalArgumentException("empty_evaluation_dataset");
        return List.copyOf(rows);
    }
    private static void checkpoint(ObjectMapper json, Path path, Map<String, Object> report) throws Exception {
        Path pending = Files.createTempFile(path.getParent(), ".evaluation-", ".json");
        try {
            Files.writeString(pending, json.writerWithDefaultPrettyPrinter().writeValueAsString(report));
            Files.move(pending, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } finally { Files.deleteIfExists(pending); }
    }
}
