package com.csfundamentals.service;

import com.csfundamentals.model.Topic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TopicServiceTest {

    private TopicService topicService;
    private ContentService contentService;

    @BeforeEach
    void setUp() {
        topicService = new TopicService();
        contentService = new ContentService();
    }

    @Test
    void getTopicsByCategory_networking_shouldContainAll12Topics() {
        List<Topic> networkingTopics = topicService.getTopicsByCategory("networking");
        assertNotNull(networkingTopics);
        assertEquals(12, networkingTopics.size(), "Networking category must have exactly 12 registered topics");

        List<String> topicIds = networkingTopics.stream().map(Topic::id).toList();
        assertTrue(topicIds.contains("network-fundamentals"));
        assertTrue(topicIds.contains("physical-layer-media"));
        assertTrue(topicIds.contains("osi-model"));
        assertTrue(topicIds.contains("data-link-layer"));
        assertTrue(topicIds.contains("ip-subnetting"));
        assertTrue(topicIds.contains("routing-algorithms"));
        assertTrue(topicIds.contains("tcp-ip"));
        assertTrue(topicIds.contains("tcp-congestion"));
        assertTrue(topicIds.contains("transport-layer-protocols"));
        assertTrue(topicIds.contains("application-layer"));
        assertTrue(topicIds.contains("network-security"));
        assertTrue(topicIds.contains("network-performance-qos"));
    }

    @Test
    void allNetworkingTopics_shouldHaveResolvableMarkdownContent() {
        List<Topic> networkingTopics = topicService.getTopicsByCategory("networking");
        for (Topic topic : networkingTopics) {
            String content = contentService.getContent(topic.id());
            assertNotNull(content, "Content must not be null for " + topic.id());
            assertFalse(content.startsWith("Content not found"), "Content file missing for topicId: " + topic.id());
            assertFalse(content.startsWith("Error loading content"), "Error reading content file for: " + topic.id());
            assertTrue(content.contains("Beginner Level"), "Content must follow 3-level pattern for: " + topic.id());
        }
    }
}
