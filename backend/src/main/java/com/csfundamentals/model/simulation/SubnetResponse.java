package com.csfundamentals.model.simulation;

public record SubnetResponse(
    boolean valid,
    String networkIp,
    String broadcastIp,
    String subnetMask,
    String firstHost,
    String lastHost,
    long totalHosts,
    long usableHosts
) {}
