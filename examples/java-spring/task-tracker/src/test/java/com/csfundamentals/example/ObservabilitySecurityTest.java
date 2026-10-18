package com.csfundamentals.example;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties="spring.datasource.url=jdbc:h2:mem:observability-security;DB_CLOSE_DELAY=-1")
@ActiveProfiles({"observability","secure"})
@AutoConfigureMockMvc
class ObservabilitySecurityTest {
    @DynamicPropertySource static void passwords(DynamicPropertyRegistry properties) {
        for(String name:new String[]{"ALICE","BOB","VIEWER"}) properties.add("TASK_TRACKER_"+name+"_PASSWORD",()->java.util.UUID.randomUUID().toString());
    }
    @Autowired MockMvc mvc;
    @Test void probeRetainsRoleAndCsrfBoundaries() throws Exception {
        mvc.perform(post("/api/observability/probe").with(user("viewer").roles("VIEWER")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(post("/api/observability/probe").with(user("alice").roles("LEARNER"))).andExpect(status().isForbidden());
        mvc.perform(post("/api/observability/probe").with(user("alice").roles("LEARNER")).with(csrf())).andExpect(status().isOk());
    }
}
