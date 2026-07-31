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
        new Topic("osi-model", "OSI & TCP/IP Reference Models", "networking", "beginner", "7-Layer OSI model vs 4-Layer TCP/IP, PDU headers, encapsulation/decapsulation"),
        new Topic("data-link-layer", "Data Link Layer, MAC & ARQ Protocols", "networking", "beginner", "Framing, CRC error detection, Stop-and-Wait, Go-Back-N, Selective Repeat ARQ, CSMA/CD"),
        new Topic("ip-subnetting", "IP Addressing, CIDR Subnetting & Protocols", "networking", "intermediate", "IPv4 vs IPv6, CIDR subnet bitmasks, ARP, DHCP DORA, NAT translation"),
        new Topic("routing-algorithms", "Routing Algorithms & Link-State vs Distance Vector", "networking", "intermediate", "Distance Vector (Bellman-Ford), Link State (Dijkstra), OSPF, RIP, BGP path vectors"),
        new Topic("tcp-ip", "TCP vs UDP & Connection Management", "networking", "intermediate", "TCP vs UDP, 3-Way Handshake, 4-Way Teardown, Port multiplexing, Sockets"),
        new Topic("tcp-congestion", "TCP Flow & Congestion Control", "networking", "intermediate", "Sliding window, Receiver window (rwnd), Slow Start, Congestion Avoidance, cwnd, Reno/CUBIC"),
        new Topic("application-layer", "Application Layer: DNS, HTTP/3 & TLS 1.3", "networking", "expert", "DNS recursive lookup hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC), TLS 1.3 1-RTT Handshake"),
        new Topic("network-security", "Network Security, Cryptography & Threat Prevention", "networking", "expert", "Symmetric (AES) vs Asymmetric (RSA), Digital Certificates, Firewalls, SYN Flood, DDoS"),

        // Database Management Systems
        new Topic("dbms-architecture", "DBMS Architecture & Data Independence", "dbms", "beginner", "DBMS vs File Systems, 3-Schema ANSI-SPARC architecture, physical/logical data independence"),
        new Topic("er-model", "ER Diagram Modeling & Relational Mapping", "dbms", "beginner", "Entity sets, attributes, cardinalities, weak entities, ER-to-Table mapping rules"),
        new Topic("relational-model", "Relational Model, Keys & Relational Algebra", "dbms", "intermediate", "Relational schema, Candidate/Primary/Foreign keys, Relational Algebra, SQL joins"),
        new Topic("normalization", "Database Normalization & Functional Dependencies", "dbms", "intermediate", "Anomalies, Functional Dependencies, Attribute Closure, 1NF, 2NF, 3NF, BCNF"),
        new Topic("dbms-indexing", "B/B+ Tree Indexing & Storage Structures", "dbms", "intermediate", "Clustered/Secondary indexes, B+ Tree search/insertion split algorithms, range scans"),
        new Topic("transactions-acid", "Transactions, States & ACID Properties", "dbms", "intermediate", "ACID properties, transaction state machine, Write-Ahead Logging (WAL), ARIES recovery"),
        new Topic("concurrency-control", "Concurrency Control, 2PL & Serializability", "dbms", "expert", "Precedence graphs, Conflict serializability, Strict 2PL, MVCC, Deadlocks & Wait-For graphs"),
        new Topic("query-optimization", "Query Processing & Cost-Based Optimizer", "dbms", "expert", "Query trees, predicate pushdown, Hash Join vs Nested Loop vs Sort-Merge, EXPLAIN ANALYZE"),

        // AI & Machine Learning Systems for SDE-2
        new Topic("embeddings-vector-db", "Vector Embeddings, Similarity Search & Vector DBs", "aiml", "intermediate", "Embeddings, Cosine Similarity, HNSW, IVF-PQ, Pinecone, Qdrant, pgvector"),
        new Topic("rag-architecture", "Retrieval-Augmented Generation (RAG) Architecture", "aiml", "intermediate", "Document Chunking, Vector Retrieval, Context Injection, Ragas evaluation, Hybrid Search"),
        new Topic("model-serving", "LLM Model Serving & Low-Latency Inference", "aiml", "expert", "vLLM PagedAttention, KV Caching, Dynamic Batching, Quantization (INT8/INT4), Triton Engine"),
        new Topic("llm-parameters", "LLM Sampling Parameters, Tokenization & ReAct Agents", "aiml", "intermediate", "BPE Tokenization, Temperature, Top-P Nucleus, ReAct Agent Loops, Function Calling"),
        new Topic("feature-stores", "Feature Stores, Data Drift & MLOps Architecture", "aiml", "expert", "Online (Redis) vs Offline (S3) Feature Stores, Time-travel joins, PSI Data Drift, Canary Deployments"),
        new Topic("recommendation-systems", "2-Stage Recommendation Engine Architecture", "aiml", "expert", "Candidate Generation (Retrieval 1M -> 500 via Two-Tower Nets) -> Deep Ranking & Scoring"),

        // Java, Advanced Java, Spring Boot, JPA/Hibernate, Spring Batch & Quartz
        new Topic("jvm-gc", "JVM Memory Architecture, GC & Virtual Threads", "java-spring", "intermediate", "Heap, Young/Old Gen, Metaspace, G1GC vs ZGC, Thread 6-State Lifecycle, Virtual Threads Project Loom"),
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
