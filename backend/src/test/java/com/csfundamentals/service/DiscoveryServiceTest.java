package com.csfundamentals.service;

import com.csfundamentals.model.InterviewQuestionResponse;
import com.csfundamentals.model.SearchResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

class DiscoveryServiceTest {

    private DiscoveryService service;

    @BeforeEach
    void setUp() {
        service = new DiscoveryService(new TopicService(), new ContentService(), new ObjectMapper());
    }

    @Test
    void constructor_buildsOneImmutableIndexForTheValidatedCurriculum() {
        assertEquals(63, service.indexedTopicCount());
        assertEquals(883, service.indexedQuestionCount());

        InterviewQuestionResponse response = service.getInterviewQuestions(null, null, 0, 500);
        assertThrows(UnsupportedOperationException.class, () -> response.questions().add(response.questions().get(0)));
    }

    @Test
    void search_ranksTitleHeadingAndBodyMatchesAndReturnsContext() {
        SearchResponse response = service.search("window functions", null, 20);

        assertTrue(response.total() > 0);
        assertEquals("sql-querying", response.results().get(0).topicId());
        assertNotNull(response.results().get(0).matchedHeading());
        assertFalse(response.results().get(0).excerpt().isBlank());
        assertTrue(response.results().get(0).matchedTerms().contains("window"));
        assertTrue(response.results().get(0).matchedTerms().contains("functions"));
    }

    @Test
    void search_usesCoverageManifestAliasesWithoutAddingAnotherTopicRegistry() {
        SearchResponse response = service.search("one public", "java-spring", 10);

        assertTrue(response.total() > 0);
        assertEquals("java-execution-pipeline", response.results().get(0).topicId());
    }

    @Test
    void search_appliesCategoryAndLimitAndHandlesBlankQueries() {
        SearchResponse response = service.search("concurrency", "dbms", 2);

        assertTrue(response.total() >= response.results().size());
        assertTrue(response.results().size() <= 2);
        assertTrue(response.results().stream().allMatch(result -> result.category().equals("dbms")));

        SearchResponse blank = service.search("   ", null, 20);
        assertEquals(0, blank.total());
        assertTrue(blank.results().isEmpty());
    }

    @Test
    void interviewQuestions_supportCategoryDifficultyAndPaginationFilters() {
        InterviewQuestionResponse allAiml = service.getInterviewQuestions("aiml", null, 0, 500);
        assertEquals(98, allAiml.total());
        assertEquals(98, allAiml.questions().size());
        assertTrue(allAiml.questions().stream().allMatch(question -> question.category().equals("aiml")));

        InterviewQuestionResponse hardPage = service.getInterviewQuestions("aiml", "HARD", 2, 5);
        assertTrue(hardPage.total() > 5);
        assertEquals(2, hardPage.offset());
        assertEquals(5, hardPage.questions().size());
        assertTrue(hardPage.questions().stream().allMatch(question -> question.difficulty().equals("hard")));
    }

    @Test
    void interviewQuestions_stopBeforeFurtherReadingAndHaveStableSourceIds() {
        InterviewQuestionResponse response = service.getInterviewQuestions(null, null, 0, 500);

        assertTrue(response.questions().stream().noneMatch(question -> question.answerMarkdown().contains("### Further Reading")));
        assertTrue(response.questions().stream().allMatch(question -> question.id().equals(question.topicId() + "-q" + question.number())));
        assertEquals(response.questions().size(), response.questions().stream().map(question -> question.id()).distinct().count());
    }
}
