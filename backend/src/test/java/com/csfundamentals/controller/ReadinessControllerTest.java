package com.csfundamentals.controller;

import com.csfundamentals.service.ContentService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ReadinessController.class)
class ReadinessControllerTest {
    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private ContentService contentService;

    @Test
    void reportsTheCurriculumIndexSize() throws Exception {
        when(contentService.indexedTopicCount()).thenReturn(63);
        mockMvc.perform(get("/api/v1/health/readiness"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.status").value("UP"))
            .andExpect(jsonPath("$.indexedTopics").value(63));
    }
}
