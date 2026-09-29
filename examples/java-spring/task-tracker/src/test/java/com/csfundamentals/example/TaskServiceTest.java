package com.csfundamentals.example;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class TaskServiceTest {
    @Test void createsListsAndCompletesTasksWithoutSpring() {
        var service = new TaskService(new MemoryTaskRepository());
        var task = service.create("  Read  ");
        assertEquals("Read", task.title());
        assertFalse(task.completed());
        assertTrue(service.complete(task.id(), true).orElseThrow().completed());
        assertEquals(1, service.list().size());
        assertTrue(service.find(999).isEmpty());
    }
    @Test void rejectsInvalidInputBeforeChangingState() {
        var service = new TaskService(new MemoryTaskRepository());
        assertThrows(IllegalArgumentException.class, () -> service.create(" "));
        assertThrows(IllegalArgumentException.class, () -> service.create(null));
        assertThrows(IllegalArgumentException.class, () -> service.create("x".repeat(121)));
        assertTrue(service.list().isEmpty());
    }
    @Test void listIsACopyAndCannotChangeStoredData() {
        var service = new TaskService(new MemoryTaskRepository());
        service.create("Read");
        service.list().clear();
        assertEquals(1, service.list().size());
    }
}
