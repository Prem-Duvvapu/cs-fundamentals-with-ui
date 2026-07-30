package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/content")
public class ContentController {

    private final ContentService contentService;

    public ContentController(ContentService contentService) {
        this.contentService = contentService;
    }

    @GetMapping("/{category}/{topicId}")
    public String getContent(@PathVariable String category, @PathVariable String topicId) {
        return contentService.getContent(topicId);
    }
}
