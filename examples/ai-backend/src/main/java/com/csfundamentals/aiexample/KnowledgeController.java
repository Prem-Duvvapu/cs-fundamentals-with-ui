package com.csfundamentals.aiexample;

import java.security.Principal;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
class KnowledgeController {
    private final KnowledgeStore store;
    private final KnowledgeService service;
    KnowledgeController(KnowledgeStore store, KnowledgeService service) { this.store = store; this.service = service; }
    record DocumentRequest(long expectedVersion, String title, String text, boolean enabled) {}
    record Question(String question) {}
    @PutMapping("/api/documents/{id}") KnowledgeStore.Document put(Principal principal, @PathVariable String id, @RequestBody DocumentRequest request) {
        return store.put(principal.getName(), id, request.expectedVersion(), request.title(), request.text(), request.enabled());
    }
    @DeleteMapping("/api/documents/{id}") Map<String, Boolean> revoke(Principal principal, @PathVariable String id, @RequestParam long expectedVersion) {
        store.revoke(principal.getName(), id, expectedVersion); return Map.of("revoked", true);
    }
    @PostMapping("/api/ask") KnowledgeService.Answer ask(Principal principal, @RequestBody Question question) {
        return service.ask(principal.getName(), question.question());
    }
    @PostMapping("/api/index/rebuild") PgVectorKnowledgeIndex.Status rebuild(Principal principal) {
        return service.rebuildIndex(principal.getName());
    }
    @GetMapping("/api/index/status") PgVectorKnowledgeIndex.Status indexStatus(Principal principal) {
        return service.indexStatus(principal.getName());
    }
    @ExceptionHandler(EmbeddingProvider.Failure.class) ResponseEntity<Map<String, String>> embeddingFailure(EmbeddingProvider.Failure e) {
        return ResponseEntity.status(502).body(Map.of("error", e.getMessage()));
    }
    @ExceptionHandler(KnowledgeRetrieval.Unavailable.class) ResponseEntity<Map<String, String>> indexUnavailable(KnowledgeRetrieval.Unavailable e) {
        int status = e.getMessage().equals("vector_database_unavailable") || e.getMessage().equals("vector_rebuild_in_progress") ? 503 : 409;
        return ResponseEntity.status(status).body(Map.of("error", e.getMessage()));
    }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<Map<String, String>> invalid(IllegalArgumentException e) { return ResponseEntity.badRequest().body(Map.of("error", e.getMessage())); }
    @ExceptionHandler(SecurityException.class) ResponseEntity<Map<String, String>> forbidden(SecurityException e) { return ResponseEntity.status(403).body(Map.of("error", "source_not_authorized")); }
    @ExceptionHandler(KnowledgeStore.Conflict.class) ResponseEntity<Map<String, String>> conflict() { return ResponseEntity.status(409).body(Map.of("error", "document_version_conflict")); }
    @ExceptionHandler(OllamaHttpModel.ModelFailure.class) ResponseEntity<Map<String, String>> unavailable(OllamaHttpModel.ModelFailure e) { return ResponseEntity.status(502).body(Map.of("error", e.getMessage())); }
}
