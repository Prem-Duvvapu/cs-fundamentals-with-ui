package com.csfundamentals.aiexample;

import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import tools.jackson.databind.ObjectMapper;

/** A proposal transcript/fault injector, never a model and never given expected outcomes. */
final class WorkflowEvaluationFixture implements Function<String, String> {
    static final String VERSION = "workflow-proposal-fixture-1";
    private final WorkflowEvaluationCases.Input input;
    private final ObjectMapper json = new ObjectMapper();
    final AtomicInteger calls = new AtomicInteger();
    final CountDownLatch started = new CountDownLatch(1), cancelled = new CountDownLatch(1);
    volatile List<String> observations = List.of();
    volatile boolean promptBoundary = true;
    WorkflowEvaluationFixture(WorkflowEvaluationCases.Input input) { this.input = input; }
    @Override public String apply(String prompt) {
        int call = calls.incrementAndGet(); started.countDown();
        var row = json.readTree(prompt);
        promptBoundary &= row.isObject() && row.size() == 3 && row.path("orderId").isString()
                && row.path("question").isString() && row.path("observations").isArray();
        var observed = new ArrayList<String>();
        for (var observation : row.path("observations")) observed.add(observation.asString());
        observations = List.copyOf(observed);
        if (input.fixture().equals("stall") || (input.fixture().equals("lookup-stall") && call > 1)) {
            try { if (!new CountDownLatch(1).await(5, TimeUnit.SECONDS)) throw new IllegalStateException("fixture_stall_cap"); }
            catch (InterruptedException e) { cancelled.countDown(); Thread.currentThread().interrupt(); }
            return json.writeValueAsString(Map.of("tool", "finish", "answer", "Late result"));
        }
        if (input.fixture().equals("raw")) return input.actions().get(Math.min(call - 1, input.actions().size() - 1));
        if (input.fixture().equals("loop") || input.fixture().equals("lookup-stall")) return lookup(row.path("orderId").asString());
        String question = row.path("question").asString().toLowerCase(Locale.ROOT);
        boolean status = question.contains("status"), policy = question.contains("policy");
        if (status && observed.isEmpty()) return lookup(row.path("orderId").asString());
        if (policy && observed.size() < (status ? 2 : 1))
            return json.writeValueAsString(Map.of("tool", "search_policy", "query", question.contains("unknown") ? "volcano" : "refund"));
        // Copy actual evidence; do not invent a business answer or follow instructions in documents.
        return json.writeValueAsString(Map.of("tool", "finish", "answer", observed.isEmpty() ? "No investigation requested" : String.join(" ", observed)));
    }
    private String lookup(String order) { return json.writeValueAsString(Map.of("tool", "lookup_order", "orderId", order)); }
    void verifyCancellation() throws InterruptedException {
        if (!started.await(1, TimeUnit.SECONDS) || !cancelled.await(1, TimeUnit.SECONDS))
            throw new IllegalStateException("fixture_cancellation_not_observed");
    }
}
