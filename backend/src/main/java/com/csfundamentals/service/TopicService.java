package com.csfundamentals.service;

import com.csfundamentals.model.Topic;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TopicService {

    private final List<Topic> topics = List.of(
        // Operating Systems
        new Topic("process-management", "Process Management", "os", "beginner", "Process states, PCB, threads, context switching", 1, List.of(), List.of("Trace a process from creation to completion")),
        new Topic("memory-management", "Memory Management", "os", "beginner", "Paging, segmentation, virtual memory, page replacement", 2, List.of("process-management"), List.of("Translate a virtual address and explain a page fault")),
        new Topic("cpu-scheduling", "CPU Scheduling", "os", "intermediate", "FCFS, SJF, RR, MLFQ, Linux CFS", 3, List.of("process-management"), List.of("Compare waiting time under different scheduling policies")),
        new Topic("synchronization", "Synchronization", "os", "intermediate", "Semaphores, monitors, RCU, lock-free programming", 4, List.of("process-management"), List.of("Explain and prevent a race between shared-state operations")),
        new Topic("deadlocks", "Deadlocks", "os", "intermediate", "Banker's algorithm, detection, prevention, recovery", 5, List.of("synchronization"), List.of("Identify a dependency cycle and choose a prevention strategy")),
        new Topic("file-systems", "File Systems", "os", "expert", "Inodes, Ext4, Btrfs, ZFS, VFS architecture", 6, List.of("memory-management"), List.of("Trace a file lookup from path to stored blocks")),
        new Topic("io-systems", "I/O Systems", "os", "expert", "DMA, interrupts, epoll, io_uring, kernel bypass", 7, List.of("process-management", "memory-management"), List.of("Compare blocking I/O with event-driven I/O")),
        new Topic("disk-scheduling", "Disk Scheduling Algorithms & File Allocation", "os", "intermediate", "FCFS, SSTF, SCAN, C-SCAN, LOOK, C-LOOK seek algorithms, contiguous vs linked vs indexed file allocation", 8, List.of("file-systems"), List.of("Calculate head movement for a concrete request queue")),

        // Computer Networks
        new Topic("network-fundamentals", "Computer Network Fundamentals, Devices & Topologies", "networking", "beginner", "Network types (LAN/WAN/MAN), devices (router, switch, hub, modem), star/ring/bus/mesh topologies, packet switching vs circuit switching", 1, List.of(), List.of("Explain how devices move a packet across a network")),
        new Topic("physical-layer-media", "Physical Layer: Transmission Media, Modes & Encoding", "networking", "beginner", "Guided (coaxial, twisted pair, fiber) vs unguided (radio, microwave, infrared) media, NRZ/Manchester encoding, multiplexing", 2, List.of("network-fundamentals"), List.of("Relate signal encoding and bandwidth to transmission limits")),
        new Topic("osi-model", "OSI & TCP/IP Reference Models", "networking", "beginner", "7-Layer OSI model vs 4-Layer TCP/IP, PDU headers, encapsulation/decapsulation", 3, List.of("network-fundamentals"), List.of("Follow encapsulation through the network layers")),
        new Topic("data-link-layer", "Data Link Layer, MAC & ARQ Protocols", "networking", "beginner", "Framing, CRC error detection, Stop-and-Wait, Go-Back-N, Selective Repeat ARQ, CSMA/CD", 4, List.of("osi-model"), List.of("Trace frame delivery and recovery after a lost frame")),
        new Topic("ip-subnetting", "IP Addressing, CIDR Subnetting & Protocols", "networking", "intermediate", "IPv4 vs IPv6, CIDR subnet bitmasks, ARP, DHCP DORA, NAT translation", 5, List.of("network-fundamentals"), List.of("Calculate a subnet and explain address translation")),
        new Topic("routing-algorithms", "Routing Algorithms & Link-State vs Distance Vector", "networking", "intermediate", "Distance Vector (Bellman-Ford), Link State (Dijkstra), OSPF, RIP, BGP path vectors", 6, List.of("ip-subnetting"), List.of("Choose a route from a small topology")),
        new Topic("tcp-ip", "TCP vs UDP & Connection Management", "networking", "intermediate", "TCP vs UDP, 3-Way Handshake, 4-Way Teardown, Port multiplexing, Sockets", 7, List.of("osi-model", "ip-subnetting"), List.of("Trace connection setup and compare TCP with UDP")),
        new Topic("tcp-congestion", "TCP Flow & Congestion Control", "networking", "intermediate", "Sliding window, Receiver window (rwnd), Slow Start, Congestion Avoidance, cwnd, Reno/CUBIC", 8, List.of("tcp-ip"), List.of("Explain how a sender changes its sending window")),
        new Topic("transport-layer-protocols", "Transport Protocols: QUIC, SCTP & TCP Segment Internals", "networking", "intermediate", "TCP segment structure (20-byte header fields), UDP datagram format, QUIC 0-RTT, SCTP multi-streaming, port multiplexing", 9, List.of("tcp-ip"), List.of("Compare transport protocols for a concrete application")),
        new Topic("application-layer", "Application Layer: DNS, HTTP/3 & TLS 1.3", "networking", "expert", "DNS recursive lookup hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC), TLS 1.3 1-RTT Handshake", 10, List.of("tcp-ip"), List.of("Trace a browser request through DNS and HTTP")),
        new Topic("network-security", "Network Security, Cryptography & Threat Prevention", "networking", "expert", "Symmetric (AES) vs Asymmetric (RSA), Digital Certificates, Firewalls, SYN Flood, DDoS", 11, List.of("application-layer"), List.of("Explain the purpose of encryption and certificate verification")),
        new Topic("network-performance-qos", "Network QoS, Traffic Shaping & Modern Networking", "networking", "expert", "Token Bucket vs Leaky Bucket traffic shaping, IntServ vs DiffServ QoS, CDN architecture, SDN/NFV, IoT networking, 5G slicing", 12, List.of("tcp-congestion"), List.of("Compare traffic-shaping policies under a burst")),

        // Database Management Systems (13 Comprehensive Topics)
        new Topic("dbms-introduction", "DBMS Introduction & Architecture", "dbms", "beginner", "What is DBMS, types, components, database languages, file system problems", 1, List.of(), List.of("Explain why an application uses a database")),
        new Topic("dbms-architecture", "DBMS Architecture & 3-Schema ANSI-SPARC", "dbms", "beginner", "DBMS vs File Systems, 3-Schema ANSI-SPARC architecture, physical and logical data independence", 2, List.of("dbms-introduction"), List.of("Distinguish logical data design from physical storage")),
        new Topic("er-model", "ER Diagram Modeling & Relational Mapping", "dbms", "beginner", "Entity sets, attributes, cardinalities, weak entities, Generalization, Specialization, ER-to-Table mapping rules", 3, List.of("dbms-introduction"), List.of("Translate an entity relationship into tables")),
        new Topic("relational-algebra-calculus", "Relational Algebra, Tuple Calculus & Joins", "dbms", "intermediate", "Selection (σ), Projection (π), Cartesian Product (×), Joins (Inner, Theta, Outer), Tuple Relational Calculus (TRC)", 5, List.of("sql-querying"), List.of("Trace a query through relational operations")),
        new Topic("functional-dependencies-keys", "Keys, Functional Dependencies & Canonical Cover", "dbms", "intermediate", "Super, Candidate, Primary and Foreign keys, Armstrong's Axioms, Attribute Closure, Minimal Canonical Cover", 6, List.of("er-model"), List.of("Compute an attribute closure and identify candidate keys")),
        new Topic("database-normalization", "Database Normalization (1NF to BCNF) & Decompositions", "dbms", "intermediate", "Insertion/Deletion/Update Anomalies, 1NF, 2NF, 3NF, BCNF, Lossless Join Decomposition, Dependency Preservation", 7, List.of("functional-dependencies-keys"), List.of("Decompose a relation without losing its meaning")),
        new Topic("dbms-indexing", "B/B+ Tree Indexing & Storage Structures", "dbms", "intermediate", "Clustered vs Secondary indexes, Dense vs Sparse, B+ Tree search, dynamic node splits, leaf linked-list range scans", 8, List.of("sql-querying"), List.of("Trace index lookup and a B+ tree split")),
        new Topic("storage-raid-indexing", "File Organization, RAID Storage & Advanced Indexing", "dbms", "intermediate", "Heap vs Sequential vs Hash files, RAID 0/1/5/6/10, Bitmap Indexing, Inverted Indexes for search engines", 9, List.of("dbms-indexing"), List.of("Compare storage and index choices for a workload")),
        new Topic("transactions-acid", "Transactions, ACID States & Crash Recovery", "dbms", "intermediate", "ACID guarantees, Transaction State Machine, Write-Ahead Logging (WAL), Checkpoints, ARIES crash recovery", 10, List.of("sql-querying"), List.of("Explain what survives a failed transaction")),
        new Topic("concurrency-control", "Concurrency Control, 2PL & Timestamp Ordering", "dbms", "expert", "Conflict serializability, Precedence Graphs, Shared/Exclusive locks, Strict 2PL, Thomas Write Rule, Wait-For Deadlock graphs", 11, List.of("transactions-acid"), List.of("Check whether concurrent operations form a valid schedule")),
        new Topic("query-optimization", "Query Processing, Relational Trees & Cost-Based Optimizer", "dbms", "expert", "Relational algebra query trees, Predicate pushdown, Hash Join vs Nested Loop vs Sort-Merge, EXPLAIN ANALYZE", 12, List.of("relational-algebra-calculus", "dbms-indexing"), List.of("Explain why two equivalent queries can have different costs")),
        new Topic("sql-querying", "SQL Querying, Joins & Practical Data Access", "dbms", "intermediate", "SQL filtering, joins, grouping, window functions, transactions, query plans and safe data access", 4, List.of("er-model"), List.of("Write and check a join and an aggregate query")),
        new Topic("distributed-databases-cap", "Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem", "dbms", "expert", "Synchronous vs Asynchronous replication, 2-Phase Commit (2PC), 3PC, CAP Theorem, Paxos/Raft consensus", 13, List.of("transactions-acid"), List.of("Reason about consistency when a network partition occurs")),

        // Java, Advanced Java, Spring Boot, JPA/Hibernate, Spring Batch & Quartz
        new Topic("java-execution-pipeline", "Java Execution Pipeline & JVM Architecture", "java-spring", "beginner", "javac bytecode compilation, ClassLoader Parent Delegation Model, Bytecode Verifier, Interpreter & JIT Compiler", 1, List.of(), List.of("Compile a Java program and trace how it runs")),
        new Topic("java-memory-model", "Java Memory Model: Primitives, References, Stack & Heap", "java-spring", "beginner", "Primitive types vs Reference pointers, Stack frames, Method call stack, Heap object allocation", 2, List.of("java-execution-pipeline"), List.of("Predict how assigning and passing references changes objects")),
        new Topic("java-oop-pillars", "OOP Pillars & Dynamic Method Dispatch (vtable)", "java-spring", "beginner", "Encapsulation, Abstraction, Inheritance, Polymorphism, Method overloading vs overriding, vtable lookup", 3, List.of("java-memory-model"), List.of("Create an object and explain an interface-based call")),
        new Topic("java-static-final-records", "Static, Final, Immutable Classes & Java Records", "java-spring", "intermediate", "Class-level state, final fields/methods, immutable class patterns, and Java Records", 4, List.of("java-oop-pillars"), List.of("Distinguish a final reference from an immutable object")),
        new Topic("jvm-gc", "JVM Memory Architecture, GC & Virtual Threads", "java-spring", "intermediate", "Heap, Young/Old Gen, Metaspace, G1GC vs ZGC, Thread 6-State Lifecycle, Virtual Threads Project Loom", 21, List.of("java-memory-model", "java-multithreading-concurrency"), List.of("Explain reachability and compare thread execution models")),
        new Topic("java-functional-lambdas", "Interfaces, Functional Interfaces & Lambda Expressions", "java-spring", "intermediate", "Default/static methods, @FunctionalInterface, Lambda syntax, Method references, invokedynamic opcode", 8, List.of("java-oop-pillars", "java-generics"), List.of("Replace an interface implementation with a lambda")),
        new Topic("java-generics", "Generics, Wildcards (PECS) & Type Erasure", "java-spring", "intermediate", "Type bounds, Producer Extends Consumer Super (PECS), Bytecode Type Erasure & Bridge methods", 7, List.of("java-collections-framework"), List.of("Explain which values a generic collection accepts")),
        new Topic("java-collections-framework", "Collections Framework: List, Set, Queue & PriorityQueue", "java-spring", "intermediate", "ArrayList dynamic growth (1.5x), LinkedList nodes, HashSet, PriorityQueue Min-Heap sift-up/down", 6, List.of("java-oop-pillars"), List.of("Choose a collection for a concrete access pattern")),
        new Topic("java-hashmap-internals", "HashMap Bucket Internals, Treeification & TreeMap", "java-spring", "intermediate", "Bitwise hash & (n-1), bucket chaining, treeification at 8 nodes to Red-Black Tree, load factor 0.75", 19, List.of("java-generics", "java-collections-framework"), List.of("Trace a key lookup and explain a collision")),
        new Topic("java-streams-optional", "Java Streams API Lazy Pipeline & Optional", "java-spring", "intermediate", "Stream source -> lazy filter/map operations -> terminal collect/reduce flow, Optional safe null checks", 9, List.of("java-functional-lambdas", "java-collections-framework"), List.of("Trace a lazy stream and handle an absent result")),
        new Topic("java-reflection-exceptions", "Reflection API, Annotations & Exception Unwinding", "java-spring", "expert", "Class<?> introspection, setAccessible(true), custom annotations, try-with-resources, stack unwinding", 5, List.of("java-oop-pillars"), List.of("Trace exception handling and safe resource cleanup")),
        new Topic("java-multithreading-concurrency", "Multithreading, Monitors, CAS & ThreadPool Executors", "java-spring", "expert", "Thread 6-State lifecycle, synchronized Object Monitor entry/wait sets, volatile barrier, CAS, ThreadPoolExecutor", 20, List.of("java-memory-model", "synchronization"), List.of("Distinguish atomicity from visibility in concurrent code")),
        new Topic("spring-bean-lifecycle", "Spring IoC Container & Bean Lifecycle", "java-spring", "intermediate", "Bean instantiation, Aware interfaces, @PostConstruct, BeanPostProcessor, @PreDestroy, Auto-Configuration", 11, List.of("design-patterns-solid"), List.of("Compare manual construction with constructor injection")),
        new Topic("spring-mvc-lifecycle", "Spring MVC Request Execution & Security Pipeline", "java-spring", "intermediate", "DispatcherServlet, HandlerMapping, HandlerAdapter, HttpMessageConverter, Security Filter Chain", 13, List.of("spring-boot-internals", "application-layer"), List.of("Trace an HTTP request into a controller and back")),
        new Topic("jpa-hibernate-lifecycle", "JPA / Hibernate Entity Lifecycle & N+1 Solver", "java-spring", "expert", "Entity States (Transient, Managed, Detached, Removed), Dirty checking, N+1 Query Problem, Entity Graphs", 15, List.of("spring-rest-api-design", "sql-querying", "transactions-acid"), List.of("Trace entity changes inside a transaction")),
        new Topic("spring-batch-lifecycle", "Spring Batch Execution Architecture & Chunk Engine", "java-spring", "expert", "JobLauncher, Job, Step, Chunk-oriented ItemReader/Processor/Writer, JobRepository, Skip & Retry", 22, List.of("jpa-hibernate-lifecycle"), List.of("Trace a chunk transaction and a restart after failure")),
        new Topic("quartz-scheduler", "Quartz Scheduler Lifecycle & Clustered JobStoreTX", "java-spring", "expert", "Scheduler, JobDetail, Trigger, @DisallowConcurrentExecution, Misfire Instructions, QRTZ_LOCKS clustering", 23, List.of("spring-bean-lifecycle"), List.of("Explain how a persisted job and trigger cause execution")),
        new Topic("design-patterns-solid", "SOLID Principles & Design Patterns", "java-spring", "intermediate", "SOLID principles, Singleton, Factory, Builder, Observer, Strategy, Adapter, Decorator patterns", 10, List.of("java-oop-pillars"), List.of("Refactor a dependency when a requirement changes")),
        new Topic("spring-boot-internals", "Spring Boot Internals & Production Configuration", "java-spring", "intermediate", "Auto-configuration, externalized configuration, actuator, startup, profiles and production diagnostics", 12, List.of("spring-bean-lifecycle"), List.of("Explain application startup and configuration selection")),
        new Topic("spring-rest-api-design", "Spring REST API Design & Error Handling", "java-spring", "intermediate", "Resource design, validation, pagination, versioning, problem details and API contracts", 14, List.of("spring-mvc-lifecycle"), List.of("Design a validated request and a useful error response")),
        new Topic("spring-security", "Spring Security, Authentication & Authorization", "java-spring", "expert", "Security filter chain, sessions, JWT, OAuth2, method security, CSRF and secure defaults", 16, List.of("spring-rest-api-design"), List.of("Distinguish authentication from permission checks")),
        new Topic("spring-caching-async", "Spring Caching, Async Work & Resilience", "java-spring", "expert", "Cache abstraction, async execution, retries, timeouts, scheduling and resilient service boundaries", 18, List.of("spring-bean-lifecycle"), List.of("Explain stale cache data and asynchronous execution boundaries")),
        new Topic("spring-testing-production", "Spring Testing & Production Readiness", "java-spring", "expert", "Slice tests, integration tests, test containers, observability, deployment checks and incident-safe operations", 17, List.of("spring-rest-api-design"), List.of("Choose a test boundary and explain what it verifies")),

        // AI / ML Systems (7 Comprehensive Topics)
        new Topic("ml-fundamentals", "Machine Learning Fundamentals & Model Evaluation", "aiml", "beginner", "Supervised learning, features, train-validation-test splits, metrics, overfitting and responsible evaluation", 1, List.of(), List.of("Choose an evaluation metric for a learning task")),
        new Topic("embeddings-vector-db", "Vector Embeddings, Similarity Search & Vector DBs", "aiml", "beginner", "Embedding vectors, cosine similarity, HNSW ANN search, pgvector/Qdrant", 2, List.of("ml-fundamentals"), List.of("Compare vectors and explain approximate retrieval")),
        new Topic("rag-architecture", "Retrieval-Augmented Generation (RAG) Architecture", "aiml", "intermediate", "Chunking, retrieval, context assembly, grounded generation pipeline", 3, List.of("embeddings-vector-db"), List.of("Trace a question through retrieval and answer generation")),
        new Topic("model-serving", "LLM Model Serving & Low-Latency Inference", "aiml", "expert", "vLLM PagedAttention, KV cache management, batching, GPU memory allocation", 4, List.of("ml-fundamentals"), List.of("Explain how batching and caching affect inference latency")),
        new Topic("llm-parameters", "LLM Sampling Parameters, Tokenization & ReAct Agents", "aiml", "intermediate", "Temperature, Top-P nucleus sampling, tokenization, ReAct agent loops", 5, List.of("model-serving"), List.of("Explain how sampling changes generated output")),
        new Topic("feature-stores", "Feature Stores, Data Drift & MLOps Architecture", "aiml", "expert", "Online vs offline feature stores, PSI drift detection, retraining pipelines", 6, List.of("ml-fundamentals"), List.of("Distinguish training features from online feature access")),
        new Topic("recommendation-systems", "2-Stage Recommendation Engine Architecture", "aiml", "expert", "Two-Tower candidate retrieval, deep ranking models, pCTR x pCVR scoring", 7, List.of("embeddings-vector-db"), List.of("Trace candidate retrieval and ranking")),

        // DevOps & Infrastructure (5 Topics)
        new Topic("docker-fundamentals", "Docker & Container Fundamentals", "devops", "beginner", "Namespaces, cgroups, image layers, multi-stage builds, networking modes, the containerd/runc runtime stack", 1, List.of(), List.of("Explain how a container runs an application")),
        new Topic("kubernetes-fundamentals", "Kubernetes Core Architecture, Networking & Deployments/Scaling", "devops", "intermediate", "Control plane and node architecture, Pods, Deployments and rolling updates, Services and kube-proxy, HPA", 2, List.of("docker-fundamentals"), List.of("Trace traffic to a deployed application Pod")),
        new Topic("nginx-reverse-proxy", "Nginx as Reverse Proxy & Load Balancer", "devops", "intermediate", "Event-driven worker architecture, load balancing algorithms, TLS termination, caching, rate limiting", 3, List.of("application-layer"), List.of("Explain how a reverse proxy forwards a request")),
        new Topic("cicd-pipelines-deployment-strategies", "CI/CD Pipelines & Deployment Strategies", "devops", "intermediate", "CI vs CD, build-once/promote, rolling/blue-green/canary deploys, feature flags, progressive delivery, GitOps", 4, List.of("docker-fundamentals"), List.of("Compare rollout strategies and a rollback plan")),
        new Topic("cloud-native-operations", "Orchestration Trade-offs, Infrastructure as Code, Observability & Cloud Fundamentals", "devops", "expert", "When to use Kubernetes, Terraform state/plan/apply, the three pillars of observability, IaaS/PaaS/SaaS, shared responsibility", 5, List.of("kubernetes-fundamentals"), List.of("Choose operational tools for a workload"))
    );

    public TopicService() {
        validate(topics);
    }

    static void validate(List<Topic> catalog) {
        var byId = new java.util.HashMap<String, Topic>();
        var positions = new java.util.HashSet<String>();
        for (Topic topic : catalog) {
            if (byId.put(topic.id(), topic) != null || topic.order() < 1
                    || !positions.add(topic.category() + ":" + topic.order())
                    || topic.outcomes().isEmpty()) {
                throw new IllegalArgumentException("Invalid curriculum metadata: " + topic.id());
            }
        }
        var visited = new java.util.HashSet<String>();
        for (Topic topic : catalog) visit(topic.id(), byId, visited, new java.util.HashSet<>());
    }

    private static void visit(String id, java.util.Map<String, Topic> topics,
                              java.util.Set<String> visited, java.util.Set<String> path) {
        if (visited.contains(id)) return;
        Topic topic = topics.get(id);
        if (topic == null) throw new IllegalArgumentException("Unknown prerequisite: " + id);
        if (!path.add(id)) throw new IllegalArgumentException("Prerequisite cycle: " + id);
        for (String prerequisite : topic.prerequisiteIds()) visit(prerequisite, topics, visited, path);
        path.remove(id);
        visited.add(id);
    }

    public List<Topic> getAllTopics() {
        return topics;
    }

    public List<Topic> getTopicsByCategory(String category) {
        return topics.stream()
                .filter(t -> t.category().equals(category))
                .toList();
    }

    public Topic getTopicById(String id) {
        if (id == null) return null;
        return topics.stream()
                .filter(t -> t.id().equals(id))
                .findFirst()
                .orElse(null);
    }
}
