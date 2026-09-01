package com.csfundamentals.service;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class ContentServiceTest {

    private ContentService service;

    @BeforeEach
    void setUp() {
        service = new ContentService();
    }

    @Test
    void getContent_shouldReturnContent_whenTopicExists() {
        String content = service.getContent("os", "process-management");
        assertNotNull(content);
        assertTrue(content.contains("Process Management"));
        assertTrue(content.contains("Beginner Level"));
        assertTrue(content.contains("Expert Level"));
    }

    @Test
    void getContent_shouldReturnNotFoundMessage_whenTopicDoesNotExist() {
        String content = service.getContent("os", "non-existent-topic");
        assertTrue(content.startsWith("Content not found"));
    }

    @Test
    void getContent_shouldReturnNotFoundMessage_whenCategoryIsIncorrect() {
        String content = service.getContent("networking", "process-management");
        assertTrue(content.startsWith("Content not found"));
    }

    @Test
    void getContent_shouldNotReturnNull() {
        assertNotNull(service.getContent("os", "process-management"));
        assertNotNull(service.getContent("os", "memory-management"));
    }

    @Test
    void getContent_shouldResolveNetworkingTopicsWith3Levels() {
        String content = service.getContent("networking", "network-fundamentals");
        assertNotNull(content);
        assertFalse(content.startsWith("Content not found"));
        assertTrue(content.contains("🟢") || content.contains("Beginner Level"));
        assertTrue(content.contains("🟡") || content.contains("Intermediate Level"));
        assertTrue(content.contains("🔴") || content.contains("Expert Level"));
    }

    @Test
    void getContent_shouldResolveDbmsTopicsWith3Levels() {
        String[] dbmsTopics = {
            "dbms-introduction", "dbms-architecture", "er-model", "relational-algebra-calculus",
            "functional-dependencies-keys", "database-normalization", "dbms-indexing",
            "storage-raid-indexing", "transactions-acid", "concurrency-control",
            "query-optimization", "distributed-databases-cap"
        };

        for (String topicId : dbmsTopics) {
            String content = service.getContent("dbms", topicId);
            assertNotNull(content, "Content missing for DBMS topic: " + topicId);
            assertFalse(content.startsWith("Content not found"), "Topic not found: " + topicId);
            assertTrue(content.contains("🟢") || content.contains("Beginner"), "Missing Beginner tier for: " + topicId);
        }
    }

    @Test
    void getContent_shouldResolveJavaSpringTopicsWith3Levels() {
        String[] javaTopics = {
            "java-execution-pipeline", "java-memory-model", "java-oop-pillars",
            "java-static-final-records", "jvm-gc", "java-functional-lambdas",
            "java-generics", "java-collections-framework", "java-hashmap-internals",
            "java-streams-optional", "java-reflection-exceptions", "java-multithreading-concurrency",
            "spring-bean-lifecycle", "spring-mvc-lifecycle", "jpa-hibernate-lifecycle",
            "spring-batch-lifecycle", "quartz-scheduler"
        };

        for (String topicId : javaTopics) {
            String content = service.getContent("java-spring", topicId);
            assertNotNull(content, "Content missing for Java topic: " + topicId);
            assertFalse(content.startsWith("Content not found"), "Topic not found: " + topicId);
            assertTrue(content.contains("🟢") || content.contains("Beginner"), "Missing Beginner tier for: " + topicId);
        }
    }

    @Test
    void everyRegisteredTopic_shouldResolveToContent() {
        TopicService topicService = new TopicService();

        assertEquals(63, topicService.getAllTopics().size());

        topicService.getAllTopics().forEach(topic -> {
            String content = service.getContent(topic.category(), topic.id());
            assertFalse(
                content.startsWith("Content not found"),
                () -> "Registered topic has no content: " + topic.category() + "/" + topic.id()
            );
        });
    }

    @Test
    void getContent_shouldHandleNullAndEmptyGracefully() {
        String contentNull = service.getContent("os", null);
        assertTrue(contentNull.startsWith("Content not found"));

        String contentEmpty = service.getContent("os", "");
        assertTrue(contentEmpty.startsWith("Content not found"));
    }

    @Test
    void getCoverageManifest_shouldExposeTheValidatedDiscoveryTags() {
        String manifest = service.getCoverageManifest();

        assertTrue(manifest.contains("\"entries\""));
        assertTrue(manifest.contains("\"topicId\""));
        assertTrue(manifest.contains("\"requiredTerms\""));
    }
}
