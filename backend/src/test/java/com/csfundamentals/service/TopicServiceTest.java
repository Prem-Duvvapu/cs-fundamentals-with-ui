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
    void getTopicsByCategory_dbms_shouldContainAll13Topics() {
        List<Topic> dbmsTopics = topicService.getTopicsByCategory("dbms");
        assertNotNull(dbmsTopics);
        assertEquals(13, dbmsTopics.size(), "DBMS category must have exactly 13 registered topics");

        List<String> topicIds = dbmsTopics.stream().map(Topic::id).toList();
        assertTrue(topicIds.contains("dbms-introduction"));
        assertTrue(topicIds.contains("dbms-architecture"));
        assertTrue(topicIds.contains("er-model"));
        assertTrue(topicIds.contains("relational-algebra-calculus"));
        assertTrue(topicIds.contains("functional-dependencies-keys"));
        assertTrue(topicIds.contains("database-normalization"));
        assertTrue(topicIds.contains("dbms-indexing"));
        assertTrue(topicIds.contains("storage-raid-indexing"));
        assertTrue(topicIds.contains("transactions-acid"));
        assertTrue(topicIds.contains("concurrency-control"));
        assertTrue(topicIds.contains("query-optimization"));
        assertTrue(topicIds.contains("sql-querying"));
        assertTrue(topicIds.contains("distributed-databases-cap"));
    }

    @Test
    void getTopicsByCategory_os_shouldContainAll8Topics() {
        List<Topic> osTopics = topicService.getTopicsByCategory("os");
        assertNotNull(osTopics);
        assertEquals(8, osTopics.size(), "OS category must have exactly 8 registered topics");

        List<String> topicIds = osTopics.stream().map(Topic::id).toList();
        assertTrue(topicIds.contains("process-management"));
        assertTrue(topicIds.contains("memory-management"));
        assertTrue(topicIds.contains("cpu-scheduling"));
        assertTrue(topicIds.contains("synchronization"));
        assertTrue(topicIds.contains("deadlocks"));
        assertTrue(topicIds.contains("file-systems"));
        assertTrue(topicIds.contains("io-systems"));
        assertTrue(topicIds.contains("disk-scheduling"));
    }

    @Test
    void getTopicsByCategory_javaSpring_shouldContainAll23Topics() {
        List<Topic> javaTopics = topicService.getTopicsByCategory("java-spring");
        assertNotNull(javaTopics);
        assertEquals(23, javaTopics.size(), "Java/Spring category must have exactly 23 registered topics");

        List<String> topicIds = javaTopics.stream().map(Topic::id).toList();
        assertTrue(topicIds.contains("java-execution-pipeline"));
        assertTrue(topicIds.contains("java-memory-model"));
        assertTrue(topicIds.contains("java-oop-pillars"));
        assertTrue(topicIds.contains("java-static-final-records"));
        assertTrue(topicIds.contains("jvm-gc"));
        assertTrue(topicIds.contains("java-functional-lambdas"));
        assertTrue(topicIds.contains("java-generics"));
        assertTrue(topicIds.contains("java-collections-framework"));
        assertTrue(topicIds.contains("java-hashmap-internals"));
        assertTrue(topicIds.contains("java-streams-optional"));
        assertTrue(topicIds.contains("java-reflection-exceptions"));
        assertTrue(topicIds.contains("java-multithreading-concurrency"));
        assertTrue(topicIds.contains("spring-bean-lifecycle"));
        assertTrue(topicIds.contains("spring-mvc-lifecycle"));
        assertTrue(topicIds.contains("jpa-hibernate-lifecycle"));
        assertTrue(topicIds.contains("spring-batch-lifecycle"));
        assertTrue(topicIds.contains("quartz-scheduler"));
        assertTrue(topicIds.contains("design-patterns-solid"));
        assertTrue(topicIds.contains("spring-boot-internals"));
        assertTrue(topicIds.contains("spring-rest-api-design"));
        assertTrue(topicIds.contains("spring-security"));
        assertTrue(topicIds.contains("spring-caching-async"));
        assertTrue(topicIds.contains("spring-testing-production"));
    }

    @Test
    void getTopicsByCategory_aiml_shouldContainAll7Topics() {
        List<Topic> aimlTopics = topicService.getTopicsByCategory("aiml");
        assertNotNull(aimlTopics);
        assertEquals(7, aimlTopics.size(), "AI/ML category must have exactly 7 registered topics");

        List<String> topicIds = aimlTopics.stream().map(Topic::id).toList();
        assertTrue(topicIds.contains("embeddings-vector-db"));
        assertTrue(topicIds.contains("rag-architecture"));
        assertTrue(topicIds.contains("model-serving"));
        assertTrue(topicIds.contains("llm-parameters"));
        assertTrue(topicIds.contains("feature-stores"));
        assertTrue(topicIds.contains("recommendation-systems"));
        assertTrue(topicIds.contains("ml-fundamentals"));
    }

    @Test
    void getTopicById_shouldReturnCorrectTopic_whenExists() {
        Topic topic = topicService.getTopicById("dbms-introduction");
        assertNotNull(topic);
        assertEquals("dbms-introduction", topic.id());
        assertEquals("dbms", topic.category());
        assertEquals("beginner", topic.level());
    }

    @Test
    void getTopicById_shouldReturnNull_whenTopicDoesNotExist() {
        Topic topic = topicService.getTopicById("invalid-non-existent-topic-12345");
        assertNull(topic);
    }

    @Test
    void allRegisteredTopics_acrossAllCategories_shouldResolveToTieredMarkdownContent() {
        List<Topic> allTopics = topicService.getAllTopics();
        assertEquals(63, allTopics.size(), "Total registered topics should be 63 (8 OS + 12 Networking + 13 DBMS + 23 Java/Spring + 7 AI/ML)");
        assertEquals(13, allTopics.stream().filter(topic -> topic.category().equals("dbms")).count());
        assertEquals(23, allTopics.stream().filter(topic -> topic.category().equals("java-spring")).count());
        assertEquals(7, allTopics.stream().filter(topic -> topic.category().equals("aiml")).count());

        for (Topic topic : allTopics) {
            String content = contentService.getContent(topic.category(), topic.id());
            assertNotNull(content, "Content must not be null for " + topic.id());
            assertFalse(content.startsWith("Content not found"), "Content file missing for topicId: " + topic.id());
            assertFalse(content.startsWith("Error loading content"), "Error reading content file for: " + topic.id());
            assertTrue(content.contains("## 🟢 Beginner Level"), "Content must include the exact Beginner tier for: " + topic.id());
            assertTrue(content.contains("## 🟡 Intermediate Level"), "Content must include the exact Intermediate tier for: " + topic.id());
            assertTrue(content.contains("## 🔴 Expert Level"), "Content must include the exact Expert tier for: " + topic.id());
        }
    }
}
