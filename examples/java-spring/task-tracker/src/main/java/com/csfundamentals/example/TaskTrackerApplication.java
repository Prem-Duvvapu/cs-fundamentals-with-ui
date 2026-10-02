package com.csfundamentals.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Profile;

@SpringBootApplication
public class TaskTrackerApplication {
    public static void main(String[] args) { SpringApplication.run(TaskTrackerApplication.class, args); }
    @Bean @Profile("!persistence") TaskRepository taskRepository() { return new MemoryTaskRepository(); }
    @Bean TaskService taskService(TaskRepository repository) { return new TaskService(repository); }
}
