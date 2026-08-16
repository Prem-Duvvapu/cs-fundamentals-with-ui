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

    @Test
    void testComputeSchedulingRoundRobin() {
        var processes = List.of(
            new SchedulingRequest.ProcessInput("P1", 0, 5, 1, "#fff"),
            new SchedulingRequest.ProcessInput("P2", 1, 3, 2, "#000")
        );
        var req = new SchedulingRequest(processes, "RR", 2);
        var res = service.computeScheduling(req);

        assertNotNull(res.gantt());
        assertEquals(8, res.gantt().size());
        assertEquals(2, res.processMetrics().size());
    }

    @Test
    void testComputeSchedulingPriorityAndSJF() {
        var processes = List.of(
            new SchedulingRequest.ProcessInput("P1", 0, 4, 3, "#fff"),
            new SchedulingRequest.ProcessInput("P2", 0, 2, 1, "#000")
        );

        var reqPriority = new SchedulingRequest(processes, "Priority", 1);
        var resPriority = service.computeScheduling(reqPriority);
        assertEquals(6, resPriority.gantt().size());

        var reqSjf = new SchedulingRequest(processes, "SJF", 1);
        var resSjf = service.computeScheduling(reqSjf);
        assertEquals(6, resSjf.gantt().size());
    }

    @Test
    void testComputeSchedulingEmpty() {
        var req = new SchedulingRequest(List.of(), "FCFS", 2);
        var res = service.computeScheduling(req);
        assertTrue(res.gantt().isEmpty());
        assertTrue(res.processMetrics().isEmpty());
    }

    @Test
    void testComputePageReplacementFIFOAndOptimal() {
        var stream = List.of(1, 2, 3, 1, 4, 5);

        var reqFifo = new PageReplacementRequest(stream, 3, "FIFO");
        var resFifo = service.computePageReplacement(reqFifo);
        assertEquals(6, resFifo.stepHistory().size());

        var reqOpt = new PageReplacementRequest(stream, 3, "OPTIMAL");
        var resOpt = service.computePageReplacement(reqOpt);
        assertEquals(6, resOpt.stepHistory().size());
    }

    @Test
    void testComputeSubnetEdgeCases() {
        var invalidReq = new SubnetRequest("999.999.999.999", 24);
        var invalidRes = service.computeSubnet(invalidReq);
        assertFalse(invalidRes.valid());

        var hostReq = new SubnetRequest("10.0.0.1", 32);
        var hostRes = service.computeSubnet(hostReq);
        assertTrue(hostRes.valid());
        assertEquals("255.255.255.255", hostRes.subnetMask());
    }

    @Test
    void testComputeBankersAlgorithmUnsafeState() {
        int[][] alloc = {
            {2, 0, 0},
            {3, 0, 2}
        };
        int[][] max = {
            {7, 5, 3},
            {9, 0, 2}
        };
        int[] available = {0, 0, 0};

        var req = new BankersRequest(alloc, max, available);
        var res = service.computeBankersAlgorithm(req);

        assertFalse(res.isSafe(), "Zero available resources should result in unsafe state");
    }
}
