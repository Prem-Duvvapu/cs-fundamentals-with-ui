package com.csfundamentals.example;

import jakarta.persistence.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import java.util.function.Function;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:lifecycle;DB_CLOSE_DELAY=-1")
@ActiveProfiles("persistence")
class JpaLifecycleTest {
    @Autowired EntityManagerFactory factory;
    @Autowired TaskRepository repository;

    private <T> T committed(Function<EntityManager, T> work) {
        EntityManager em = factory.createEntityManager();
        try {
            em.getTransaction().begin();
            T result = work.apply(em);
            em.getTransaction().commit();
            return result;
        } finally {
            if (em.getTransaction().isActive()) em.getTransaction().rollback();
            em.close();
        }
    }

    @Test void managedMutationSurvivesInAnotherContextAndMergeCopiesDetachedState() {
        long id = repository.add("Initial").id();
        TaskEntity detached = committed(em -> {
            TaskEntity first = em.find(TaskEntity.class, id);
            assertSame(first, em.find(TaskEntity.class, id));
            assertSame(first, em.merge(first));
            first.rename("Managed mutation");
            return first;
        });
        assertEquals("Managed mutation", repository.find(id).orElseThrow().title());
        detached.rename("Detached only");
        assertEquals("Managed mutation", repository.find(id).orElseThrow().title());
        committed(em -> {
            TaskEntity managed = em.merge(detached);
            assertNotSame(detached, managed);
            assertFalse(em.contains(detached));
            assertTrue(em.contains(managed));
            managed.rename("Returned copy");
            detached.rename("Untracked later change");
            return null;
        });
        assertEquals("Returned copy", repository.find(id).orElseThrow().title());
    }

    @Test void flushedSqlStillRollsBackAndRemovedIsNotContained() {
        long id = repository.add("Keep this").id();
        try (EntityManager em = factory.createEntityManager()) {
            em.getTransaction().begin();
            TaskEntity task = em.find(TaskEntity.class, id);
            task.rename("Rollback this");
            em.flush();
            assertEquals("Rollback this", em.createNativeQuery("select title from tasks where id = :id")
                .setParameter("id", id).getSingleResult());
            em.getTransaction().rollback();
        }
        assertEquals("Keep this", repository.find(id).orElseThrow().title());
        committed(em -> {
            TaskEntity task = em.find(TaskEntity.class, id);
            em.remove(task);
            assertFalse(em.contains(task));
            em.persist(task);
            assertTrue(em.contains(task));
            return null;
        });
        assertTrue(repository.find(id).isPresent());
    }

    @Test void staleVersionFailsAndDoesNotOverwriteTheCommittedWinner() {
        long id = repository.add("Original").id();
        try (EntityManager stale = factory.createEntityManager()) {
            stale.getTransaction().begin();
            TaskEntity old = stale.find(TaskEntity.class, id);
            committed(em -> { em.find(TaskEntity.class, id).rename("Winner"); return null; });
            old.rename("Stale writer");
            assertThrows(OptimisticLockException.class, stale::flush);
            assertTrue(stale.getTransaction().getRollbackOnly());
            stale.getTransaction().rollback();
        }
        assertEquals("Winner", repository.find(id).orElseThrow().title());
    }
}
