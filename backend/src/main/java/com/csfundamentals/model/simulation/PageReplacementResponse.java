package com.csfundamentals.model.simulation;

import java.util.List;

public record PageReplacementResponse(
    List<StepDetail> stepHistory
) {
    public record StepDetail(
        int page,
        List<Integer> frames,
        boolean isFault,
        boolean hit,
        int faultsSoFar,
        int hitsSoFar
    ) {}
}
