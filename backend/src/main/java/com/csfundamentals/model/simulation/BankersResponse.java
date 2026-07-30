package com.csfundamentals.model.simulation;

import java.util.List;

public record BankersResponse(
    boolean isSafe,
    List<String> sequence,
    int[] work
) {}
