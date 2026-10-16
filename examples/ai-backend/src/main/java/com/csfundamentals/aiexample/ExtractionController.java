package com.csfundamentals.aiexample;

import java.util.Map;
import org.springframework.http.*;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
class ExtractionController {
    private final ExtractionService service;
    ExtractionController(ExtractionService service) { this.service = service; }
    record Request(String text) {}
    @GetMapping("/api/csrf") Map<String, String> csrf(CsrfToken token) {
        return Map.of("token", token.getToken(), "headerName", token.getHeaderName());
    }
    @PostMapping("/api/extract") ExtractionService.Ticket extract(@RequestBody Request request) { return service.extract(request.text()); }
    @ExceptionHandler(IllegalArgumentException.class) ResponseEntity<Map<String, String>> invalid(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
    }
    @ExceptionHandler(OllamaHttpModel.ModelFailure.class) ResponseEntity<Map<String, String>> unavailable(OllamaHttpModel.ModelFailure e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(Map.of("error", e.getMessage()));
    }
}
