package com.csfundamentals.model.simulation;

import java.util.List;

public record BankersRequest(
    int[][] allocation,
    int[][] max,
    int[] available
) {}
