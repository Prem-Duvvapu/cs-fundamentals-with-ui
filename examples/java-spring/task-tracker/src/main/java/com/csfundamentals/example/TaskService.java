package com.csfundamentals.example;

import java.util.List;
import java.util.Objects;
import java.util.Optional;

public class TaskService {
    private final TaskRepository repository;
    public TaskService(TaskRepository repository) { this.repository = Objects.requireNonNull(repository); }
    public Task create(String title) {
        if (title == null || title.isBlank() || title.length() > 120) {
            throw new IllegalArgumentException("Title must contain 1 to 120 characters.");
        }
        return repository.add(title.trim());
    }
    public List<Task> list() { return repository.findAll(); }
    public Optional<Task> find(long id) { return repository.find(id); }
    public Optional<Task> complete(long id, boolean completed) { return repository.setCompleted(id, completed); }
}
