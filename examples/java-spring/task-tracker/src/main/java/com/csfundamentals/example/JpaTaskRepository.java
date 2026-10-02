package com.csfundamentals.example;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.EntityManager;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
@Profile("persistence")
@Transactional
public class JpaTaskRepository implements TaskRepository {
    private final EntityManager entityManager;
    public JpaTaskRepository(EntityManager entityManager) { this.entityManager = entityManager; }

    public Task add(String title) {
        TaskEntity task = new TaskEntity(title);
        entityManager.persist(task);
        return task.toTask();
    }

    @Transactional(readOnly = true)
    public List<Task> findAll() {
        return entityManager.createQuery("select t from TaskEntity t order by t.id", TaskEntity.class)
            .getResultList().stream().map(TaskEntity::toTask).toList();
    }

    @Transactional(readOnly = true)
    public Optional<Task> find(long id) {
        return Optional.ofNullable(entityManager.find(TaskEntity.class, id)).map(TaskEntity::toTask);
    }

    public Optional<Task> setCompleted(long id, boolean completed) {
        TaskEntity task = entityManager.find(TaskEntity.class, id);
        if (task == null) return Optional.empty();
        task.complete(completed);
        return Optional.of(task.toTask());
    }
}
