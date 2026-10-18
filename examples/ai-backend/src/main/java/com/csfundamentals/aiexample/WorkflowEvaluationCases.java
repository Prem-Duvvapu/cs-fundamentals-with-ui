package com.csfundamentals.aiexample;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.*;
import tools.jackson.databind.*;

/** Inputs and scoring labels are separate types: only Input can reach the proposal fixture. */
final class WorkflowEvaluationCases {
    static final int MAX_BYTES = 512 * 1024, MAX_CASES = 50, MAX_LINE = 16384;
    static final Set<String> OPERATIONS = Set.of("agent", "proposal", "approve", "expired", "tampered",
            "cross-approve", "invalid-proposal", "cross-proposal", "other-token", "changed-key",
            "stale", "restart", "response-timeout", "completed-expired");
    record Input(String operation, String principal, String orderId, String question, String fixture,
                 List<String> actions, int maxSteps, int deadlineMs, long amount, String requestKey, String variant) {}
    record Expected(String status, int calls, int steps, int orderMutations, int proposals,
                    boolean rejection, List<String> evidence) {}
    record Case(String id, String split, String family, String rationale, Input input, Expected expected) {}
    record Dataset(List<Case> cases, byte[] bytes) {}

    static Dataset read(Path path) throws Exception {
        if (!Files.isRegularFile(path, LinkOption.NOFOLLOW_LINKS) || Files.size(path) > MAX_BYTES)
            throw new IllegalArgumentException("workflow_dataset_size_or_type");
        byte[] bytes;
        try (var in = Files.newInputStream(path)) { bytes = in.readNBytes(MAX_BYTES + 1); }
        if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("workflow_dataset_size_or_type");
        return new Dataset(parse(bytes), bytes);
    }
    static List<Case> parse(byte[] bytes) {
        if (bytes.length > MAX_BYTES) throw new IllegalArgumentException("workflow_dataset_size_or_type");
        var json = new ObjectMapper(); var rows = new ArrayList<Case>(); var ids = new HashSet<String>();
        for (String line : new String(bytes, StandardCharsets.UTF_8).lines().toList()) {
            if (line.isBlank()) continue;
            if (line.length() > MAX_LINE || rows.size() >= MAX_CASES) throw new IllegalArgumentException("workflow_case_limit");
            JsonNode row;
            try { row = json.readTree(line); } catch (RuntimeException e) { throw new IllegalArgumentException("workflow_invalid_dataset"); }
            var in = row.path("input"); var ex = row.path("expected");
            require(row.isObject() && row.size() == 6 && in.isObject() && in.size() == 11 && ex.isObject() && ex.size() == 7);
            String id = text(row, "id", 80), split = text(row, "split", 20);
            require(id.matches("[a-z0-9-]{1,80}") && ids.add(id) && Set.of("development", "held-out").contains(split));
            String operation = text(in, "operation", 40), fixture = text(in, "fixture", 20);
            require(OPERATIONS.contains(operation) && Set.of("normal", "raw", "loop", "stall", "lookup-stall").contains(fixture));
            var actions = strings(in.path("actions"), 5, 4096);
            require(!fixture.equals("raw") || !actions.isEmpty());
            int maxSteps = integer(in, "maxSteps", 1, 3), deadline = integer(in, "deadlineMs", 100, 2000);
            var input = new Input(operation, text(in, "principal", 40), text(in, "orderId", 64), text(in, "question", 1100),
                    fixture, actions, maxSteps, deadline, integer(in, "amount", -1, 1001), text(in, "requestKey", 80), text(in, "variant", 40));
            require(ex.path("rejection").isBoolean());
            var expected = new Expected(text(ex, "status", 80), integer(ex, "calls", 0, 3), integer(ex, "steps", 0, 3),
                    integer(ex, "orderMutations", 0, 1), integer(ex, "proposals", 0, 2), ex.path("rejection").asBoolean(), strings(ex.path("evidence"), 8, 160));
            rows.add(new Case(id, split, text(row, "family", 60), text(row, "rationale", 600), input, expected));
        }
        require(!rows.isEmpty()); return List.copyOf(rows);
    }
    private static int integer(JsonNode row, String key, int min, int max) {
        var n = row.path(key); require(n.isIntegralNumber() && n.canConvertToInt());
        int value = n.asInt(); require(value >= min && value <= max); return value;
    }
    private static String text(JsonNode row, String key, int max) {
        var n = row.path(key); require(n.isString() && n.asString().length() <= max); return n.asString();
    }
    private static List<String> strings(JsonNode node, int max, int length) {
        require(node.isArray() && node.size() <= max); var out = new ArrayList<String>();
        for (var n : node) { require(n.isString() && n.asString().length() <= length); out.add(n.asString()); }
        return List.copyOf(out);
    }
    private static void require(boolean valid) { if (!valid) throw new IllegalArgumentException("workflow_invalid_dataset"); }
}
