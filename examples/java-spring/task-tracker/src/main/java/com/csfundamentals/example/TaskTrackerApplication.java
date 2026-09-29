package com.csfundamentals.example;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

@SpringBootApplication
public class TaskTrackerApplication {
    public static void main(String[] args) { SpringApplication.run(TaskTrackerApplication.class, args); }
    @Bean TaskRepository taskRepository() { return new MemoryTaskRepository(); }
    @Bean TaskService taskService(TaskRepository repository) { return new TaskService(repository); }
}
