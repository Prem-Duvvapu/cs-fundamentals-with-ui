package com.csfundamentals.example;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class TaskApiTest {
    @Autowired MockMvc mvc;
    @Test void createsAndRetrievesThroughRealMvcSerialization() throws Exception {
        String location = mvc.perform(post("/api/tasks").contentType("application/json").content("{\"title\":\"Read\"}"))
            .andExpect(status().isCreated()).andExpect(jsonPath("$.title").value("Read"))
            .andReturn().getResponse().getHeader("Location");
        mvc.perform(get(location)).andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(false));
        mvc.perform(put(location + "/completion").contentType("application/json").content("{\"completed\":true}"))
            .andExpect(status().isOk()).andExpect(jsonPath("$.completed").value(true));
    }
    @Test void exposesUsefulFailureResponses() throws Exception {
        mvc.perform(post("/api/tasks").contentType("application/json").content("{\"title\":\" \"}"))
            .andExpect(status().isBadRequest()).andExpect(jsonPath("$.detail").value("Title must contain 1 to 120 characters."));
        mvc.perform(get("/api/tasks/999999")).andExpect(status().isNotFound());
        mvc.perform(put("/api/tasks/999999/completion").contentType("application/json").content("{}"))
            .andExpect(status().isBadRequest());
    }
}
