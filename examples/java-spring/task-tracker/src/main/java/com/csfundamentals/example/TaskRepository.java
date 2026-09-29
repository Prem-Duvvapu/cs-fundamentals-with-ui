package com.csfundamentals.example;

import java.util.List;
import java.util.Optional;

public interface TaskRepository {
    Task add(String title);
    List<Task> findAll();
    Optional<Task> find(long id);
    Optional<Task> setCompleted(long id, boolean completed);
}
