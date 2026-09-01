package com.csfundamentals.controller;

import com.csfundamentals.model.InterviewQuestion;
import com.csfundamentals.model.InterviewQuestionResponse;
import com.csfundamentals.model.SearchResponse;
import com.csfundamentals.model.SearchResult;
import com.csfundamentals.service.DiscoveryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(DiscoveryController.class)
class DiscoveryControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private DiscoveryService discoveryService;

    @Test
    void search_returnsRankedDiscoveryResults() throws Exception {
        SearchResult result = new SearchResult(
            "sql-querying",
            "SQL Querying",
            "dbms",
            "intermediate",
            "Joins and windows",
            "Window functions",
            "ROW_NUMBER and RANK",
            List.of("window"),
            200
        );
        when(discoveryService.search("window", "dbms", 5))
            .thenReturn(new SearchResponse("window", "dbms", 1, List.of(result)));

        mockMvc.perform(get("/api/v1/search")
                .param("q", "window")
                .param("category", "dbms")
                .param("limit", "5"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.query").value("window"))
            .andExpect(jsonPath("$.total").value(1))
            .andExpect(jsonPath("$.results[0].topicId").value("sql-querying"))
            .andExpect(jsonPath("$.results[0].matchedHeading").value("Window functions"));
    }

    @Test
    void interviewQuestions_returnsFilterableMarkdownAnswers() throws Exception {
        InterviewQuestion question = new InterviewQuestion(
            "rag-architecture-q1",
            "rag-architecture",
            "RAG Architecture",
            "aiml",
            1,
            "Q1. Why rerank?",
            "medium",
            "Use a **cross-encoder**."
        );
        when(discoveryService.getInterviewQuestions("aiml", "medium", 10, 20))
            .thenReturn(new InterviewQuestionResponse("aiml", "medium", 98, 10, 20, List.of(question)));

        mockMvc.perform(get("/api/v1/interview/questions")
                .param("category", "aiml")
                .param("difficulty", "medium")
                .param("offset", "10")
                .param("limit", "20"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.total").value(98))
            .andExpect(jsonPath("$.questions[0].id").value("rag-architecture-q1"))
            .andExpect(jsonPath("$.questions[0].answerMarkdown").value("Use a **cross-encoder**."));

        verify(discoveryService).getInterviewQuestions("aiml", "medium", 10, 20);
    }

    @Test
    void search_rejectsNonNumericPaginationParameters() throws Exception {
        mockMvc.perform(get("/api/v1/search").param("q", "java").param("limit", "many"))
            .andExpect(status().isBadRequest());
    }
}
