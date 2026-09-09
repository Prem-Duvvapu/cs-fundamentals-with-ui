package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/health")
public class ReadinessController {

    private final ContentService contentService;

    public ReadinessController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/readiness")
    public Map<String, Object> readiness() {
        return Map.of("status", "UP", "indexedTopics", contentService.indexedTopicCount());
    }
}
