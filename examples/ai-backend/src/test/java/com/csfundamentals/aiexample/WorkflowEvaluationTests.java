package com.csfundamentals.aiexample;

import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.Duration;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;
import static org.junit.jupiter.api.Assertions.*;

class WorkflowEvaluationTests {
    private static final Path DATASET = Path.of("fixtures/workflow/cases.jsonl");
    @TempDir Path temporary;

    @Test void fiftyRealApplicationCasesKeepTaskRefusalAndPolicyMetricsSeparate() throws Exception {
        var report = temporary.resolve("report.json");
        assertTimeoutPreemptively(Duration.ofSeconds(110), () -> EvaluateWorkflow.run(new String[]{"--evaluate-workflow", DATASET.toString(), report.toString()}));
        var json = new ObjectMapper().readTree(Files.readString(report));
        assertEquals("complete", json.path("state").asString());
        assertTrue(json.path("ownedResourcesRemoved").asBoolean());
        var summary = json.path("summary");
        assertEquals(50, summary.path("cases").asInt());
        assertEquals(30, summary.path("splits").path("development").path("cases").asInt());
        assertEquals(20, summary.path("splits").path("held-out").path("cases").asInt());
        assertEquals(13, summary.path("tasksCompleted").asInt());
        assertEquals(13, summary.path("taskEligibleCases").asInt());
        assertEquals(33, summary.path("expectedRejectionsObserved").asInt());
        assertEquals(4, summary.path("boundedStops").asInt());
        assertEquals(44, summary.path("proposalCalls").asInt());
        assertEquals(0, summary.path("observedPolicyViolations").asInt());
        assertEquals(0, summary.path("contractFailures").asInt());
        int cancellations = 0;
        for (var result : json.path("cases")) {
            assertTrue(result.path("databaseUnchangedOnRejection").asBoolean());
            if (result.path("cancellationObserved").asBoolean()) cancellations++;
            if (result.path("id").asString().equals("held-19")) {
                assertEquals(1, result.path("orderMutations").asInt());
                assertEquals(5, result.path("evidence").size());
            }
        }
        assertEquals(2, cancellations);
        String output = Files.readString(report);
        assertFalse(output.contains("approvalToken")); assertFalse(output.contains("ALICE_PRIVATE"));
        assertFalse(output.contains("BOB_PRIVATE")); assertFalse(output.contains("jdbc:h2:"));
    }

    @Test void changingOnlyExpectedLabelsCannotChangeTheActionsAndDoesFailTheScore() throws Exception {
        var original = WorkflowEvaluationCases.read(DATASET).cases().get(0);
        var falseLabel = new WorkflowEvaluationCases.Expected("approval_token_invalid", 0, 0, 1, 2, true, List.of("unseen-evidence"));
        var changed = new WorkflowEvaluationCases.Case(original.id(), original.split(), original.family(), original.rationale(), original.input(), falseLabel);
        var observed = WorkflowEvaluation.execute(changed, temporary);
        assertEquals("finished", observed.status()); assertEquals(2, observed.proposalCalls());
        assertEquals(0, observed.orderMutations()); assertEquals(0, observed.proposalRows());
        assertFalse(observed.contractPassed()); assertFalse(observed.rejectionObserved());
        assertEquals(List.of(), observed.observedPolicyViolations());
        assertFalse(observed.mismatches().isEmpty());
        try (var children = Files.list(temporary)) { assertEquals(0, children.count()); }
    }

    @Test void invariantObserverDetectsRealUnexpectedWritesIndependentlyOfExpectedLabels() throws Exception {
        try (var context = new WorkflowEvaluation.Context(temporary)) {
            var before = context.snapshot();
            // Deliberately inject a bug into only this disposable database, outside application methods.
            try (var connection = java.sql.DriverManager.getConnection(context.url, "sa", context.password);
                 var statement = connection.createStatement()) {
                statement.executeUpdate("UPDATE support_orders SET version=version+1,status='refund-requested' WHERE tenant='tenant-b'");
            }
            context.knowledge.put("alice", "unexpected", 0, "Unexpected write", "Not an allowed agent effect", true);
            var violations = WorkflowEvaluation.stateViolations(before, context.snapshot(), "alice", true, true);
            assertTrue(violations.contains("rejected_action_changed_database"));
            assertTrue(violations.contains("readonly_agent_changed_database"));
            assertTrue(violations.contains("foreign_tenant_order_changed"));
            assertTrue(violations.contains("knowledge_changed_during_action"));
        }
        try (var children = Files.list(temporary)) { assertEquals(0, children.count()); }
    }

    @Test void aFailedCaseDoesNotLeaveItsOwnedDatabaseOrOverwriteTheDataset() throws Exception {
        var original = WorkflowEvaluationCases.read(DATASET).cases().get(0);
        var badInput = new WorkflowEvaluationCases.Input("approve", "alice", "ORD-1001", "Status", "normal", List.of(), 3, 2000, -1, "bad", "");
        var broken = new WorkflowEvaluationCases.Case("broken", "development", "setup-failure", "Deliberately fail setup", badInput, original.expected());
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluation.execute(broken, temporary));
        try (var children = Files.list(temporary)) { assertEquals(0, children.count()); }
        byte[] before = Files.readAllBytes(DATASET);
        assertThrows(IllegalArgumentException.class, () -> EvaluateWorkflow.run(new String[]{"--evaluate-workflow", DATASET.toString(), DATASET.toString()}));
        assertArrayEquals(before, Files.readAllBytes(DATASET));
    }

    @Test void strictLoaderRejectsDuplicatesOversizeAndUnknownOperationsBeforeExecution() throws Exception {
        var lines = Files.readAllLines(DATASET); String first = lines.get(0);
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluationCases.parse((first + "\n" + first).getBytes(StandardCharsets.UTF_8)));
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluationCases.parse(first.replace("\"operation\":\"agent\"", "\"operation\":\"shell\"").getBytes(StandardCharsets.UTF_8)));
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluationCases.parse(new byte[WorkflowEvaluationCases.MAX_BYTES + 1]));
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluationCases.parse("{}\n".getBytes(StandardCharsets.UTF_8)));
        assertThrows(IllegalArgumentException.class, () -> WorkflowEvaluationCases.parse("".getBytes(StandardCharsets.UTF_8)));
        var rows = WorkflowEvaluationCases.read(DATASET).cases();
        assertEquals(50, rows.stream().map(WorkflowEvaluationCases.Case::id).distinct().count());
        assertEquals(50, rows.stream().map(WorkflowEvaluationCases.Case::rationale).distinct().count());
    }

    @Test void aWrongExpectationProducesAReportAndNonSuccessInsteadOfPretendingSafetyFailed() throws Exception {
        var source = Files.readAllLines(DATASET).get(0).replace("\"status\":\"finished\"", "\"status\":\"wrong-label\"");
        var data = temporary.resolve("wrong.jsonl"); var report = temporary.resolve("wrong-report.json"); Files.writeString(data, source);
        assertThrows(IllegalStateException.class, () -> EvaluateWorkflow.run(new String[]{"--evaluate-workflow", data.toString(), report.toString()}));
        var json = new ObjectMapper().readTree(Files.readString(report));
        assertEquals(1, json.path("summary").path("contractFailures").asInt());
        assertEquals(0, json.path("summary").path("observedPolicyViolations").asInt());
        assertTrue(json.path("ownedResourcesRemoved").asBoolean());
        assertEquals(1, json.path("summary").path("taskEligibleCases").asInt());
    }
}
