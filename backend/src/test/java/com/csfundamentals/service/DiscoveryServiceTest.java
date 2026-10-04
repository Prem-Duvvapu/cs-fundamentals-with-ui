package com.csfundamentals.service;

import com.csfundamentals.model.InterviewQuestionResponse;
import com.csfundamentals.model.SearchResponse;
import tools.jackson.databind.ObjectMapper;
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
    void outlines_coverAllSixCategoriesAndOnlyExposeHeadingMarkdown() {
        var categories = java.util.Map.of("os", 8, "networking", 12, "dbms", 13,
                "java-spring", 23, "aiml", 7, "devops", 5);
        categories.forEach((category, count) -> {
            var entries = service.getTopicOutlines(category);
            assertEquals(count, entries.size(), category);
            for (var entry : entries) {
                assertTrue(entry.headingsMarkdown().contains("Beginner Level"), entry.topicId());
                assertTrue(entry.headingsMarkdown().contains("Expert Level"), entry.topicId());
                assertTrue(entry.headingsMarkdown().lines().filter(line -> !line.isBlank())
                        .allMatch(line -> line.matches("^ {0,3}#{2,6}[\\t ]+.*$")), entry.topicId());
            }
            assertThrows(UnsupportedOperationException.class, () -> entries.add(entries.get(0)));
        });
        assertThrows(IllegalArgumentException.class, () -> service.getTopicOutlines("unknown"));
        assertThrows(IllegalArgumentException.class, () -> service.getTopicOutlines(""));
        assertThrows(IllegalArgumentException.class, () -> service.getTopicOutlines(null));
    }

    @Test
    void outlines_skipFencedCodeButPreserveFormattingAndDeeperHeadingOrder() {
        String markdown = "# Metadata\r\n## Real\r\n```text\r\n### Fake\r\n````\r\n"
                + "~~~text\r\n## Also fake\r\n~~~\r\n    ## Indented code\r\n"
                + "#### Duplicate\r\n### **Duplicate** ###\r\n### `Map<K, V>` &amp; sets";
        assertEquals("## Real\n\n#### Duplicate\n\n### **Duplicate** ###\n\n### `Map<K, V>` &amp; sets",
                DiscoveryService.outlineMarkdown(markdown));
    }

    @Test
    void constructor_buildsOneImmutableIndexForTheValidatedCurriculum() {
        assertEquals(68, service.indexedTopicCount());
        assertEquals(953, service.indexedQuestionCount());

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

    @Test
    void interviewQuestions_preserveAuthoredRubricInCanonicalMarkdownAnswer() {
        InterviewQuestionResponse response = service.getInterviewQuestions("java-spring", null, 0, 500);
        var rubricQuestion = response.questions().stream()
                .filter(question -> question.id().equals("java-oop-pillars-q3"))
                .findFirst().orElseThrow();

        assertTrue(rubricQuestion.answerMarkdown().contains("**Answer rubric**"));
        assertTrue(rubricQuestion.answerMarkdown().contains("- **Follow-up:**"));
        assertFalse(rubricQuestion.answerMarkdown().contains("### Further Reading"));
    }

    @Test
    void interviewQuestions_keepNewChecklistsOnTheirCanonicalQuestionsAcrossPages() {
        var first = service.getInterviewQuestions(null, null, 0, 500);
        var second = service.getInterviewQuestions(null, null, 500, 500);
        var questions = java.util.stream.Stream.concat(first.questions().stream(), second.questions().stream()).toList();
        assertEquals(953, questions.size());
        assertEquals(56, questions.stream().filter(question -> question.answerMarkdown().contains("**Answer rubric**")).count());

        var addedIds = java.util.List.of(
                "java-streams-optional-q7", "java-streams-optional-q9",
                "spring-batch-lifecycle-q4", "spring-batch-lifecycle-q12",
                "synchronization-q3", "synchronization-q12",
                "physical-layer-media-q5", "physical-layer-media-q12",
                "routing-algorithms-q2", "routing-algorithms-q13",
                "functional-dependencies-keys-q5", "functional-dependencies-keys-q12");
        var added = questions.stream().filter(question -> addedIds.contains(question.id())).toList();
        assertEquals(12, added.size());
        for (var question : added) {
            for (var label : java.util.List.of("Say it", "Mechanism", "Example", "Limit", "Watch for", "Follow-up")) {
                assertTrue(question.answerMarkdown().contains("- **" + label + ":**"), question.id() + " " + label);
            }
            assertFalse(question.answerMarkdown().contains("### Further Reading"));
            assertFalse(question.answerMarkdown().contains("**Q"), question.id());
        }
    }
}
