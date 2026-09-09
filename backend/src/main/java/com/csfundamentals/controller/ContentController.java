package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import com.csfundamentals.service.ContentNotFoundException;
import com.csfundamentals.service.ContentReadException;
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
        try {
            return ResponseEntity.ok(contentService.getContent(category, topicId));
        } catch (ContentNotFoundException exception) {
            return ResponseEntity.notFound().build();
        } catch (ContentReadException exception) {
            return ResponseEntity.internalServerError().body("Unable to load curriculum content");
        }
    }
}
