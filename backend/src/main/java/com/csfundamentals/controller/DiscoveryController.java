package com.csfundamentals.controller;

import com.csfundamentals.model.InterviewQuestionResponse;
import com.csfundamentals.model.SearchResponse;
import com.csfundamentals.service.DiscoveryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
public class DiscoveryController {

    private final DiscoveryService discoveryService;

    public DiscoveryController(DiscoveryService discoveryService) {
        this.discoveryService = discoveryService;
    }

    @GetMapping("/search")
    public SearchResponse search(
        @RequestParam(defaultValue = "") String q,
        @RequestParam(required = false) String category,
        @RequestParam(defaultValue = "20") int limit
    ) {
        return discoveryService.search(q, category, limit);
    }

    @GetMapping("/interview/questions")
    public InterviewQuestionResponse interviewQuestions(
        @RequestParam(required = false) String category,
        @RequestParam(required = false) String difficulty,
        @RequestParam(defaultValue = "0") int offset,
        @RequestParam(defaultValue = "100") int limit
    ) {
        return discoveryService.getInterviewQuestions(category, difficulty, offset, limit);
    }
}
