import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'

const LEVEL_ORDER = { beginner: 0, intermediate: 1, expert: 2 }
const LEVEL_LABELS = { beginner: '🟢 Beginner Level', intermediate: '🟡 Intermediate Level', expert: '🔴 Expert Level' }

export default function HomePage() {
  const [topics, setTopics] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')

  useEffect(() => {
    fetchTopics()
      .then(setTopics)
      .catch(() => {
        setTopics([
          // Operating Systems
          { id: 'process-management', category: 'os', title: 'Process Management', level: 'beginner', summary: 'Process states, PCB, threads, context switching' },
          { id: 'memory-management', category: 'os', title: 'Memory Management', level: 'beginner', summary: 'Paging, segmentation, virtual memory, page replacement' },
          { id: 'cpu-scheduling', category: 'os', title: 'CPU Scheduling', level: 'intermediate', summary: 'FCFS, SJF, RR, MLFQ, Linux CFS' },
          { id: 'synchronization', category: 'os', title: 'Synchronization', level: 'intermediate', summary: 'Semaphores, monitors, RCU, lock-free programming' },
          { id: 'deadlocks', category: 'os', title: 'Deadlocks', level: 'intermediate', summary: 'Banker\'s algorithm, detection, prevention, recovery' },
          { id: 'file-systems', category: 'os', title: 'File Systems', level: 'expert', summary: 'Inodes, Ext4, Btrfs, ZFS, VFS architecture' },
          { id: 'io-systems', category: 'os', title: 'I/O Systems', level: 'expert', summary: 'DMA, interrupts, epoll, io_uring, kernel bypass' },
          { id: 'disk-scheduling', category: 'os', title: 'Disk Scheduling Algorithms & File Allocation', level: 'intermediate', summary: 'FCFS, SSTF, SCAN, C-SCAN seek algorithms, contiguous vs linked vs indexed file allocation' },
          
          // Computer Networks
          { id: 'network-fundamentals', category: 'networking', title: 'Computer Network Fundamentals, Devices & Topologies', level: 'beginner', summary: 'Network types (LAN/WAN/MAN), devices (router, switch, hub, modem), star/ring/bus/mesh topologies, packet switching vs circuit switching' },
          { id: 'physical-layer-media', category: 'networking', title: 'Physical Layer: Transmission Media, Modes & Encoding', level: 'beginner', summary: 'Guided (coaxial, twisted pair, fiber) vs unguided (radio, microwave, infrared) media, NRZ/Manchester encoding, multiplexing' },
          { id: 'osi-model', category: 'networking', title: 'OSI & TCP/IP Reference Models', level: 'beginner', summary: '7-Layer OSI model vs 4-Layer TCP/IP, PDU headers, encapsulation/decapsulation' },
          { id: 'data-link-layer', category: 'networking', title: 'Data Link Layer, MAC & ARQ Protocols', level: 'beginner', summary: 'Framing, CRC error detection, Stop-and-Wait, Go-Back-N, Selective Repeat ARQ, CSMA/CD' },
          { id: 'ip-subnetting', category: 'networking', title: 'IP Addressing, CIDR Subnetting & Protocols', level: 'intermediate', summary: 'IPv4 vs IPv6, CIDR subnet bitmasks, ARP, DHCP DORA, NAT translation' },
          { id: 'routing-algorithms', category: 'networking', title: 'Routing Algorithms & Link-State vs Distance Vector', level: 'intermediate', summary: 'Distance Vector (Bellman-Ford), Link State (Dijkstra), OSPF, RIP, BGP path vectors' },
          { id: 'tcp-ip', category: 'networking', title: 'TCP vs UDP & Connection Management', level: 'intermediate', summary: 'TCP vs UDP, 3-Way Handshake, 4-Way Teardown, Port multiplexing, Sockets' },
          { id: 'tcp-congestion', category: 'networking', title: 'TCP Flow & Congestion Control', level: 'intermediate', summary: 'Sliding window, Receiver window (rwnd), Slow Start, Congestion Avoidance, cwnd, Reno/CUBIC' },
          { id: 'transport-layer-protocols', category: 'networking', title: 'Transport Protocols: QUIC, SCTP & TCP Segment Internals', level: 'intermediate', summary: 'TCP segment structure (20-byte header fields), UDP datagram format, QUIC 0-RTT, SCTP multi-streaming, port multiplexing' },
          { id: 'application-layer', category: 'networking', title: 'Application Layer: DNS, HTTP/3 & TLS 1.3', level: 'expert', summary: 'DNS recursive lookup hierarchy, HTTP/1.1 vs HTTP/2 vs HTTP/3 (QUIC), TLS 1.3 1-RTT Handshake' },
          { id: 'network-security', category: 'networking', title: 'Network Security, Cryptography & Threat Prevention', level: 'expert', summary: 'Symmetric (AES) vs Asymmetric (RSA), Digital Certificates, Firewalls, SYN Flood, DDoS' },
          { id: 'network-performance-qos', category: 'networking', title: 'Network QoS, Traffic Shaping & Modern Networking', level: 'expert', summary: 'Token Bucket vs Leaky Bucket traffic shaping, IntServ vs DiffServ QoS, CDN architecture, SDN/NFV, IoT networking, 5G slicing' },
          
          // Java & Spring Ecosystem
          { id: 'java-execution-pipeline', category: 'java-spring', title: 'Java Execution Pipeline & JVM Architecture', level: 'beginner', summary: 'javac bytecode compilation, ClassLoader Parent Delegation Model, Bytecode Verifier, Interpreter & JIT Compiler' },
          { id: 'java-memory-model', category: 'java-spring', title: 'Java Memory Model: Primitives, References, Stack & Heap', level: 'beginner', summary: 'Primitive types vs Reference pointers, Stack frames, Method call stack, Heap object allocation' },
          { id: 'java-oop-pillars', category: 'java-spring', title: 'OOP Pillars & Dynamic Method Dispatch (vtable)', level: 'beginner', summary: 'Encapsulation, Abstraction, Inheritance, Polymorphism, Method overloading vs overriding, vtable lookup' },
          { id: 'java-static-final-records', category: 'java-spring', title: 'Static, Final, Immutable Classes & Java Records', level: 'intermediate', summary: 'Metaspace static allocation, final fields/methods, Immutable class pattern, Java 14+ Records' },
          { id: 'jvm-gc', category: 'java-spring', title: 'JVM Memory Architecture, GC & Virtual Threads', level: 'intermediate', summary: 'Heap, Young/Old Gen, Metaspace, G1GC vs ZGC, Thread 6-State Lifecycle, Virtual Threads Project Loom' },
          { id: 'java-functional-lambdas', category: 'java-spring', title: 'Interfaces, Functional Interfaces & Lambda Expressions', level: 'intermediate', summary: 'Default/static methods, @FunctionalInterface, Lambda syntax, Method references, invokedynamic opcode' },
          { id: 'java-generics', category: 'java-spring', title: 'Generics, Wildcards (PECS) & Type Erasure', level: 'intermediate', summary: 'Type bounds, Producer Extends Consumer Super (PECS), Bytecode Type Erasure & Bridge methods' },
          { id: 'java-collections-framework', category: 'java-spring', title: 'Collections Framework: List, Set, Queue & PriorityQueue', level: 'intermediate', summary: 'ArrayList dynamic growth (1.5x), LinkedList nodes, HashSet, PriorityQueue Min-Heap sift-up/down' },
          { id: 'java-hashmap-internals', category: 'java-spring', title: 'HashMap Bucket Internals, Treeification & TreeMap', level: 'intermediate', summary: 'Bitwise hash & (n-1), bucket chaining, treeification at 8 nodes to Red-Black Tree, load factor 0.75' },
          { id: 'java-streams-optional', category: 'java-spring', title: 'Java Streams API Lazy Pipeline & Optional', level: 'intermediate', summary: 'Stream source -> lazy filter/map operations -> terminal collect/reduce flow, Optional safe null checks' },
          { id: 'java-reflection-exceptions', category: 'java-spring', title: 'Reflection API, Annotations & Exception Unwinding', level: 'expert', summary: 'Class<?> introspection, setAccessible(true), custom annotations, try-with-resources, stack unwinding' },
          { id: 'java-multithreading-concurrency', category: 'java-spring', title: 'Multithreading, Monitors, CAS & ThreadPool Executors', level: 'expert', summary: 'Thread 6-State lifecycle, synchronized Object Monitor entry/wait sets, volatile barrier, CAS, ThreadPoolExecutor' },
          { id: 'spring-bean-lifecycle', category: 'java-spring', title: 'Spring IoC Container & Bean Lifecycle', level: 'intermediate', summary: 'Bean instantiation, Aware interfaces, @PostConstruct, BeanPostProcessor, @PreDestroy, Auto-Configuration' },
          { id: 'spring-mvc-lifecycle', category: 'java-spring', title: 'Spring MVC Request Execution & Security Pipeline', level: 'intermediate', summary: 'DispatcherServlet, HandlerMapping, HandlerAdapter, HttpMessageConverter, Security Filter Chain' },
          { id: 'jpa-hibernate-lifecycle', category: 'java-spring', title: 'JPA / Hibernate Entity Lifecycle & N+1 Solver', level: 'expert', summary: 'Entity States (Transient, Managed, Detached, Removed), Dirty checking, N+1 Query Problem, Entity Graphs' },
          { id: 'spring-batch-lifecycle', category: 'java-spring', title: 'Spring Batch Execution Architecture & Chunk Engine', level: 'expert', summary: 'JobLauncher, Job, Step, Chunk-oriented ItemReader/Processor/Writer, JobRepository, Skip & Retry' },
          { id: 'quartz-scheduler', category: 'java-spring', title: 'Quartz Scheduler Lifecycle & Clustered JobStoreTX', level: 'expert', summary: 'Scheduler, JobDetail, Trigger, @DisallowConcurrentExecution, Misfire Instructions, QRTZ_LOCKS clustering' },
          { id: 'design-patterns-solid', category: 'java-spring', title: 'SOLID Principles & Design Patterns', level: 'intermediate', summary: 'SOLID principles, Singleton, Factory, Builder, Observer, Strategy, Adapter, Decorator patterns' },

          // DBMS & SQL (12 Comprehensive Topics)
          { id: 'dbms-introduction', category: 'dbms', title: 'DBMS Introduction & Architecture', level: 'beginner', summary: 'What is DBMS, types, components, database languages, file system problems' },
          { id: 'dbms-architecture', category: 'dbms', title: 'DBMS Architecture & 3-Schema ANSI-SPARC', level: 'beginner', summary: 'ANSI-SPARC 3-schema architecture, Physical vs Logical data independence' },
          { id: 'er-model', category: 'dbms', title: 'ER Diagram Modeling & Relational Mapping', level: 'beginner', summary: 'Entity sets, attributes, cardinalities, weak entities, Generalization, Specialization, ER-to-Table mapping rules' },
          { id: 'relational-algebra-calculus', category: 'dbms', title: 'Relational Algebra, Tuple Calculus & Joins', level: 'intermediate', summary: 'Selection (σ), Projection (π), Cartesian Product (×), Joins (Inner, Theta, Outer), Tuple Relational Calculus (TRC)' },
          { id: 'functional-dependencies-keys', category: 'dbms', title: 'Keys, Functional Dependencies & Canonical Cover', level: 'intermediate', summary: 'Super, Candidate, Primary and Foreign keys, Armstrong\'s Axioms, Attribute Closure, Minimal Canonical Cover' },
          { id: 'database-normalization', category: 'dbms', title: 'Database Normalization (1NF to BCNF) & Decompositions', level: 'intermediate', summary: 'Insertion/Deletion/Update Anomalies, 1NF, 2NF, 3NF, BCNF, Lossless Join Decomposition, Dependency Preservation' },
          { id: 'dbms-indexing', category: 'dbms', title: 'B/B+ Tree Indexing & Storage Structures', level: 'intermediate', summary: 'Clustered vs Secondary indexes, Dense vs Sparse, B+ Tree search, dynamic node splits, leaf linked-list range scans' },
          { id: 'storage-raid-indexing', category: 'dbms', title: 'File Organization, RAID Storage & Advanced Indexing', level: 'intermediate', summary: 'Heap vs Sequential vs Hash files, RAID 0/1/5/6/10, Bitmap Indexing, Inverted Indexes for search engines' },
          { id: 'transactions-acid', category: 'dbms', title: 'Transactions, ACID States & Crash Recovery', level: 'intermediate', summary: 'ACID guarantees, Transaction State Machine, Write-Ahead Logging (WAL), Checkpoints, ARIES crash recovery' },
          { id: 'concurrency-control', category: 'dbms', title: 'Concurrency Control, 2PL & Timestamp Ordering', level: 'expert', summary: 'Conflict serializability, Precedence Graphs, Shared/Exclusive locks, Strict 2PL, Thomas Write Rule, Wait-For Deadlock graphs' },
          { id: 'query-optimization', category: 'dbms', title: 'Query Processing, Relational Trees & Cost-Based Optimizer', level: 'expert', summary: 'Relational algebra query trees, Predicate pushdown, Hash Join vs Nested Loop vs Sort-Merge, EXPLAIN ANALYZE' },
          { id: 'distributed-databases-cap', category: 'dbms', title: 'Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem', level: 'expert', summary: 'Synchronous vs Asynchronous replication, 2-Phase Commit (2PC), 3PC, CAP Theorem, Paxos/Raft consensus' },

          // AI / ML Systems
          { id: 'embeddings-vector-db', category: 'aiml', title: 'Vector Embeddings, Similarity Search & Vector DBs', level: 'beginner', summary: 'Embedding vectors, cosine similarity, HNSW ANN search, pgvector/Qdrant' },
          { id: 'rag-architecture', category: 'aiml', title: 'Retrieval-Augmented Generation (RAG) Architecture', level: 'intermediate', summary: 'Chunking, retrieval, context assembly, grounded generation pipeline' },
          { id: 'model-serving', category: 'aiml', title: 'LLM Model Serving & Low-Latency Inference', level: 'expert', summary: 'vLLM PagedAttention, KV cache management, batching, GPU memory allocation' },
          { id: 'llm-parameters', category: 'aiml', title: 'LLM Sampling Parameters, Tokenization & ReAct Agents', level: 'intermediate', summary: 'Temperature, Top-P nucleus sampling, tokenization, ReAct agent loops' },
          { id: 'feature-stores', category: 'aiml', title: 'Feature Stores, Data Drift & MLOps Architecture', level: 'expert', summary: 'Online vs offline feature stores, PSI drift detection, retraining pipelines' },
          { id: 'recommendation-systems', category: 'aiml', title: '2-Stage Recommendation Engine Architecture', level: 'expert', summary: 'Two-Tower candidate retrieval, deep ranking models, pCTR x pCVR scoring' }
        ])
      })
  }, [])

  const filteredTopics = selectedCategory === 'all' 
    ? topics 
    : topics.filter(t => t.category === selectedCategory || (selectedCategory === 'os' && !t.category))

  const grouped = filteredTopics.reduce((acc, t) => {
    const level = t.level || 'beginner'
    if (!acc[level]) acc[level] = []
    acc[level].push(t)
    return acc
  }, {})

  const sortedLevels = Object.keys(grouped).sort((a, b) => LEVEL_ORDER[a] - LEVEL_ORDER[b])

  return (
    <div>
      <div className="home-header">
        <h1>CS Fundamentals & Visualizations</h1>
        <p>
          Master Operating Systems, Computer Networks, Database Management Systems, Java/Spring Ecosystem, and AI/ML Systems —
          interactive animations and comprehensive software engineering fundamentals.
        </p>

        <div className="main-tab-switcher" style={{ margin: '1.5rem auto 0 auto' }}>
          <button
            onClick={() => setSelectedCategory('all')}
            className={`main-tab-btn ${selectedCategory === 'all' ? 'active-tab' : ''}`}
          >
            🌟 All Topics
          </button>
          <button
            onClick={() => setSelectedCategory('os')}
            className={`main-tab-btn ${selectedCategory === 'os' ? 'active-tab' : ''}`}
          >
            💻 Operating Systems
          </button>
          <button
            onClick={() => setSelectedCategory('networking')}
            className={`main-tab-btn ${selectedCategory === 'networking' ? 'active-tab' : ''}`}
          >
            🌐 Computer Networks
          </button>
          <button
            onClick={() => setSelectedCategory('dbms')}
            className={`main-tab-btn ${selectedCategory === 'dbms' ? 'active-tab' : ''}`}
          >
            🗄 DBMS & SQL
          </button>
          <button
            onClick={() => setSelectedCategory('java-spring')}
            className={`main-tab-btn ${selectedCategory === 'java-spring' ? 'active-tab' : ''}`}
          >
            ☕ Java & Spring Ecosystem
          </button>
          <button
            onClick={() => setSelectedCategory('aiml')}
            className={`main-tab-btn ${selectedCategory === 'aiml' ? 'active-tab' : ''}`}
          >
            🤖 AI/ML Systems
          </button>
        </div>
      </div>

      {sortedLevels.map(level => (
        <div key={level} className="level-section">
          <h2>{LEVEL_LABELS[level] || level}</h2>
          <div className="card-grid">
            {grouped[level].map(topic => (
              <Link key={topic.id} to={`/topic/${topic.id}`} className="card">
                <span className={`badge ${topic.level || 'beginner'}`}>
                  {LEVEL_LABELS[topic.level] || topic.level}
                </span>
                <h3>{topic.title}</h3>
                <p>{topic.summary}</p>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
