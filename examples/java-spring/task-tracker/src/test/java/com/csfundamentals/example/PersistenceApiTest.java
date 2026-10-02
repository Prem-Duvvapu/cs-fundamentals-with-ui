package com.csfundamentals.example;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = "spring.datasource.url=jdbc:h2:mem:api;DB_CLOSE_DELAY=-1")
@ActiveProfiles("persistence")
@AutoConfigureMockMvc
class PersistenceApiTest {
    @Autowired MockMvc mvc;
    @Test void keepsTheHttpContractWithDatabaseBackedRequests() throws Exception {
        String location = mvc.perform(post("/api/tasks").contentType("application/json")
            .content("{\"title\":\"Database task\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.title").value("Database task"))
            .andReturn().getResponse().getHeader("Location");
        mvc.perform(put(location + "/completion").contentType("application/json")
            .content("{\"completed\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
        mvc.perform(get(location)).andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
        mvc.perform(post("/api/tasks").contentType("application/json").content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest());
        mvc.perform(get("/api/tasks/999999")).andExpect(status().isNotFound());
    }
}
