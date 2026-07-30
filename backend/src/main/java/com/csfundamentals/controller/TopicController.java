package com.csfundamentals.controller;

import com.csfundamentals.model.Topic;
import com.csfundamentals.service.TopicService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/topics")
public class TopicController {

    private final TopicService topicService;

    public TopicController(TopicService topicService) {
        this.topicService = topicService;
    }

    @GetMapping
    public List<Topic> getAllTopics() {
        return topicService.getAllTopics();
    }

    @GetMapping("/category/{category}")
    public List<Topic> getByCategory(@PathVariable String category) {
        return topicService.getTopicsByCategory(category);
    }
}
