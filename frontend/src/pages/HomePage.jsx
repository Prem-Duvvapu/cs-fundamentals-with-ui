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

          // DBMS & SQL
          { id: 'dbms-architecture', category: 'dbms', title: 'DBMS Architecture & 3-Schema', level: 'beginner', summary: 'ANSI-SPARC 3-schema architecture, Physical vs Logical data independence' },
          { id: 'er-model', category: 'dbms', title: 'ER Model & Functional Closures', level: 'beginner', summary: 'ER modeling, attribute closure solver, candidate key detection' },
          { id: 'normalization', category: 'dbms', title: 'Database Normalization', level: 'intermediate', summary: '1NF, 2NF, 3NF, BCNF lossy vs lossless decomposition' },
          { id: 'dbms-indexing', category: 'dbms', title: 'B+ Tree Indexing & Storage Structures', level: 'intermediate', summary: 'Animated B+ tree node splits, O(log N) point lookups, doubly-linked leaf range scans' },
          { id: 'transactions-acid', category: 'dbms', title: 'Transactions & ACID Properties', level: 'intermediate', summary: 'ACID guarantees, WAL logging, crash recovery' },
          { id: 'concurrency-control', category: 'dbms', title: 'Concurrency & 2-Phase Locking (2PL)', level: 'expert', summary: 'Shared vs Exclusive locks, 2PL, deadlock wait-for graphs' },
          { id: 'query-optimization', category: 'dbms', title: 'Query Optimizer (CBO)', level: 'expert', summary: 'Cost-based optimizer, Join algorithms (Nested Loop, Hash, Sort-Merge)' }
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
          Master Operating Systems, Computer Networks, Database Management Systems, and Java/Spring Ecosystem —
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
