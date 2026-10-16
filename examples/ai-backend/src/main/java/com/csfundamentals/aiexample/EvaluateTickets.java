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
        if (args.length != 3) throw new IllegalArgumentException("Usage: --evaluate <cases.jsonl> <report.json>");
        String evidence = System.getenv().getOrDefault("AI_EVIDENCE", "fixture");
        if (!Set.of("fixture", "live-local").contains(evidence)) throw new IllegalArgumentException("Use fixture or live-local evidence");
        String endpoint = System.getenv().getOrDefault("AI_ENDPOINT", "http://127.0.0.1:9193/api/chat");
        URI uri = URI.create(endpoint);
        if (!Set.of("127.0.0.1", "localhost", "[::1]").contains(uri.getHost()))
            throw new IllegalArgumentException("This evaluator only contacts a loopback fixture/local model");
        String model = System.getenv().getOrDefault("AI_MODEL", "teaching-fixture");
        if (evidence.equals("fixture") != model.equals("teaching-fixture"))
            throw new IllegalArgumentException("Explicit model/evidence mode mismatch");
        int timeout = Integer.parseInt(System.getenv().getOrDefault("AI_TIMEOUT_MS", "3000"));
        int budget = Integer.parseInt(System.getenv().getOrDefault("AI_MAX_CALLS", "100"));
        var service = new ExtractionService(ChatClient.create(new OllamaHttpModel(uri, model, Duration.ofMillis(timeout), budget)));
        var json = new ObjectMapper();
        byte[] dataset = Files.readAllBytes(Path.of(args[1]));
        var cases = new ArrayList<Map<String, Object>>();
        int accepted = 0, correct = 0;
        long totalMs = 0;
        Path reportPath = Path.of(args[2]).toAbsolutePath();
        String digest = System.getenv().getOrDefault("AI_MODEL_DIGEST", "fixture");
        String runtime = System.getenv().getOrDefault("AI_RUNTIME_VERSION", "fixture");
        if (evidence.equals("live-local") && (!digest.matches("[a-f0-9]{64}") || runtime.equals("fixture")))
            throw new IllegalArgumentException("Live runs require AI_MODEL_DIGEST and AI_RUNTIME_VERSION provenance");
        var report = new LinkedHashMap<String, Object>();
        report.put("evidence", evidence); report.put("model", model); report.put("modelDigest", digest);
        report.put("runtimeVersion", runtime); report.put("promptVersion", ExtractionService.PROMPT_VERSION);
        report.put("datasetSha256", HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(dataset)));
        report.put("at", Instant.now().toString()); report.put("cases", cases); report.put("state", "running");
        report.put("limits", "Synthetic teaching set; field match excludes summary factuality. No judge, calibration, production assurance or paid-provider cost measurement.");
        for (String line : new String(dataset, java.nio.charset.StandardCharsets.UTF_8).lines().filter(l -> !l.isBlank()).toList()) {
            var row = json.readTree(line);
            long start = System.nanoTime();
            var result = new LinkedHashMap<String, Object>();
            result.put("id", row.path("id").asString());
            result.put("slice", row.path("slice").asString());
            try {
                var ticket = service.extract(row.path("text").asString());
                accepted++;
                boolean match = ticket.category().equals(row.path("expected").path("category").asString())
                        && ticket.priority().equals(row.path("expected").path("priority").asString())
                        && Objects.equals(ticket.orderId(), row.path("expected").path("orderId").asString(null));
                correct += match ? 1 : 0;
                result.put("accepted", true); result.put("fieldsCorrect", match);
            } catch (IllegalArgumentException | OllamaHttpModel.ModelFailure error) {
                result.put("accepted", false); result.put("error", error.getMessage());
            }
            long ms = (System.nanoTime() - start) / 1_000_000;
            totalMs += ms; result.put("totalMs", ms); cases.add(result);
            report.put("accepted", accepted); report.put("fieldsCorrect", correct); report.put("totalMs", totalMs);
            checkpoint(json, reportPath, report);
        }
        report.put("state", "complete");
        checkpoint(json, reportPath, report);
        System.out.println("Evidence=" + evidence + " cases=" + cases.size() + " accepted=" + accepted + " fieldsCorrect=" + correct);
    }
    private static void checkpoint(ObjectMapper json, Path path, Map<String, Object> report) throws Exception {
        Path pending = Files.createTempFile(path.getParent(), ".evaluation-", ".json");
        try {
            Files.writeString(pending, json.writerWithDefaultPrettyPrinter().writeValueAsString(report));
            Files.move(pending, path, StandardCopyOption.REPLACE_EXISTING, StandardCopyOption.ATOMIC_MOVE);
        } finally { Files.deleteIfExists(pending); }
    }
}
