package com.csfundamentals.controller;

import com.csfundamentals.model.Topic;
import com.csfundamentals.service.TopicService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(TopicController.class)
class TopicControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private TopicService topicService;

    @Test
    void getAllTopics_shouldReturnTopicList() throws Exception {
        when(topicService.getAllTopics()).thenReturn(List.of(
            new Topic("test", "Test Topic", "os", "beginner", "test summary")
        ));

        mockMvc.perform(get("/api/v1/topics"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].id").value("test"))
            .andExpect(jsonPath("$[0].title").value("Test Topic"));
    }

    @Test
    void getByCategory_shouldReturnFilteredTopics() throws Exception {
        when(topicService.getTopicsByCategory("os")).thenReturn(List.of(
            new Topic("os-topic", "OS Topic", "os", "intermediate", "os summary")
        ));

        mockMvc.perform(get("/api/v1/topics/category/os"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(1))
            .andExpect(jsonPath("$[0].category").value("os"));
    }

    @Test
    void getByCategory_shouldReturnEmpty_whenCategoryNotFound() throws Exception {
        when(topicService.getTopicsByCategory("unknown")).thenReturn(List.of());

        mockMvc.perform(get("/api/v1/topics/category/unknown"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.length()").value(0));
    }
}
