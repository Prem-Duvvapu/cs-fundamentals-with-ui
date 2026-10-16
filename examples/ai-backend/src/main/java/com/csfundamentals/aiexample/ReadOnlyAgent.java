package com.csfundamentals.aiexample;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.*;
import java.util.function.Function;
import tools.jackson.databind.ObjectMapper;

/** Model proposes a bounded read-only action. Approval/mutation APIs are never tools. */
public final class ReadOnlyAgent implements AutoCloseable {
    private final RefundWorkflow workflow;
    private final KnowledgeStore knowledge;
    private final Function<String, String> propose;
    private final int maxSteps;
    private final long maxNanos;
    private final ThreadPoolExecutor calls = new ThreadPoolExecutor(0, 2, 5, TimeUnit.SECONDS, new SynchronousQueue<>());
    private final ObjectMapper json = new ObjectMapper();
    public record Result(String status, int steps, String answer, List<String> observations) {}
    public ReadOnlyAgent(RefundWorkflow workflow, KnowledgeStore knowledge, Function<String, String> propose, int maxSteps, Duration deadline) {
        if (maxSteps < 1 || maxSteps > 5 || deadline.isNegative() || deadline.isZero() || deadline.compareTo(Duration.ofSeconds(30)) > 0)
            throw new IllegalArgumentException("invalid_agent_limits");
        this.workflow = workflow; this.knowledge = knowledge; this.propose = propose; this.maxSteps = maxSteps; this.maxNanos = deadline.toNanos();
    }
    public Result investigate(String principal, String orderId, String question) {
        if (question == null || question.isBlank() || question.length() > 1000) throw new IllegalArgumentException("invalid_question");
        workflow.lookup(principal, orderId); // Permission check before any model call.
        long started = System.nanoTime();
        var observations = new ArrayList<String>();
        for (int step = 1; step <= maxSteps; step++) {
            long remaining = maxNanos - (System.nanoTime() - started);
            if (remaining <= 0) return new Result("deadline", step - 1, "Investigation stopped", List.copyOf(observations));
            Future<String> pending;
            try { pending = calls.submit(() -> propose.apply(json.writeValueAsString(Map.of("orderId", orderId, "question", question, "observations", List.copyOf(observations))))); }
            catch (RejectedExecutionException e) { throw new OllamaHttpModel.ModelFailure("agent_capacity"); }
            String output;
            try { output = pending.get(remaining, TimeUnit.NANOSECONDS); }
            catch (TimeoutException e) { pending.cancel(true); return new Result("deadline", step - 1, "Investigation stopped", List.copyOf(observations)); }
            catch (InterruptedException e) { pending.cancel(true); Thread.currentThread().interrupt(); throw new OllamaHttpModel.ModelFailure("cancelled"); }
            catch (ExecutionException e) { throw new OllamaHttpModel.ModelFailure("agent_model_failure"); }
            if (System.nanoTime() - started >= maxNanos) return new Result("deadline", step - 1, "Investigation stopped", List.copyOf(observations));
            tools.jackson.databind.JsonNode action;
            try { action = json.readTree(output); }
            catch (RuntimeException e) { throw new OllamaHttpModel.ModelFailure("agent_invalid_json"); }
            if (action == null || !action.isObject() || action.size() != 2 || !action.path("tool").isString()) throw new OllamaHttpModel.ModelFailure("agent_invalid_action");
            switch (action.path("tool").asString()) {
                case "lookup_order" -> {
                    if (!action.path("orderId").isString() || !action.path("orderId").asString().equals(orderId)) throw new SecurityException("agent_order_scope");
                    observations.add(json.writeValueAsString(workflow.lookup(principal, orderId)));
                }
                case "search_policy" -> {
                    if (!action.path("query").isString() || action.path("query").asString().length() > 500) throw new IllegalArgumentException("invalid_agent_query");
                    var query = KnowledgeService.terms(action.path("query").asString());
                    var found = knowledge.visible(principal).stream().filter(doc -> !Collections.disjoint(query, KnowledgeService.terms(doc.text())))
                            .sorted(Comparator.comparing(KnowledgeStore.Document::id)).limit(2)
                            .map(doc -> doc.citation() + " " + doc.text().substring(0, Math.min(500, doc.text().length()))).toList();
                    observations.add(json.writeValueAsString(found));
                }
                case "finish" -> {
                    if (!action.path("answer").isString() || action.path("answer").asString().length() > 2000) throw new IllegalArgumentException("invalid_agent_answer");
                    return new Result("finished", step, action.path("answer").asString(), List.copyOf(observations));
                }
                default -> throw new SecurityException("agent_tool_not_allowed");
            }
        }
        return new Result("step_limit", maxSteps, "Investigation stopped", List.copyOf(observations));
    }
    @Override public void close() { calls.shutdownNow(); }
}
