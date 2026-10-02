package com.csfundamentals.example;

import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.boot.WebApplicationType;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import static org.junit.jupiter.api.Assertions.*;

class FilePersistenceTest {
    @TempDir Path directory;

    private ConfigurableApplicationContext open() {
        return new SpringApplicationBuilder(TaskTrackerApplication.class)
            .web(WebApplicationType.NONE).profiles("persistence")
            .run("--spring.datasource.url=jdbc:h2:file:" + directory.resolve("tasks"),
                "--spring.main.banner-mode=off");
    }

    @Test void committedTaskSurvivesClosingAndReopeningTheApplication() {
        long id;
        try (var first = open()) {
            TaskRepository repository = first.getBean(TaskRepository.class);
            id = repository.add("Survives restart").id();
            repository.setCompleted(id, true);
        }
        try (var second = open()) {
            Task task = second.getBean(TaskRepository.class).find(id).orElseThrow();
            assertEquals("Survives restart", task.title());
            assertTrue(task.completed());
        }
    }
}
