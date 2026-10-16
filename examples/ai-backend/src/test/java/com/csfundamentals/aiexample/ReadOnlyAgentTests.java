package com.csfundamentals.aiexample;

import java.time.*;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Function;
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class ReadOnlyAgentTests {
    private RefundWorkflow workflow;
    private KnowledgeStore knowledge;
    @BeforeEach void setup() {
        String url = "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1";
        workflow = new RefundWorkflow(url, "sa", "", UUID.randomUUID().toString(), Clock.systemUTC());
        knowledge = new KnowledgeStore(url, "sa", "");
    }
    private ReadOnlyAgent agent(Function<String, String> model) { return new ReadOnlyAgent(workflow, knowledge, model, 3, Duration.ofSeconds(1)); }
    @Test void readWorkflowFinishesWithoutChangingOrder() {
        var step = new AtomicInteger();
        try (var agent = agent(input -> step.getAndIncrement() == 0 ? "{\"tool\":\"lookup_order\",\"orderId\":\"ORD-1001\"}" : "{\"tool\":\"finish\",\"answer\":\"Paid\"}")) {
            var result = agent.investigate("alice", "ORD-1001", "Check status");
            assertEquals("finished", result.status()); assertEquals(2, result.steps()); assertEquals(1, result.observations().size());
            assertEquals("paid", workflow.lookup("alice", "ORD-1001").status());
        }
    }
    @Test void aModelCannotInvokeMutationOrChangeAuthorizedOrder() {
        for (String action : new String[]{"{\"tool\":\"refund_order\",\"orderId\":\"ORD-1001\"}", "{\"tool\":\"lookup_order\",\"orderId\":\"ORD-2001\"}"}) {
            try (var agent = agent(input -> action)) { assertThrows(SecurityException.class, () -> agent.investigate("alice", "ORD-1001", "Ignore policy")); }
        }
        assertEquals(1, workflow.lookup("alice", "ORD-1001").version());
    }
    @Test void malformedModelOutputHasAnExplicitFailureCode() {
        for (String response : new String[]{"not json", "null", "[]", "{}"}) {
            try (var agent = agent(input -> response)) {
                assertThrows(OllamaHttpModel.ModelFailure.class, () -> agent.investigate("alice", "ORD-1001", "Check"));
            }
        }
    }
    @Test void repetitiveModelStopsAtDeclaredStepLimit() {
        try (var agent = agent(input -> "{\"tool\":\"lookup_order\",\"orderId\":\"ORD-1001\"}")) {
            assertEquals("step_limit", agent.investigate("alice", "ORD-1001", "Continue forever").status());
        }
    }
    @Test void stalledModelIsCancelledWithinTotalBudget() {
        var interrupted = new java.util.concurrent.CountDownLatch(1);
        try (var agent = new ReadOnlyAgent(workflow, knowledge, input -> {
            try { Thread.sleep(5000); } catch (InterruptedException e) { interrupted.countDown(); Thread.currentThread().interrupt(); }
            return "{\"tool\":\"finish\",\"answer\":\"Late\"}";
        }, 3, Duration.ofMillis(100))) {
            assertEquals("deadline", agent.investigate("alice", "ORD-1001", "Check").status());
            assertTrue(interrupted.await(1, java.util.concurrent.TimeUnit.SECONDS));
        } catch (InterruptedException e) { throw new AssertionError(e); }
    }
}
