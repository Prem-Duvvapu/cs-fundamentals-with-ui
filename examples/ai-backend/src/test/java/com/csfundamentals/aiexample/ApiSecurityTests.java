package com.csfundamentals.aiexample;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class ApiSecurityTests {
    private static final String ALICE = java.util.UUID.randomUUID().toString();
    @DynamicPropertySource static void credentials(DynamicPropertyRegistry properties) {
        properties.add("ai.alice-password", () -> ALICE);
        properties.add("ai.bob-password", () -> java.util.UUID.randomUUID().toString());
        properties.add("ai.approval-secret", () -> java.util.UUID.randomUUID().toString());
    }
    @Autowired MockMvc mvc;
    @Test void requiresIdentityAndProtectsBrowserWriteRequests() throws Exception {
        mvc.perform(get("/api/csrf")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/csrf").with(httpBasic("alice", ALICE))).andExpect(status().isOk()).andExpect(jsonPath("$.token").isNotEmpty());
        mvc.perform(post("/api/extract").with(httpBasic("alice", ALICE)).contentType("application/json").content("{\"text\":\"hello\"}"))
                .andExpect(status().isForbidden());
    }
    @Test void invalidInputIsAClientErrorAfterAuthenticationAndCsrf() throws Exception {
        mvc.perform(post("/api/extract").with(httpBasic("alice", ALICE)).with(csrf()).contentType("application/json").content("{\"text\":\" \"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("ticket_text_required_max_8192"));
    }
}
