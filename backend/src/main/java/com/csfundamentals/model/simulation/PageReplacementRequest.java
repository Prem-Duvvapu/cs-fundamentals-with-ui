package com.csfundamentals.model.simulation;

import java.util.List;

public record PageReplacementRequest(
    List<Integer> stream,
    int numFrames,
    String algorithm
) {}
