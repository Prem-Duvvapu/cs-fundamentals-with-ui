package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/content")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/{category}/{topicId}")
    public ResponseEntity<String> getContent(@PathVariable String category, @PathVariable String topicId) {
        if (!contentService.exists(category, topicId)) {
            return ResponseEntity.notFound().build();
        }

        String content = contentService.getContent(category, topicId);
        if (content.startsWith("Error loading content")) {
            return ResponseEntity.internalServerError().body(content);
        }
        return ResponseEntity.ok(content);
    }
}
