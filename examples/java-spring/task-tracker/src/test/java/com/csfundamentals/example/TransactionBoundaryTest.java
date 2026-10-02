package com.csfundamentals.example;

import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:boundaries;DB_CLOSE_DELAY=-1")
@ActiveProfiles("persistence")
@Import(TransactionBoundaryTest.Configuration.class)
class TransactionBoundaryTest {
    @Autowired FailureService service;
    @Autowired TaskRepository repository;

    @Test void uncheckedFailureRollsBackWhileDefaultCheckedFailureCommits() {
        assertThrows(IllegalStateException.class, () -> service.unchecked("Unchecked"));
        assertFalse(hasTitle("Unchecked"));
        assertThrows(CheckedFailure.class, () -> service.checked("Checked"));
        assertTrue(hasTitle("Checked"));
    }

    @Test void explicitCheckedRuleRollsBackAndSelfInvocationBypassesTheBoundary() {
        assertThrows(CheckedFailure.class, () -> service.checkedRollback("Explicit rollback"));
        assertFalse(hasTitle("Explicit rollback"));
        assertTrue(service.transactionActive());
        assertFalse(service.selfInvocation());
        assertTrue(service.outerTransaction());
    }

    private boolean hasTitle(String title) {
        return repository.findAll().stream().anyMatch(task -> task.title().equals(title));
    }

    static class CheckedFailure extends Exception { }
    @TestConfiguration
    static class Configuration {
        @Bean FailureService failureService(EntityManager em) { return new FailureService(em); }
    }
    public static class FailureService {
        private final EntityManager em;
        public FailureService(EntityManager em) { this.em = em; }
        private void insert(String title) { em.persist(new TaskEntity(title)); em.flush(); }
        @Transactional public void unchecked(String title) {
            insert(title); throw new IllegalStateException("Deliberate test failure");
        }
        @Transactional public void checked(String title) throws CheckedFailure {
            insert(title); throw new CheckedFailure();
        }
        @Transactional(rollbackFor = CheckedFailure.class)
        public void checkedRollback(String title) throws CheckedFailure {
            insert(title); throw new CheckedFailure();
        }
        @Transactional public boolean transactionActive() {
            return TransactionSynchronizationManager.isActualTransactionActive();
        }
        public boolean selfInvocation() { return transactionActive(); }
        @Transactional public boolean outerTransaction() { return transactionActive(); }
    }
}
