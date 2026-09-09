package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import com.csfundamentals.service.ContentNotFoundException;
import com.csfundamentals.service.ContentReadException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ContentController.class)
class ContentControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ContentService contentService;

    @Test
    void getContent_shouldReturnMarkdown() throws Exception {
        when(contentService.getContent("os", "process-management")).thenReturn("# Process Management\n\nContent here");

        mockMvc.perform(get("/api/v1/content/os/process-management"))
            .andExpect(status().isOk())
            .andExpect(content().string("# Process Management\n\nContent here"));
    }

    @Test
    void getContent_shouldReturn404_whenTopicDoesNotExist() throws Exception {
        when(contentService.getContent("os", "unknown")).thenThrow(new ContentNotFoundException("os", "unknown"));

        mockMvc.perform(get("/api/v1/content/os/unknown"))
            .andExpect(status().isNotFound());

    }

    @Test
    void getContent_shouldReturn500_whenContentFailsToLoad() throws Exception {
        when(contentService.getContent("os", "process-management"))
            .thenThrow(new ContentReadException("disk read failed", new java.io.IOException("disk read failed")));

        mockMvc.perform(get("/api/v1/content/os/process-management"))
            .andExpect(status().isInternalServerError())
            .andExpect(content().string("Unable to load curriculum content"));
    }
}
