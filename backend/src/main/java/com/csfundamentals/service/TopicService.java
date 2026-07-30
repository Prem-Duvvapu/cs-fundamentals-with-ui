package com.csfundamentals.service;

import com.csfundamentals.model.Topic;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TopicService {

    private final List<Topic> topics = List.of(
        new Topic("process-management", "Process Management", "os", "beginner", "Process states, PCB, threads, context switching"),
        new Topic("memory-management", "Memory Management", "os", "beginner", "Paging, segmentation, virtual memory, page replacement"),
        new Topic("cpu-scheduling", "CPU Scheduling", "os", "intermediate", "FCFS, SJF, RR, MLFQ, Linux CFS"),
        new Topic("synchronization", "Synchronization", "os", "intermediate", "Semaphores, monitors, RCU, lock-free programming"),
        new Topic("deadlocks", "Deadlocks", "os", "intermediate", "Banker's algorithm, detection, prevention, recovery"),
        new Topic("file-systems", "File Systems", "os", "expert", "Inodes, Ext4, Btrfs, ZFS, VFS architecture"),
        new Topic("io-systems", "I/O Systems", "os", "expert", "DMA, interrupts, epoll, io_uring, kernel bypass")
    );

    public List<Topic> getAllTopics() {
        return topics;
    }

    public List<Topic> getTopicsByCategory(String category) {
        return topics.stream()
                .filter(t -> t.category().equals(category))
                .toList();
    }
}
