package com.csfundamentals.example;

import jakarta.persistence.EntityManager;
import io.micrometer.core.instrument.MeterRegistry;
import java.util.List;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.context.annotation.Profile;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

@Service
@Profile("persistence")
@Transactional
public class ProjectService {
    private final EntityManager em;
    private final MeterRegistry metrics;
    public ProjectService(EntityManager em, MeterRegistry metrics) { this.em = em; this.metrics = metrics; }

    private static String label(String value) {
        if (value == null || value.isBlank() || value.length() > 120)
            throw new IllegalArgumentException("Name or title must contain 1 to 120 characters.");
        return value.trim();
    }
    private ProjectEntity owned(String owner, long id) {
        return em.createQuery("select p from ProjectEntity p where p.id = :id and p.owner = :owner", ProjectEntity.class)
            .setParameter("id", id).setParameter("owner", owner).getResultStream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Project not found"));
    }
    @CacheEvict(value = "projectPages", allEntries = true)
    public ProjectView create(String owner, String name) {
        ProjectEntity project = new ProjectEntity(owner, label(name));
        em.persist(project);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() { metrics.counter("tasktracker.projects.created").increment(); }
        });
        return project.view();
    }
    @Transactional(readOnly = true)
    @Cacheable(value = "projectPages", key = "#owner + ':' + #page + ':' + #size")
    public PageResult<ProjectView> page(String owner, int page, int size) {
        PageResult.check(page, size);
        long total = em.createQuery("select count(p) from ProjectEntity p where p.owner = :owner", Long.class)
            .setParameter("owner", owner).getSingleResult();
        List<ProjectView> items = em.createQuery("select p from ProjectEntity p where p.owner = :owner order by p.id", ProjectEntity.class)
            .setParameter("owner", owner).setFirstResult(page * size).setMaxResults(size)
            .getResultList().stream().map(ProjectEntity::view).toList();
        return new PageResult<>(items, page, size, total);
    }
    @Transactional(readOnly = true)
    public ProjectView find(String owner, long id) { return owned(owner, id).view(); }
    @CacheEvict(value = "projectPages", allEntries = true)
    public ProjectView rename(String owner, long id, String name, Long expectedVersion) {
        String checked = label(name);
        if (expectedVersion == null || expectedVersion < 0) throw new IllegalArgumentException("Supply the last read version.");
        ProjectEntity project = owned(owner, id);
        if (project.view().version() != expectedVersion) throw new ProjectConflictException();
        project.rename(checked);
        em.flush();
        return project.view();
    }
    @CacheEvict(value = "projectPages", allEntries = true)
    public void delete(String owner, long id) { em.remove(owned(owner, id)); }
    public Task addTask(String owner, long id, String title) {
        ProjectEntity project = owned(owner, id);
        TaskEntity task = new TaskEntity(label(title));
        project.add(task);
        em.persist(task);
        return task.toTask();
    }
    @Transactional(readOnly = true)
    public PageResult<Task> tasks(String owner, long id, int page, int size) {
        PageResult.check(page, size);
        owned(owner, id);
        long total = em.createQuery("select count(t) from TaskEntity t where t.project.id = :id", Long.class)
            .setParameter("id", id).getSingleResult();
        List<Task> items = em.createQuery("select t from TaskEntity t where t.project.id = :id order by t.id", TaskEntity.class)
            .setParameter("id", id).setFirstResult(page * size).setMaxResults(size)
            .getResultList().stream().map(TaskEntity::toTask).toList();
        return new PageResult<>(items, page, size, total);
    }
    private TaskEntity ownedTask(String owner, long projectId, long taskId) {
        owned(owner, projectId);
        return em.createQuery("select t from TaskEntity t where t.id = :id and t.project.id = :project", TaskEntity.class)
            .setParameter("id", taskId).setParameter("project", projectId).getResultStream().findFirst()
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));
    }
    public Task updateTask(String owner, long projectId, long taskId, String title, Boolean completed) {
        String checked = label(title);
        if (completed == null) throw new IllegalArgumentException("Supply completed as true or false.");
        TaskEntity task = ownedTask(owner, projectId, taskId);
        task.rename(checked); task.complete(completed);
        return task.toTask();
    }
    public void deleteTask(String owner, long projectId, long taskId) { em.remove(ownedTask(owner, projectId, taskId)); }
}
