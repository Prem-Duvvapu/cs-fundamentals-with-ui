package com.csfundamentals.service;

import com.csfundamentals.model.simulation.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SimulationService {

    // --- 1. CPU SCHEDULING COMPUTATION ---
    public SchedulingResponse computeScheduling(SchedulingRequest request) {
        if (request.processes() == null || request.processes().isEmpty()) {
            return new SchedulingResponse(Collections.emptyList(), Collections.emptyList());
        }

        String algo = request.algorithm() == null ? "FCFS" : request.algorithm();
        int timeQuantum = Math.max(1, request.timeQuantum());

        class ProcState {
            String id;
            int arrivalTime;
            int burstTime;
            int priority;
            int remainingTime;
            int startTime = -1;
            int completionTime = 0;
            int waitingTime = 0;
            int turnaroundTime = 0;
            int responseTime = -1;

            ProcState(SchedulingRequest.ProcessInput input) {
                this.id = input.id();
                this.arrivalTime = input.arrivalTime();
                this.burstTime = input.burstTime();
                this.priority = input.priority();
                this.remainingTime = input.burstTime();
            }
        }

        List<ProcState> procs = request.processes().stream().map(ProcState::new).toList();
        List<SchedulingResponse.GanttBlock> gantt = new ArrayList<>();
        int currentTime = 0;
        int completed = 0;
        int n = procs.size();

        if ("FCFS".equalsIgnoreCase(algo)) {
            List<ProcState> sorted = new ArrayList<>(procs);
            sorted.sort(Comparator.comparingInt(p -> p.arrivalTime));

            for (ProcState p : sorted) {
                if (currentTime < p.arrivalTime) {
                    for (int t = currentTime; t < p.arrivalTime; t++) {
                        gantt.add(new SchedulingResponse.GanttBlock(t, t + 1, null));
                    }
                    currentTime = p.arrivalTime;
                }
                p.startTime = currentTime;
                p.responseTime = p.startTime - p.arrivalTime;
                for (int t = 0; t < p.burstTime; t++) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, p.id));
                    currentTime++;
                }
                p.completionTime = currentTime;
                p.turnaroundTime = p.completionTime - p.arrivalTime;
                p.waitingTime = p.turnaroundTime - p.burstTime;
            }
        } else if ("SJF".equalsIgnoreCase(algo)) {
            boolean[] isDone = new boolean[n];
            while (completed < n) {
                List<ProcState> available = new ArrayList<>();
                for (int i = 0; i < n; i++) {
                    if (!isDone[i] && procs.get(i).arrivalTime <= currentTime) {
                        available.add(procs.get(i));
                    }
                }
                if (available.isEmpty()) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, null));
                    currentTime++;
                    continue;
                }
                available.sort(Comparator.comparingInt((ProcState p) -> p.burstTime).thenComparingInt(p -> p.arrivalTime));
                ProcState p = available.get(0);
                int pIdx = procs.indexOf(p);

                p.startTime = currentTime;
                p.responseTime = p.startTime - p.arrivalTime;
                for (int t = 0; t < p.burstTime; t++) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, p.id));
                    currentTime++;
                }
                p.completionTime = currentTime;
                p.turnaroundTime = p.completionTime - p.arrivalTime;
                p.waitingTime = p.turnaroundTime - p.burstTime;
                isDone[pIdx] = true;
                completed++;
            }
        } else if ("SRTF".equalsIgnoreCase(algo)) {
            while (completed < n) {
                List<ProcState> available = new ArrayList<>();
                for (ProcState p : procs) {
                    if (p.arrivalTime <= currentTime && p.remainingTime > 0) {
                        available.add(p);
                    }
                }
                if (available.isEmpty()) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, null));
                    currentTime++;
                    continue;
                }
                available.sort(Comparator.comparingInt((ProcState p) -> p.remainingTime).thenComparingInt(p -> p.arrivalTime));
                ProcState p = available.get(0);

                if (p.responseTime == -1) p.responseTime = currentTime - p.arrivalTime;
                gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, p.id));
                p.remainingTime--;
                currentTime++;

                if (p.remainingTime == 0) {
                    p.completionTime = currentTime;
                    p.turnaroundTime = p.completionTime - p.arrivalTime;
                    p.waitingTime = p.turnaroundTime - p.burstTime;
                    completed++;
                }
            }
        } else if ("Priority".equalsIgnoreCase(algo)) {
            boolean[] isDone = new boolean[n];
            while (completed < n) {
                List<ProcState> available = new ArrayList<>();
                for (int i = 0; i < n; i++) {
                    if (!isDone[i] && procs.get(i).arrivalTime <= currentTime) {
                        available.add(procs.get(i));
                    }
                }
                if (available.isEmpty()) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, null));
                    currentTime++;
                    continue;
                }
                available.sort(Comparator.comparingInt((ProcState p) -> p.priority).thenComparingInt(p -> p.arrivalTime));
                ProcState p = available.get(0);
                int pIdx = procs.indexOf(p);

                p.startTime = currentTime;
                p.responseTime = p.startTime - p.arrivalTime;
                for (int t = 0; t < p.burstTime; t++) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, p.id));
                    currentTime++;
                }
                p.completionTime = currentTime;
                p.turnaroundTime = p.completionTime - p.arrivalTime;
                p.waitingTime = p.turnaroundTime - p.burstTime;
                isDone[pIdx] = true;
                completed++;
            }
        } else if ("RR".equalsIgnoreCase(algo)) {
            Queue<ProcState> queue = new LinkedList<>();
            boolean[] inQueue = new boolean[n];

            for (int i = 0; i < n; i++) {
                if (procs.get(i).arrivalTime == 0) {
                    queue.add(procs.get(i));
                    inQueue[i] = true;
                }
            }

            while (completed < n) {
                if (queue.isEmpty()) {
                    final int now = currentTime;
                    boolean hasFuture = procs.stream().anyMatch(p -> p.remainingTime > 0 && p.arrivalTime > now);
                    if (hasFuture) {
                        gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, null));
                        currentTime++;
                        for (int i = 0; i < n; i++) {
                            ProcState p = procs.get(i);
                            if (!inQueue[i] && p.arrivalTime <= currentTime && p.remainingTime > 0) {
                                queue.add(p);
                                inQueue[i] = true;
                            }
                        }
                        continue;
                    } else break;
                }

                ProcState p = queue.poll();
                if (p.responseTime == -1) p.responseTime = currentTime - p.arrivalTime;

                int execTime = Math.min(p.remainingTime, timeQuantum);
                for (int t = 0; t < execTime; t++) {
                    gantt.add(new SchedulingResponse.GanttBlock(currentTime, currentTime + 1, p.id));
                    currentTime++;

                    for (int i = 0; i < n; i++) {
                        ProcState item = procs.get(i);
                        if (!inQueue[i] && item.arrivalTime <= currentTime && item.remainingTime > 0 && !item.id.equals(p.id)) {
                            queue.add(item);
                            inQueue[i] = true;
                        }
                    }
                }

                p.remainingTime -= execTime;

                if (p.remainingTime == 0) {
                    p.completionTime = currentTime;
                    p.turnaroundTime = p.completionTime - p.arrivalTime;
                    p.waitingTime = p.turnaroundTime - p.burstTime;
                    completed++;
                } else {
                    queue.add(p);
                }
            }
        }

        List<SchedulingResponse.ProcessMetric> metrics = procs.stream()
            .map(p -> new SchedulingResponse.ProcessMetric(
                p.id, p.arrivalTime, p.burstTime, p.priority,
                p.completionTime, p.turnaroundTime, p.waitingTime, p.responseTime
            )).toList();

        return new SchedulingResponse(gantt, metrics);
    }

    // --- 2. PAGE REPLACEMENT COMPUTATION ---
    public PageReplacementResponse computePageReplacement(PageReplacementRequest request) {
        if (request.stream() == null || request.stream().isEmpty()) {
            return new PageReplacementResponse(Collections.emptyList());
        }

        int numFrames = Math.max(1, request.numFrames());
        String algo = request.algorithm() == null ? "LRU" : request.algorithm();
        List<Integer> stream = request.stream();

        List<PageReplacementResponse.StepDetail> stepHistory = new ArrayList<>();
        List<Integer> currentFrames = new ArrayList<>(Collections.nCopies(numFrames, null));
        int faults = 0;
        int hits = 0;
        List<Integer> recentUsage = new ArrayList<>();

        for (int stepIdx = 0; stepIdx < stream.size(); stepIdx++) {
            int page = stream.get(stepIdx);
            boolean hit = currentFrames.contains(page);

            if (hit) {
                hits++;
                if ("LRU".equalsIgnoreCase(algo)) {
                    recentUsage.remove((Integer) page);
                    recentUsage.add(page);
                }
            } else {
                faults++;
                int emptyIdx = currentFrames.indexOf(null);
                if (emptyIdx != -1) {
                    currentFrames.set(emptyIdx, page);
                    recentUsage.add(page);
                } else {
                    Integer evictPage = null;
                    if ("FIFO".equalsIgnoreCase(algo) || "LRU".equalsIgnoreCase(algo)) {
                        evictPage = recentUsage.remove(0);
                    } else if ("OPTIMAL".equalsIgnoreCase(algo)) {
                        List<Integer> future = stream.subList(stepIdx + 1, stream.size());
                        int maxNextUse = -1;
                        Integer evictCandidate = currentFrames.get(0);
                        for (Integer f : currentFrames) {
                            int nextUse = future.indexOf(f);
                            if (nextUse == -1) {
                                evictCandidate = f;
                                break;
                            } else if (nextUse > maxNextUse) {
                                maxNextUse = nextUse;
                                evictCandidate = f;
                            }
                        }
                        evictPage = evictCandidate;
                        recentUsage.remove(evictPage);
                    }

                    int replaceIdx = currentFrames.indexOf(evictPage);
                    if (replaceIdx != -1) {
                        currentFrames.set(replaceIdx, page);
                    } else {
                        currentFrames.set(0, page);
                    }
                    recentUsage.add(page);
                }
            }

            stepHistory.add(new PageReplacementResponse.StepDetail(
                page, new ArrayList<>(currentFrames), !hit, hit, faults, hits
            ));
        }

        return new PageReplacementResponse(stepHistory);
    }

    // --- 3. CIDR SUBNET COMPUTATION ---
    public SubnetResponse computeSubnet(SubnetRequest request) {
        try {
            String[] parts = request.ipAddress().split("\\.");
            if (parts.length != 4) return new SubnetResponse(false, "", "", "", "", "", 0, 0);

            int p0 = Integer.parseInt(parts[0]);
            int p1 = Integer.parseInt(parts[1]);
            int p2 = Integer.parseInt(parts[2]);
            int p3 = Integer.parseInt(parts[3]);

            if (p0 < 0 || p0 > 255 || p1 < 0 || p1 > 255 || p2 < 0 || p2 > 255 || p3 < 0 || p3 > 255) {
                return new SubnetResponse(false, "", "", "", "", "", 0, 0);
            }

            int cidr = Math.max(0, Math.min(32, request.cidr()));
            long ipNum = ((long) p0 << 24) | (p1 << 16) | (p2 << 8) | p3;
            long maskNum = cidr == 0 ? 0L : (0xFFFFFFFFL << (32 - cidr)) & 0xFFFFFFFFL;
            long netNum = ipNum & maskNum;
            long bcastNum = netNum | (~maskNum & 0xFFFFFFFFL);

            java.util.function.LongFunction<String> numToIp = n ->
                ((n >> 24) & 255) + "." + ((n >> 16) & 255) + "." + ((n >> 8) & 255) + "." + (n & 255);

            long totalHosts = (long) Math.pow(2, 32 - cidr);
            long usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;

            return new SubnetResponse(
                true,
                numToIp.apply(netNum),
                numToIp.apply(bcastNum),
                numToIp.apply(maskNum),
                numToIp.apply(netNum + 1),
                numToIp.apply(bcastNum - 1),
                totalHosts,
                usableHosts
            );
        } catch (Exception e) {
            return new SubnetResponse(false, "", "", "", "", "", 0, 0);
        }
    }

    // --- 4. BANKER'S SAFETY ALGORITHM COMPUTATION ---
    public BankersResponse computeBankersAlgorithm(BankersRequest request) {
        if (request.allocation() == null || request.max() == null || request.available() == null) {
            return new BankersResponse(false, Collections.emptyList(), new int[0]);
        }

        int numProcesses = request.allocation().length;
        int numResources = request.available().length;

        int[] work = Arrays.copyOf(request.available(), numResources);
        boolean[] finish = new boolean[numProcesses];
        List<String> safeSequence = new ArrayList<>();

        int[][] need = new int[numProcesses][numResources];
        for (int i = 0; i < numProcesses; i++) {
            for (int j = 0; j < numResources; j++) {
                need[i][j] = request.max()[i][j] - request.allocation()[i][j];
            }
        }

        int count = 0;
        while (count < numProcesses) {
            boolean found = false;
            for (int i = 0; i < numProcesses; i++) {
                if (!finish[i]) {
                    boolean canExecute = true;
                    for (int j = 0; j < numResources; j++) {
                        if (need[i][j] > work[j]) {
                            canExecute = false;
                            break;
                        }
                    }

                    if (canExecute) {
                        for (int j = 0; j < numResources; j++) {
                            work[j] += request.allocation()[i][j];
                        }
                        safeSequence.add("P" + i);
                        finish[i] = true;
                        found = true;
                        count++;
                    }
                }
            }
            if (!found) break;
        }

        return new BankersResponse(count == numProcesses, safeSequence, work);
    }
}
