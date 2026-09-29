package com.csfundamentals.example;

import java.net.URI;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/tasks")
public class TaskController {
    private final TaskService service;
    public TaskController(TaskService service) { this.service = service; }
    record CreateTask(String title) { }
    record CompleteTask(Boolean completed) { }

    @GetMapping public List<Task> list() { return service.list(); }
    @GetMapping("/{id}") public Task find(@PathVariable long id) {
        return service.find(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }
    @PostMapping public ResponseEntity<Task> create(@RequestBody CreateTask request) {
        Task task = service.create(request.title());
        return ResponseEntity.created(URI.create("/api/tasks/" + task.id())).body(task);
    }
    @PutMapping("/{id}/completion") public Task complete(@PathVariable long id, @RequestBody CompleteTask request) {
        if (request.completed() == null) throw new IllegalArgumentException("Supply completed as true or false.");
        return service.complete(id, request.completed()).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }
    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalid(IllegalArgumentException failure) {
        return ProblemDetail.forStatusAndDetail(HttpStatus.BAD_REQUEST, failure.getMessage());
    }
}
