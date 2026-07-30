package com.csfundamentals.service;

import com.csfundamentals.model.simulation.*;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SimulationServiceTest {

    private final SimulationService service = new SimulationService();

    @Test
    void testComputeSchedulingFCFS() {
        var processes = List.of(
            new SchedulingRequest.ProcessInput("P1", 0, 4, 1, "#fff"),
            new SchedulingRequest.ProcessInput("P2", 1, 2, 2, "#000")
        );
        var req = new SchedulingRequest(processes, "FCFS", 2);
        var res = service.computeScheduling(req);

        assertNotNull(res.gantt());
        assertEquals(6, res.gantt().size());
        assertEquals(2, res.processMetrics().size());
    }

    @Test
    void testComputePageReplacementLRU() {
        var stream = List.of(7, 0, 1, 2, 0, 3);
        var req = new PageReplacementRequest(stream, 3, "LRU");
        var res = service.computePageReplacement(req);

        assertEquals(6, res.stepHistory().size());
        assertTrue(res.stepHistory().get(0).isFault());
    }

    @Test
    void testComputeSubnet() {
        var req = new SubnetRequest("192.168.1.50", 24);
        var res = service.computeSubnet(req);

        assertTrue(res.valid());
        assertEquals("192.168.1.0", res.networkIp());
        assertEquals("255.255.255.0", res.subnetMask());
        assertEquals("192.168.1.255", res.broadcastIp());
    }

    @Test
    void testComputeBankersAlgorithm() {
        int[][] alloc = {
            {0, 1, 0},
            {2, 0, 0},
            {3, 0, 2},
            {2, 1, 1},
            {0, 0, 2}
        };
        int[][] max = {
            {7, 5, 3},
            {3, 2, 2},
            {9, 0, 2},
            {2, 2, 2},
            {4, 3, 3}
        };
        int[] available = {3, 3, 2};

        var req = new BankersRequest(alloc, max, available);
        var res = service.computeBankersAlgorithm(req);

        assertTrue(res.isSafe());
        assertEquals(5, res.sequence().size());
    }
}
