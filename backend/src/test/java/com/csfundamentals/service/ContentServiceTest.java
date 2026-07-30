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
        String content = service.getContent("process-management");
        assertNotNull(content);
        assertTrue(content.contains("Process Management"));
        assertTrue(content.contains("Beginner Level"));
        assertTrue(content.contains("Expert Level"));
    }

    @Test
    void getContent_shouldReturnNotFoundMessage_whenTopicDoesNotExist() {
        String content = service.getContent("non-existent-topic");
        assertTrue(content.startsWith("Content not found"));
    }

    @Test
    void getContent_shouldNotReturnNull() {
        assertNotNull(service.getContent("process-management"));
        assertNotNull(service.getContent("memory-management"));
    }

    @Test
    void getContent_shouldBeCached() {
        String first = service.getContent("process-management");
        String second = service.getContent("process-management");
        assertSame(first, second);
    }
}
