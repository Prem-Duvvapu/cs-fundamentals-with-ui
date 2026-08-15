package com.csfundamentals.service;

import com.csfundamentals.model.Topic;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TopicService {

    private final List<Topic> topics = List.of(
        // Operating Systems
        new Topic("process-management", "Process Management", "os", "beginner", "Process states, PCB, threads, context switching"),
        new Topic("memory-management", "Memory Management", "os", "beginner", "Paging, segmentation, virtual memory, page replacement"),
        new Topic("cpu-scheduling", "CPU Scheduling", "os", "intermediate", "FCFS, SJF, RR, MLFQ, Linux CFS"),
        new Topic("synchronization", "Synchronization", "os", "intermediate", "Semaphores, monitors, RCU, lock-free programming"),
        new Topic("deadlocks", "Deadlocks", "os", "intermediate", "Banker's algorithm, detection, prevention, recovery"),
        new Topic("file-systems", "File Systems", "os", "expert", "Inodes, Ext4, Btrfs, ZFS, VFS architecture"),
        new Topic("io-systems", "I/O Systems", "os", "expert", "DMA, interrupts, epoll, io_uring, kernel bypass"),

        // Computer Networks
        new Topic("network-fundamentals", "Computer Network Fundamentals, Devices & Topologies", "networking", "beginner", "Network types (LAN/WAN/MAN), devices (router, switch, hub, modem), star/ring/bus/mesh topologies, packet switching vs circuit switching"),
        new Topic("physical-layer-media", "Physical Layer: Transmission Media, Modes & Encoding", "networking", "beginner", "Guided (coaxial, twisted pair, fiber) vs unguided (radio, microwave, infrared) media, NRZ/Manchester encoding, multiplexing"),
        new Topic("osi-model", "OSI & TCP/IP Reference Models", "networking", "beginner", "7-Layer OSI model vs 4-Layer TCP/IP, PDU headers, encapsulation/decapsulation"),
        new Topic("data-link-layer", "Data Link Layer, MAC & ARQ Protocols", "networking", "beginner", "Framing, CRC error detection, Stop-and-Wait, Go-Back-N, Selective Repeat ARQ, CSMA/CD"),
        new Topic("ip-subnetting", "IP Addressing, CIDR Subnetting & Protocols", "networking", "intermediate", "IPv4 vs IPv6, CIDR subnet bitmasks, ARP, DHCP DORA, NAT translation"),
        new Topic("routing-algorithms", "Routing Algorithms & Link-State vs Distance Vector", "networking", "intermediate", "Distance Vector (Bellman-Ford), Link State (Dijkstra), OSPF, RIP, BGP path vectors"),
        new Topic("tcp-ip", "TCP vs UDP & Connection Management", "networking", "intermediate", "TCP vs UDP, 3-Way Handshake, 4-Way Teardown, Port multiplexing, Sockets"),
        new Topic("tcp-congestion", "TCP Flow & Congestion Control", "networking", "intermediate", "Sliding window, Receiver window (rwnd), Slow Start, Congestion Avoidance, cwnd, Reno/CUBIC"),
        new Topic("transport-layer-protocols", "Transport Protocols: QUIC, SCTP & TCP Segment Internals", "networking", "intermediate", "TCP segment structure (20-byte header fields), UDP datagram format, QUIC 0-RTT, SCTP multi-streaming, port multiplexing"),
        new Topic("application-layer", "Application Layer: DNS, HTTP/3 & TLS 1.3", "networking", "expert", "DNS recursive lookup hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC), TLS 1.3 1-RTT Handshake"),
        new Topic("network-security", "Network Security, Cryptography & Threat Prevention", "networking", "expert", "Symmetric (AES) vs Asymmetric (RSA), Digital Certificates, Firewalls, SYN Flood, DDoS"),
        new Topic("network-performance-qos", "Network QoS, Traffic Shaping & Modern Networking", "networking", "expert", "Token Bucket vs Leaky Bucket traffic shaping, IntServ vs DiffServ QoS, CDN architecture, SDN/NFV, IoT networking, 5G slicing"),

        // Database Management Systems
        new Topic("dbms-architecture", "DBMS Architecture & Data Independence", "dbms", "beginner", "DBMS vs File Systems, 3-Schema ANSI-SPARC architecture, physical/logical data independence"),
        new Topic("er-model", "ER Diagram Modeling & Relational Mapping", "dbms", "beginner", "Entity sets, attributes, cardinalities, weak entities, ER-to-Table mapping rules"),
        new Topic("relational-model", "Relational Model, Keys & Relational Algebra", "dbms", "intermediate", "Relational schema, Candidate/Primary/Foreign keys, Relational Algebra, SQL joins"),
        new Topic("normalization", "Database Normalization & Functional Dependencies", "dbms", "intermediate", "Anomalies, Functional Dependencies, Attribute Closure, 1NF, 2NF, 3NF, BCNF"),
        new Topic("dbms-indexing", "B/B+ Tree Indexing & Storage Structures", "dbms", "intermediate", "Clustered/Secondary indexes, B+ Tree search/insertion split algorithms, range scans"),
        new Topic("transactions-acid", "Transactions, States & ACID Properties", "dbms", "intermediate", "ACID properties, transaction state machine, Write-Ahead Logging (WAL), ARIES recovery"),
        new Topic("concurrency-control", "Concurrency Control, 2PL & Serializability", "dbms", "expert", "Precedence graphs, Conflict serializability, Strict 2PL, MVCC, Deadlocks & Wait-For graphs"),
        new Topic("query-optimization", "Query Processing & Cost-Based Optimizer", "dbms", "expert", "Query trees, predicate pushdown, Hash Join vs Nested Loop vs Sort-Merge, EXPLAIN ANALYZE"),

        // Java, Advanced Java, Spring Boot, JPA/Hibernate, Spring Batch & Quartz
        new Topic("java-execution-pipeline", "Java Execution Pipeline & JVM Architecture", "java-spring", "beginner", "javac bytecode compilation, ClassLoader Parent Delegation Model, Bytecode Verifier, Interpreter & JIT Compiler"),
        new Topic("java-memory-model", "Java Memory Model: Primitives, References, Stack & Heap", "java-spring", "beginner", "Primitive types vs Reference pointers, Stack frames, Method call stack, Heap object allocation"),
        new Topic("java-oop-pillars", "OOP Pillars & Dynamic Method Dispatch (vtable)", "java-spring", "beginner", "Encapsulation, Abstraction, Inheritance, Polymorphism, Method overloading vs overriding, vtable lookup"),
        new Topic("java-static-final-records", "Static, Final, Immutable Classes & Java Records", "java-spring", "intermediate", "Metaspace static allocation, final fields/methods, Immutable class pattern, Java 14+ Records"),
        new Topic("jvm-gc", "JVM Memory Architecture, GC & Virtual Threads", "java-spring", "intermediate", "Heap, Young/Old Gen, Metaspace, G1GC vs ZGC, Thread 6-State Lifecycle, Virtual Threads Project Loom"),
        new Topic("java-functional-lambdas", "Interfaces, Functional Interfaces & Lambda Expressions", "java-spring", "intermediate", "Default/static methods, @FunctionalInterface, Lambda syntax, Method references, invokedynamic opcode"),
        new Topic("java-generics", "Generics, Wildcards (PECS) & Type Erasure", "java-spring", "intermediate", "Type bounds, Producer Extends Consumer Super (PECS), Bytecode Type Erasure & Bridge methods"),
        new Topic("java-collections-framework", "Collections Framework: List, Set, Queue & PriorityQueue", "java-spring", "intermediate", "ArrayList dynamic growth (1.5x), LinkedList nodes, HashSet, PriorityQueue Min-Heap sift-up/down"),
        new Topic("java-hashmap-internals", "HashMap Bucket Internals, Treeification & TreeMap", "java-spring", "intermediate", "Bitwise hash & (n-1), bucket chaining, treeification at 8 nodes to Red-Black Tree, load factor 0.75"),
        new Topic("java-streams-optional", "Java Streams API Lazy Pipeline & Optional", "java-spring", "intermediate", "Stream source -> lazy filter/map operations -> terminal collect/reduce flow, Optional safe null checks"),
        new Topic("java-reflection-exceptions", "Reflection API, Annotations & Exception Unwinding", "java-spring", "expert", "Class<?> introspection, setAccessible(true), custom annotations, try-with-resources, stack unwinding"),
        new Topic("java-multithreading-concurrency", "Multithreading, Monitors, CAS & ThreadPool Executors", "java-spring", "expert", "Thread 6-State lifecycle, synchronized Object Monitor entry/wait sets, volatile barrier, CAS, ThreadPoolExecutor"),
        new Topic("spring-bean-lifecycle", "Spring IoC Container & Bean Lifecycle", "java-spring", "intermediate", "Bean instantiation, Aware interfaces, @PostConstruct, BeanPostProcessor, @PreDestroy, Auto-Configuration"),
        new Topic("spring-mvc-lifecycle", "Spring MVC Request Execution & Security Pipeline", "java-spring", "intermediate", "DispatcherServlet, HandlerMapping, HandlerAdapter, HttpMessageConverter, Security Filter Chain"),
        new Topic("jpa-hibernate-lifecycle", "JPA / Hibernate Entity Lifecycle & N+1 Solver", "java-spring", "expert", "Entity States (Transient, Managed, Detached, Removed), Dirty checking, N+1 Query Problem, Entity Graphs"),
        new Topic("spring-batch-lifecycle", "Spring Batch Execution Architecture & Chunk Engine", "java-spring", "expert", "JobLauncher, Job, Step, Chunk-oriented ItemReader/Processor/Writer, JobRepository, Skip & Retry"),
        new Topic("quartz-scheduler", "Quartz Scheduler Lifecycle & Clustered JobStoreTX", "java-spring", "expert", "Scheduler, JobDetail, Trigger, @DisallowConcurrentExecution, Misfire Instructions, QRTZ_LOCKS clustering")
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
