package com.csfundamentals.controller;

import com.csfundamentals.service.SimulationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(SimulationController.class)
class SimulationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private SimulationService simulationService;

    @Test
    void invalidSimulationInputReturnsProblemDetail() throws Exception {
        when(simulationService.computeScheduling(any())).thenThrow(new IllegalArgumentException("burstTime must be positive"));

        mockMvc.perform(post("/api/v1/simulation/cpu-scheduling")
                .contentType("application/json")
                .content("{\"processes\":[{\"id\":\"P1\",\"arrivalTime\":0,\"burstTime\":0,\"priority\":1}],\"algorithm\":\"SRTF\",\"timeQuantum\":2}"))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.title").value("Invalid simulation request"))
            .andExpect(jsonPath("$.detail").value("burstTime must be positive"));
    }
}
