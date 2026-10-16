package com.csfundamentals.aiexample;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
class WorkflowController {
    private final RefundWorkflow workflow;
    private final ReadOnlyAgent agent;
    WorkflowController(RefundWorkflow workflow, ReadOnlyAgent agent) { this.workflow = workflow; this.agent = agent; }
    record Request(String requestKey, String orderId, long amountCents) {}
    record Approval(String approvalToken) {}
    record Investigation(String orderId, String question) {}
    @PostMapping("/api/investigate") ReadOnlyAgent.Result investigate(Principal principal, @RequestBody Investigation request) { return agent.investigate(principal.getName(), request.orderId(), request.question()); }
    @GetMapping("/api/orders/{id}") RefundWorkflow.Order order(Principal principal, @PathVariable String id) { return workflow.lookup(principal.getName(), id); }
    @PostMapping("/api/refund-proposals") RefundWorkflow.Proposal propose(Principal principal, @RequestBody Request request) { return workflow.propose(principal.getName(), request.requestKey(), request.orderId(), request.amountCents()); }
    @PostMapping("/api/refund-proposals/{id}/approve") RefundWorkflow.Proposal approve(Principal principal, @PathVariable String id, @RequestBody Approval request) { return workflow.approve(principal.getName(), id, request.approvalToken()); }
    @GetMapping("/api/operations/{id}") RefundWorkflow.Proposal status(Principal principal, @PathVariable String id) { return workflow.status(principal.getName(), id); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<Map<String, String>> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    @ExceptionHandler(SecurityException.class) ResponseEntity<Map<String, String>> forbidden() { return ResponseEntity.status(403).body(Map.of("error", "operation_not_authorized")); }
    @ExceptionHandler(KnowledgeStore.Conflict.class) ResponseEntity<Map<String, String>> conflict() { return ResponseEntity.status(409).body(Map.of("error", "operation_version_conflict")); }
}
