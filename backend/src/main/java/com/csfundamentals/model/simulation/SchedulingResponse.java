package com.csfundamentals.model.simulation;

import java.util.List;

public record SchedulingResponse(
    List<GanttBlock> gantt,
    List<ProcessMetric> processMetrics
) {
    public record GanttBlock(int start, int end, String processId) {}
    
    public record ProcessMetric(
        String id,
        int arrivalTime,
        int burstTime,
        int priority,
        int completionTime,
        int turnaroundTime,
        int waitingTime,
        int responseTime
    ) {}
}
