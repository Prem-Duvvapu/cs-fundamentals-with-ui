package com.csfundamentals.aiexample;

import java.nio.file.Path;
import java.time.*;
import java.util.UUID;
import java.util.concurrent.*;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import static org.junit.jupiter.api.Assertions.*;

class RefundWorkflowTests {
    private static final String SECRET = UUID.randomUUID().toString();
    private RefundWorkflow workflow(String url, Clock clock) { return new RefundWorkflow(url, "sa", "", SECRET, clock); }
    private String memory() { return "jdbc:h2:mem:" + UUID.randomUUID() + ";DB_CLOSE_DELAY=-1"; }
    @Test void modelOrCallerCannotChooseAnotherTenantsOrder() {
        var workflow = workflow(memory(), Clock.systemUTC());
        assertThrows(SecurityException.class, () -> workflow.propose("alice", "request-1", "ORD-2001", 500));
        assertThrows(IllegalArgumentException.class, () -> workflow.propose("alice", "request-1", "ORD-1001", 1001));
    }
    @Test void approvalIsBoundToExactStoredActionAndDoesNotExecuteAtProposalTime() {
        var workflow = workflow(memory(), Clock.systemUTC());
        var first = workflow.propose("alice", "request-1", "ORD-1001", 500);
        var other = workflow.propose("alice", "request-2", "ORD-1001", 600);
        assertEquals("paid", workflow.lookup("alice", "ORD-1001").status());
        assertThrows(SecurityException.class, () -> workflow.approve("alice", other.operationId(), first.approvalToken()));
        assertThrows(SecurityException.class, () -> workflow.approve("bob", first.operationId(), first.approvalToken()));
        assertEquals("completed", workflow.approve("alice", first.operationId(), first.approvalToken()).status());
        assertThrows(KnowledgeStore.Conflict.class, () -> workflow.approve("alice", other.operationId(), other.approvalToken()));
    }
    @Test void expiredApprovalCannotCauseMutation() {
        String url = memory(); Clock start = Clock.fixed(Instant.parse("2026-10-16T00:00:00Z"), ZoneOffset.UTC);
        var first = workflow(url, start); var proposal = first.propose("alice", "request-1", "ORD-1001", 500);
        var later = workflow(url, Clock.offset(start, Duration.ofMinutes(6)));
        assertThrows(SecurityException.class, () -> later.approve("alice", proposal.operationId(), proposal.approvalToken()));
        assertEquals("paid", later.lookup("alice", "ORD-1001").status());
    }
    @Test void retryKeyCannotBeReusedForChangedArguments() {
        var workflow = workflow(memory(), Clock.systemUTC());
        var first = workflow.propose("alice", "request-1", "ORD-1001", 500);
        assertEquals(first, workflow.propose("alice", "request-1", "ORD-1001", 500));
        assertThrows(KnowledgeStore.Conflict.class, () -> workflow.propose("alice", "request-1", "ORD-1001", 600));
    }
    @Test void timeoutAfterCommitAndRestartDoNotRepeatTheLocalMutation(@TempDir Path directory) {
        String url = "jdbc:h2:file:" + directory.resolve("workflow");
        var first = workflow(url, Clock.systemUTC()); var proposal = first.propose("alice", "request-1", "ORD-1001", 500);
        first.approve("alice", proposal.operationId(), proposal.approvalToken()); // Caller loses this response.
        var restarted = workflow(url, Clock.systemUTC());
        assertEquals("completed", restarted.approve("alice", proposal.operationId(), proposal.approvalToken()).status());
        assertEquals(2, restarted.lookup("alice", "ORD-1001").version());
    }
    @Test void simultaneousDuplicateApprovalsCommitOnlyOnce() throws Exception {
        var workflow = workflow(memory(), Clock.systemUTC());
        var proposal = workflow.propose("alice", "request-1", "ORD-1001", 500);
        var executor = Executors.newFixedThreadPool(2);
        try {
            var a = executor.submit(() -> workflow.approve("alice", proposal.operationId(), proposal.approvalToken()));
            var b = executor.submit(() -> workflow.approve("alice", proposal.operationId(), proposal.approvalToken()));
            assertEquals("completed", a.get(5, TimeUnit.SECONDS).status());
            assertEquals("completed", b.get(5, TimeUnit.SECONDS).status());
            assertEquals(2, workflow.lookup("alice", "ORD-1001").version());
        } finally { executor.shutdownNow(); }
    }
}
