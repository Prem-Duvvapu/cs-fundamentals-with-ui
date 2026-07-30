package com.csfundamentals.model.simulation;

import java.util.List;

public record SchedulingRequest(
    List<ProcessInput> processes,
    String algorithm,
    int timeQuantum
) {
    public record ProcessInput(
        String id,
        int arrivalTime,
        int burstTime,
        int priority,
        String color
    ) {}
}
