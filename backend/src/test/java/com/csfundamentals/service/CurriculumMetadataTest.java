package com.csfundamentals.service;

import com.csfundamentals.model.Topic;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class CurriculumMetadataTest {
    private Topic topic(String id, int order, String... prerequisites) {
        return new Topic(id, id, "java-spring", "beginner", "Example", order, List.of(prerequisites), List.of("Explain an example"));
    }
    @Test void validatesAllRegisteredTopics() {
        var service = new TopicService();
        assertEquals(68, service.getAllTopics().size());
        assertTrue(service.getAllTopics().stream().allMatch(t -> t.order() > 0 && !t.outcomes().isEmpty()));
        assertTrue(service.getTopicById("java-oop-pillars").order() < service.getTopicById("spring-bean-lifecycle").order());
    }
    @Test void rejectsMissingPrerequisitesCyclesAndDuplicatePositions() {
        assertThrows(IllegalArgumentException.class, () -> TopicService.validate(List.of(topic("a", 1, "missing"))));
        assertThrows(IllegalArgumentException.class, () -> TopicService.validate(List.of(topic("a", 1, "b"), topic("b", 2, "a"))));
        assertThrows(IllegalArgumentException.class, () -> TopicService.validate(List.of(topic("a", 1), topic("b", 1))));
    }
    @Test void allowsSharedPrerequisitesWithoutMistakingThemForCycles() {
        assertDoesNotThrow(() -> TopicService.validate(List.of(topic("a", 1), topic("b", 2, "a"), topic("c", 3, "a", "b"))));
    }
}
