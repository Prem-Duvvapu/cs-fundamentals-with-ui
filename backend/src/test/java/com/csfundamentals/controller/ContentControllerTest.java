package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
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
        when(contentService.exists("os", "process-management")).thenReturn(true);
        when(contentService.getContent("os", "process-management")).thenReturn("# Process Management\n\nContent here");

        mockMvc.perform(get("/api/v1/content/os/process-management"))
            .andExpect(status().isOk())
            .andExpect(content().string("# Process Management\n\nContent here"));
    }

    @Test
    void getContent_shouldReturn404_whenTopicDoesNotExist() throws Exception {
        when(contentService.exists("os", "unknown")).thenReturn(false);

        mockMvc.perform(get("/api/v1/content/os/unknown"))
            .andExpect(status().isNotFound());

        verify(contentService, never()).getContent("os", "unknown");
    }

    @Test
    void getContent_shouldReturn500_whenContentFailsToLoad() throws Exception {
        when(contentService.exists("os", "process-management")).thenReturn(true);
        when(contentService.getContent("os", "process-management")).thenReturn("Error loading content: disk read failed");

        mockMvc.perform(get("/api/v1/content/os/process-management"))
            .andExpect(status().isInternalServerError())
            .andExpect(content().string("Error loading content: disk read failed"));
    }
}
