package com.csfundamentals.example;

import java.net.URI;
import java.security.Principal;
import org.springframework.context.annotation.Profile;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@Profile("secure & persistence")
@RequestMapping("/api/projects")
public class ProjectController {
    private final ProjectService service;
    public ProjectController(ProjectService service) { this.service = service; }
    record NameRequest(String name, Long version) { }
    record TaskRequest(String title, Boolean completed) { }
    @GetMapping public PageResult<ProjectView> page(Principal user, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return service.page(user.getName(), page, size);
    }
    @GetMapping("/{id}") public ProjectView find(Principal user, @PathVariable long id) { return service.find(user.getName(), id); }
    @PostMapping public ResponseEntity<ProjectView> create(Principal user, @RequestBody NameRequest request) {
        ProjectView project = service.create(user.getName(), request.name());
        return ResponseEntity.created(URI.create("/api/projects/" + project.id())).body(project);
    }
    @PutMapping("/{id}") public ProjectView rename(Principal user, @PathVariable long id, @RequestBody NameRequest request) {
        return service.rename(user.getName(), id, request.name(), request.version());
    }
    @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(Principal user, @PathVariable long id) { service.delete(user.getName(), id); }
    @PostMapping("/{id}/tasks") public ResponseEntity<Task> addTask(Principal user, @PathVariable long id, @RequestBody TaskRequest request) {
        Task task = service.addTask(user.getName(), id, request.title());
        return ResponseEntity.created(URI.create("/api/projects/" + id + "/tasks/" + task.id())).body(task);
    }
    @GetMapping("/{id}/tasks") public PageResult<Task> tasks(Principal user, @PathVariable long id, @RequestParam(defaultValue="0") int page, @RequestParam(defaultValue="20") int size) {
        return service.tasks(user.getName(), id, page, size);
    }
    @PutMapping("/{id}/tasks/{taskId}") public Task updateTask(Principal user, @PathVariable long id, @PathVariable long taskId, @RequestBody TaskRequest request) {
        return service.updateTask(user.getName(), id, taskId, request.title(), request.completed());
    }
    @DeleteMapping("/{id}/tasks/{taskId}") @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteTask(Principal user, @PathVariable long id, @PathVariable long taskId) { service.deleteTask(user.getName(), id, taskId); }
}
