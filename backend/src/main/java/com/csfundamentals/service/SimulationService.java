package com.csfundamentals.service;

import com.csfundamentals.model.simulation.*;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class SimulationService {

    static final int MAX_PROCESSES = 100;
    static final int MAX_TIMELINE_UNITS = 10_000;
    static final int MAX_PAGE_REFERENCES = 10_000;
    static final int MAX_FRAMES = 256;
    static final int MAX_BANKER_PROCESSES = 100;
    static final int MAX_BANKER_RESOURCES = 100;

    private static final Set<String> SCHEDULING_ALGORITHMS = Set.of("FCFS", "SJF", "SRTF", "PRIORITY", "RR");
    private static final Set<String> PAGE_ALGORITHMS = Set.of("FIFO", "LRU", "OPTIMAL");

    // --- 1. CPU SCHEDULING COMPUTATION ---
    public SchedulingResponse computeScheduling(SchedulingRequest request) {
        validateSchedulingRequest(request);
        String algo = request.algorithm().trim().toUpperCase(Locale.ROOT);
        int timeQuantum = request.timeQuantum();

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

        if ("FCFS".equals(algo)) {
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
        } else if ("SJF".equals(algo)) {
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
        } else if ("SRTF".equals(algo)) {
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
        } else if ("PRIORITY".equals(algo)) {
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
        } else if ("RR".equals(algo)) {
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
        validatePageReplacementRequest(request);
        int numFrames = request.numFrames();
        String algo = request.algorithm().trim().toUpperCase(Locale.ROOT);
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
        if (request == null || request.ipAddress() == null || request.ipAddress().isBlank()) {
            throw new IllegalArgumentException("ipAddress is required");
        }
        if (request.cidr() < 0 || request.cidr() > 32) {
            throw new IllegalArgumentException("cidr must be between 0 and 32");
        }
        try {
            String[] parts = request.ipAddress().split("\\.");
            if (parts.length != 4) throw new IllegalArgumentException("ipAddress must contain four octets");

            int p0 = Integer.parseInt(parts[0]);
            int p1 = Integer.parseInt(parts[1]);
            int p2 = Integer.parseInt(parts[2]);
            int p3 = Integer.parseInt(parts[3]);

            if (p0 < 0 || p0 > 255 || p1 < 0 || p1 > 255 || p2 < 0 || p2 > 255 || p3 < 0 || p3 > 255) {
                throw new IllegalArgumentException("ipAddress octets must be between 0 and 255");
            }

            int cidr = request.cidr();
            long ipNum = ((long) p0 << 24) | (p1 << 16) | (p2 << 8) | p3;
            long maskNum = cidr == 0 ? 0L : (0xFFFFFFFFL << (32 - cidr)) & 0xFFFFFFFFL;
            long netNum = ipNum & maskNum;
            long bcastNum = netNum | (~maskNum & 0xFFFFFFFFL);

            java.util.function.LongFunction<String> numToIp = n ->
                ((n >> 24) & 255) + "." + ((n >> 16) & 255) + "." + ((n >> 8) & 255) + "." + (n & 255);

            long totalHosts = (long) Math.pow(2, 32 - cidr);
            long usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts;
            long firstHost = cidr >= 31 ? netNum : netNum + 1;
            long lastHost = cidr >= 31 ? bcastNum : bcastNum - 1;

            return new SubnetResponse(
                true,
                numToIp.apply(netNum),
                numToIp.apply(bcastNum),
                numToIp.apply(maskNum),
                numToIp.apply(firstHost),
                numToIp.apply(lastHost),
                totalHosts,
                usableHosts
            );
        } catch (NumberFormatException e) {
            throw new IllegalArgumentException("ipAddress octets must be decimal integers", e);
        }
    }

    // --- 4. BANKER'S SAFETY ALGORITHM COMPUTATION ---
    public BankersResponse computeBankersAlgorithm(BankersRequest request) {
        validateBankersRequest(request);

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

    private void validateSchedulingRequest(SchedulingRequest request) {
        if (request == null || request.processes() == null || request.processes().isEmpty()) {
            throw new IllegalArgumentException("processes must contain at least one process");
        }
        if (request.processes().size() > MAX_PROCESSES) {
            throw new IllegalArgumentException("processes must not exceed " + MAX_PROCESSES);
        }
        if (request.algorithm() == null || !SCHEDULING_ALGORITHMS.contains(request.algorithm().trim().toUpperCase(Locale.ROOT))) {
            throw new IllegalArgumentException("unsupported scheduling algorithm");
        }
        if (request.timeQuantum() <= 0 || request.timeQuantum() > MAX_TIMELINE_UNITS) {
            throw new IllegalArgumentException("timeQuantum must be between 1 and " + MAX_TIMELINE_UNITS);
        }

        Set<String> ids = new HashSet<>();
        long totalBurst = 0;
        int latestArrival = 0;
        for (SchedulingRequest.ProcessInput process : request.processes()) {
            if (process == null) throw new IllegalArgumentException("process entries must not be null");
            if (process.id() == null || process.id().isBlank()) throw new IllegalArgumentException("process id is required");
            if (!ids.add(process.id())) throw new IllegalArgumentException("process ids must be unique");
            if (process.arrivalTime() < 0) throw new IllegalArgumentException("arrivalTime must not be negative");
            if (process.burstTime() <= 0) throw new IllegalArgumentException("burstTime must be positive");
            totalBurst += process.burstTime();
            latestArrival = Math.max(latestArrival, process.arrivalTime());
        }
        if (totalBurst + latestArrival > MAX_TIMELINE_UNITS) {
            throw new IllegalArgumentException("simulation timeline exceeds " + MAX_TIMELINE_UNITS + " units");
        }
    }

    private void validatePageReplacementRequest(PageReplacementRequest request) {
        if (request == null || request.stream() == null || request.stream().isEmpty()) {
            throw new IllegalArgumentException("stream must contain at least one page reference");
        }
        if (request.stream().size() > MAX_PAGE_REFERENCES) {
            throw new IllegalArgumentException("stream must not exceed " + MAX_PAGE_REFERENCES + " entries");
        }
        if (request.stream().stream().anyMatch(Objects::isNull)) {
            throw new IllegalArgumentException("stream entries must not be null");
        }
        if (request.stream().stream().anyMatch(page -> page < 0)) {
            throw new IllegalArgumentException("page references must not be negative");
        }
        if (request.numFrames() <= 0 || request.numFrames() > MAX_FRAMES) {
            throw new IllegalArgumentException("numFrames must be between 1 and " + MAX_FRAMES);
        }
        if (request.algorithm() == null || !PAGE_ALGORITHMS.contains(request.algorithm().trim().toUpperCase(Locale.ROOT))) {
            throw new IllegalArgumentException("unsupported page replacement algorithm");
        }
    }

    private void validateBankersRequest(BankersRequest request) {
        if (request == null || request.allocation() == null || request.max() == null || request.available() == null) {
            throw new IllegalArgumentException("allocation, max, and available are required");
        }
        int processes = request.allocation().length;
        int resources = request.available().length;
        if (processes == 0 || processes > MAX_BANKER_PROCESSES) {
            throw new IllegalArgumentException("allocation must contain between 1 and " + MAX_BANKER_PROCESSES + " processes");
        }
        if (resources == 0 || resources > MAX_BANKER_RESOURCES) {
            throw new IllegalArgumentException("available must contain between 1 and " + MAX_BANKER_RESOURCES + " resources");
        }
        if (request.max().length != processes) {
            throw new IllegalArgumentException("allocation and max must have the same process count");
        }
        for (int i = 0; i < processes; i++) {
            if (request.allocation()[i] == null || request.max()[i] == null
                    || request.allocation()[i].length != resources || request.max()[i].length != resources) {
                throw new IllegalArgumentException("every allocation and max row must match available resource count");
            }
            for (int j = 0; j < resources; j++) {
                int allocation = request.allocation()[i][j];
                int maximum = request.max()[i][j];
                if (allocation < 0 || maximum < 0 || request.available()[j] < 0) {
                    throw new IllegalArgumentException("resource counts must not be negative");
                }
                if (allocation > maximum) {
                    throw new IllegalArgumentException("allocation must not exceed max");
                }
            }
        }
    }
}
