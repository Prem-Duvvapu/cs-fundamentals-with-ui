package com.csfundamentals.model.simulation;

public record SubnetRequest(
    String ipAddress,
    int cidr
) {}
