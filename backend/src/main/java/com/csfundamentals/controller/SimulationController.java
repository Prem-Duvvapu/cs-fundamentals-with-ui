package com.csfundamentals.controller;

import com.csfundamentals.model.simulation.*;
import com.csfundamentals.service.SimulationService;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/simulation")
public class SimulationController {

    private final SimulationService simulationService;

    public SimulationController(SimulationService simulationService) {
        this.simulationService = simulationService;
    }

    @PostMapping("/cpu-scheduling")
    public SchedulingResponse computeCpuScheduling(@RequestBody SchedulingRequest request) {
        return simulationService.computeScheduling(request);
    }

    @PostMapping("/page-replacement")
    public PageReplacementResponse computePageReplacement(@RequestBody PageReplacementRequest request) {
        return simulationService.computePageReplacement(request);
    }

    @PostMapping("/subnet-calculator")
    public SubnetResponse computeSubnet(@RequestBody SubnetRequest request) {
        return simulationService.computeSubnet(request);
    }

    @PostMapping("/bankers-algorithm")
    public BankersResponse computeBankersAlgorithm(@RequestBody BankersRequest request) {
        return simulationService.computeBankersAlgorithm(request);
    }
}
