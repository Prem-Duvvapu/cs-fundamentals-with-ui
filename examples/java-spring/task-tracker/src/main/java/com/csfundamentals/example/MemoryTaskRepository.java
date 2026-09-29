package com.csfundamentals.example;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.TreeMap;

public class MemoryTaskRepository implements TaskRepository {
    private final TreeMap<Long, Task> tasks = new TreeMap<>();
    private long nextId = 1;

    public synchronized Task add(String title) {
        Task task = new Task(nextId++, title, false);
        tasks.put(task.id(), task);
        return task;
    }
    public synchronized List<Task> findAll() { return new ArrayList<>(tasks.values()); }
    public synchronized Optional<Task> find(long id) { return Optional.ofNullable(tasks.get(id)); }
    public synchronized Optional<Task> setCompleted(long id, boolean completed) {
        Task previous = tasks.get(id);
        if (previous == null) return Optional.empty();
        Task updated = new Task(id, previous.title(), completed);
        tasks.put(id, updated);
        return Optional.of(updated);
    }
}
