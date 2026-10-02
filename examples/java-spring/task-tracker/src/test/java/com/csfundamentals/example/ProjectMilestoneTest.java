package com.csfundamentals.example;

import io.micrometer.core.instrument.MeterRegistry;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.cache.CacheManager;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {"spring.datasource.url=jdbc:h2:mem:milestone;DB_CLOSE_DELAY=-1", "TASK_TRACKER_ALICE_PASSWORD=test-alice", "TASK_TRACKER_BOB_PASSWORD=test-bob", "TASK_TRACKER_VIEWER_PASSWORD=test-viewer", "spring.jpa.properties.hibernate.generate_statistics=true"})
@ActiveProfiles("production") @AutoConfigureMockMvc
class ProjectMilestoneTest {
    @Autowired MockMvc mvc;
    @Autowired ProjectService projects;
    @Autowired PlatformTransactionManager manager;
    @Autowired CacheManager caches;
    @Autowired MeterRegistry metrics;
    @Autowired jakarta.persistence.EntityManagerFactory emf;

    @Test void securityRejectsMissingCredentialsCsrfWrongRoleAndOtherOwners() throws Exception {
        ProjectView project = projects.create("alice", "Private");
        mvc.perform(get("/api/projects")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/projects").with(httpBasic("alice", "test-alice"))
            .contentType("application/json").content("{\"name\":\"No CSRF\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(post("/api/projects").with(httpBasic("viewer", "test-viewer")).with(csrf())
            .contentType("application/json").content("{\"name\":\"Wrong role\"}"))
            .andExpect(status().isForbidden());
        mvc.perform(get("/api/projects/" + project.id()).with(httpBasic("bob", "test-bob")))
            .andExpect(status().isNotFound());
        mvc.perform(get("/api/tasks").with(httpBasic("alice", "test-alice"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/csrf").with(httpBasic("alice", "test-alice")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.headerName").value("X-CSRF-TOKEN"));
    }

    @Test void browserStyleCsrfTokenFromTheSameSessionAllowsTheWrite() throws Exception {
        var tokenResponse = mvc.perform(get("/api/csrf").with(httpBasic("alice", "test-alice"))).andReturn();
        String token = com.jayway.jsonpath.JsonPath.read(tokenResponse.getResponse().getContentAsString(), "$.token");
        var session = (org.springframework.mock.web.MockHttpSession) tokenResponse.getRequest().getSession(false);
        mvc.perform(post("/api/projects").session(session).with(httpBasic("alice", "test-alice"))
            .header("X-CSRF-TOKEN", token).contentType("application/json").content("{\"name\":\"CSRF handshake\"}"))
            .andExpect(status().isCreated());
    }

    @Test void projectAndTaskCrudPaginationAndVersionConflictsUseOneOwnershipBoundary() throws Exception {
        String location = mvc.perform(post("/api/projects").with(httpBasic("alice", "test-alice")).with(csrf())
            .contentType("application/json").content("{\"name\":\"CRUD\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getHeader("Location");
        long id = Long.parseLong(location.substring(location.lastIndexOf('/') + 1));
        String taskLocation = mvc.perform(post(location + "/tasks").with(httpBasic("alice", "test-alice")).with(csrf())
            .contentType("application/json").content("{\"title\":\"First task\"}"))
            .andExpect(status().isCreated()).andReturn().getResponse().getHeader("Location");
        mvc.perform(put(taskLocation).with(httpBasic("alice", "test-alice")).with(csrf())
            .contentType("application/json").content("{\"title\":\"Changed\",\"completed\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
        mvc.perform(get(location + "/tasks?size=1").with(httpBasic("alice", "test-alice")))
            .andExpect(status().isOk()).andExpect(jsonPath("$.items.length()").value(1)).andExpect(jsonPath("$.total").value(1));
        mvc.perform(get(location + "/tasks?size=0").with(httpBasic("alice", "test-alice"))).andExpect(status().isBadRequest());
        long version = projects.find("alice", id).version();
        projects.rename("alice", id, "Changed project", version);
        mvc.perform(put(location).with(httpBasic("alice", "test-alice")).with(csrf())
            .contentType("application/json").content("{\"name\":\"Stale\",\"version\":" + version + "}"))
            .andExpect(status().isConflict());
        mvc.perform(delete(taskLocation).with(httpBasic("alice", "test-alice")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(delete(location).with(httpBasic("alice", "test-alice")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get(location).with(httpBasic("alice", "test-alice"))).andExpect(status().isNotFound());
    }

    @Test void cacheAndMetricsPublishOnlyAfterCommitAndIsolationIncludesOwner() {
        String owner = "cache-owner";
        projects.create(owner, "Before");
        PageResult<ProjectView> before = projects.page(owner, 0, 20);
        assertSame(before, projects.page(owner, 0, 20));
        double count = metrics.counter("tasktracker.projects.created").count();
        new TransactionTemplate(manager).executeWithoutResult(tx -> {
            projects.create(owner, "Rolled back");
            tx.setRollbackOnly();
        });
        assertSame(before, projects.page(owner, 0, 20));
        assertEquals(count, metrics.counter("tasktracker.projects.created").count());
        projects.create(owner, "After commit");
        assertEquals(2, projects.page(owner, 0, 20).total());
        assertEquals(count + 1, metrics.counter("tasktracker.projects.created").count());
        assertEquals(0, projects.page("different-owner", 0, 20).total());
        assertThrows(IllegalArgumentException.class, () -> projects.page(owner, -1, 20));
    }


    @Test void boundedTaskPagesDoNotInitializeTheProjectCollectionAndDeletionCascades() {
        ProjectView project = projects.create("paging-owner", "Collection");
        for (int number = 0; number < 6; number++) projects.addTask("paging-owner", project.id(), "Task " + number);
        var statistics = emf.unwrap(org.hibernate.SessionFactory.class).getStatistics();
        statistics.clear();
        var first = projects.tasks("paging-owner", project.id(), 0, 2);
        assertEquals(6, first.total());
        assertEquals(2, first.items().size());
        assertEquals(3, statistics.getPrepareStatementCount(), "owner lookup, count and bounded task query");
        assertEquals(0, statistics.getCollectionFetchCount(), "paging must not initialize all project tasks");
        var second = projects.tasks("paging-owner", project.id(), 1, 2);
        assertTrue(first.items().get(1).id() < second.items().get(0).id());
        projects.delete("paging-owner", project.id());
        new TransactionTemplate(manager).executeWithoutResult(tx -> {
            var em = emf.createEntityManager();
            try {
                assertEquals(0L, em.createQuery("select count(t) from TaskEntity t where t.project.id = :id", Long.class)
                    .setParameter("id", project.id()).getSingleResult());
            } finally { em.close(); }
        });
    }

    @Test void healthIsPublicAndMetricsAreProtected() throws Exception {
        mvc.perform(get("/actuator/health/liveness")).andExpect(status().isOk()).andExpect(jsonPath("$.status").value("UP"));
        mvc.perform(get("/actuator/metrics")).andExpect(status().isUnauthorized());
        mvc.perform(get("/actuator/metrics").with(httpBasic("viewer", "test-viewer"))).andExpect(status().isForbidden());
        mvc.perform(get("/actuator/metrics").with(httpBasic("alice", "test-alice"))).andExpect(status().isOk());
    }
}
