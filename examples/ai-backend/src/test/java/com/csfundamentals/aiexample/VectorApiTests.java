package com.csfundamentals.aiexample;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class VectorApiTests {
    private static final String ALICE = UUID.randomUUID().toString();
    @DynamicPropertySource static void credentials(DynamicPropertyRegistry properties) {
        properties.add("ai.alice-password", () -> ALICE);
        properties.add("ai.bob-password", () -> UUID.randomUUID().toString());
        properties.add("ai.approval-secret", () -> UUID.randomUUID().toString());
        properties.add("ai.jdbc-url", () -> "jdbc:h2:mem:vector_api;DB_CLOSE_DELAY=-1");
    }
    @MockitoBean KnowledgeService service;
    @Autowired MockMvc mvc;
    @Test void indexingRequiresIdentityAndCsrf() throws Exception {
        mvc.perform(get("/api/index/status")).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/index/rebuild").with(csrf())).andExpect(status().isUnauthorized());
        mvc.perform(post("/api/index/rebuild").with(httpBasic("alice", ALICE))).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void tenantQueryCannotOverrideAuthenticatedPrincipal() throws Exception {
        when(service.rebuildIndex("alice")).thenReturn(new PgVectorKnowledgeIndex.Status("fixture", true, 1, 1, "generation"));
        mvc.perform(post("/api/index/rebuild?tenant=tenant-b").with(httpBasic("alice", ALICE)).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.ready").value(true));
        verify(service).rebuildIndex("alice"); verify(service, never()).rebuildIndex("bob");
    }
    @Test void invalidVectorsAndStaleCapacityDatabaseFailuresHaveExplicitStatuses() throws Exception {
        when(service.rebuildIndex("alice")).thenThrow(new EmbeddingProvider.Failure("embedding_invalid_vector"));
        mvc.perform(post("/api/index/rebuild").with(httpBasic("alice", ALICE)).with(csrf()))
                .andExpect(status().isBadGateway()).andExpect(jsonPath("$.error").value("embedding_invalid_vector"));
        for (var error : java.util.Map.of("vector_index_missing_or_stale", 409, "vector_rebuild_in_progress", 503, "vector_database_unavailable", 503).entrySet()) {
            doThrow(new KnowledgeRetrieval.Unavailable(error.getKey())).when(service).indexStatus("alice");
            mvc.perform(get("/api/index/status").with(httpBasic("alice", ALICE)))
                    .andExpect(status().is(error.getValue())).andExpect(jsonPath("$.error").value(error.getKey()));
        }
    }
}
