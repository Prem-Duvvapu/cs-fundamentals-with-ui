import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'

const LEVEL_ORDER = { beginner: 0, intermediate: 1, expert: 2 }
const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', expert: 'Expert' }
const LEVEL_GLYPHS = { beginner: '●', intermediate: '◐', expert: '◆' }
const LEVEL_FILTERS = ['all', 'beginner', 'intermediate', 'expert']

const CATEGORY_ORDER = ['java-spring', 'os', 'networking', 'dbms', 'aiml']

const CATEGORY_DETAILS = {
  'java-spring': {
    label: 'Java & Spring',
    shortLabel: 'JAVA',
    glyph: '◐',
    summary: 'Start with Java foundations, then build toward concurrency and Spring application architecture.'
  },
  os: {
    label: 'Operating Systems',
    shortLabel: 'OS',
    glyph: '◆',
    summary: 'Understand processes, memory, scheduling, synchronization, and the kernel services beneath applications.'
  },
  networking: {
    label: 'Computer Networks',
    shortLabel: 'NET',
    glyph: '⬡',
    summary: 'Follow data from local links through routing, transport, and secure application protocols.'
  },
  dbms: {
    label: 'DBMS',
    shortLabel: 'DB',
    glyph: '▤',
    summary: 'Model data, reason about queries and transactions, then study storage and distributed trade-offs.'
  },
  aiml: {
    label: 'AI/ML Systems',
    shortLabel: 'AI/ML',
    glyph: '✳',
    summary: 'Connect modern ML foundations to retrieval, serving, evaluation, and production operations.'
  }
}

function topicCategory(topic) {
  return topic.category || 'os'
}

function sortTopics(topics) {
  return [...topics].sort((left, right) => {
    const levelDifference = (LEVEL_ORDER[left.level || 'beginner'] ?? 0) - (LEVEL_ORDER[right.level || 'beginner'] ?? 0)
    return levelDifference || left.title.localeCompare(right.title)
  })
}

function topicCountLabel(count) {
  return `${count} ${count === 1 ? 'topic' : 'topics'}`
}

export default function HomePage() {
  const [topics, setTopics] = useState([])
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [selectedLevel, setSelectedLevel] = useState('all')

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
          { id: 'spring-boot-internals', category: 'java-spring', title: 'Spring Boot Internals & Auto-Configuration', level: 'intermediate', summary: 'Starters, auto-configuration conditions, externalised configuration, application context startup and observability' },
          { id: 'spring-rest-api-design', category: 'java-spring', title: 'Spring REST API Design & Error Handling', level: 'intermediate', summary: 'Resource modelling, validation, HTTP semantics, problem details, versioning and idempotency' },
          { id: 'spring-security', category: 'java-spring', title: 'Spring Security, Authentication & Authorization', level: 'expert', summary: 'Security filter chain, sessions, JWT, OAuth 2.0, CSRF, method security and least privilege' },
          { id: 'spring-caching-async', category: 'java-spring', title: 'Spring Caching, Async Work & Resilience', level: 'expert', summary: 'Cache abstraction, async execution, scheduling, retries, backpressure and resilience boundaries' },
          { id: 'spring-testing-production', category: 'java-spring', title: 'Spring Testing & Production Readiness', level: 'expert', summary: 'Test slices, integration tests, Testcontainers, observability, deployment checks and incident-safe operations' },
          { id: 'jpa-hibernate-lifecycle', category: 'java-spring', title: 'JPA / Hibernate Entity Lifecycle & N+1 Solver', level: 'expert', summary: 'Entity States (Transient, Managed, Detached, Removed), Dirty checking, N+1 Query Problem, Entity Graphs' },
          { id: 'spring-batch-lifecycle', category: 'java-spring', title: 'Spring Batch Execution Architecture & Chunk Engine', level: 'expert', summary: 'JobLauncher, Job, Step, Chunk-oriented ItemReader/Processor/Writer, JobRepository, Skip & Retry' },
          { id: 'quartz-scheduler', category: 'java-spring', title: 'Quartz Scheduler Lifecycle & Clustered JobStoreTX', level: 'expert', summary: 'Scheduler, JobDetail, Trigger, @DisallowConcurrentExecution, Misfire Instructions, QRTZ_LOCKS clustering' },
          { id: 'design-patterns-solid', category: 'java-spring', title: 'SOLID Principles & Design Patterns', level: 'intermediate', summary: 'SOLID principles, Singleton, Factory, Builder, Observer, Strategy, Adapter, Decorator patterns' },

          // DBMS & SQL (13 Comprehensive Topics)
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
          { id: 'sql-querying', category: 'dbms', title: 'SQL Querying, Joins & Window Functions', level: 'intermediate', summary: 'SELECT execution order, joins, aggregates, CTEs, window functions, indexes and query-plan reasoning' },
          { id: 'distributed-databases-cap', category: 'dbms', title: 'Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem', level: 'expert', summary: 'Synchronous vs Asynchronous replication, 2-Phase Commit (2PC), 3PC, CAP Theorem, Paxos/Raft consensus' },

          // AI / ML Systems (7 Topics)
          { id: 'ml-fundamentals', category: 'aiml', title: 'Machine Learning Fundamentals & Evaluation', level: 'beginner', summary: 'Supervised and unsupervised learning, train-validation-test splits, metrics, overfitting and bias-variance trade-offs' },
          { id: 'embeddings-vector-db', category: 'aiml', title: 'Vector Embeddings, Similarity Search & Vector DBs', level: 'beginner', summary: 'Embedding vectors, cosine similarity, HNSW ANN search, pgvector/Qdrant' },
          { id: 'rag-architecture', category: 'aiml', title: 'Retrieval-Augmented Generation (RAG) Architecture', level: 'intermediate', summary: 'Chunking, retrieval, context assembly, grounded generation pipeline' },
          { id: 'model-serving', category: 'aiml', title: 'LLM Model Serving & Low-Latency Inference', level: 'expert', summary: 'vLLM PagedAttention, KV cache management, batching, GPU memory allocation' },
          { id: 'llm-parameters', category: 'aiml', title: 'LLM Sampling Parameters, Tokenization & ReAct Agents', level: 'intermediate', summary: 'Temperature, Top-P nucleus sampling, tokenization, ReAct agent loops' },
          { id: 'feature-stores', category: 'aiml', title: 'Feature Stores, Data Drift & MLOps Architecture', level: 'expert', summary: 'Online vs offline feature stores, PSI drift detection, retraining pipelines' },
          { id: 'recommendation-systems', category: 'aiml', title: '2-Stage Recommendation Engine Architecture', level: 'expert', summary: 'Two-Tower candidate retrieval, deep ranking models, pCTR x pCVR scoring' }
        ])
      })
  }, [])

  const categories = CATEGORY_ORDER.map(id => ({
    id,
    ...CATEGORY_DETAILS[id],
    topics: sortTopics(topics.filter(topic => topicCategory(topic) === id))
  }))

  const selectedCategories = selectedCategory === 'all'
    ? categories
    : categories.filter(category => category.id === selectedCategory)

  const visibleCategories = selectedCategories.map(category => ({
    ...category,
    topics: selectedLevel === 'all'
      ? category.topics
      : category.topics.filter(topic => (topic.level || 'beginner') === selectedLevel)
  }))

  const visibleTopicCount = visibleCategories.reduce((count, category) => count + category.topics.length, 0)

  return (
    <div className="roadmap-index">
      <header className="roadmap-header">
        <p className="eyebrow">A deliberate learning path</p>
        <h1>CS Fundamentals Roadmap</h1>
        <p>
          Build interview-ready understanding in the order that compounds: Java and Spring first, then the systems and data foundations that support them.
        </p>

        <div className="roadmap-filters">
          <nav className="roadmap-selectors" aria-label="Curriculum categories">
            <button
              type="button"
              onClick={() => setSelectedCategory('all')}
              className={`roadmap-selector ${selectedCategory === 'all' ? 'active' : ''}`}
              aria-pressed={selectedCategory === 'all'}
              aria-label={`Full roadmap, ${topicCountLabel(topics.length)}`}
            >
              <span>Full roadmap</span>
              <span className="roadmap-selector-count" aria-hidden="true">· {topics.length}</span>
            </button>
            {categories.map(category => (
              <button
                key={category.id}
                type="button"
                onClick={() => setSelectedCategory(category.id)}
                className={`roadmap-selector ${selectedCategory === category.id ? 'active' : ''}`}
                aria-pressed={selectedCategory === category.id}
                aria-label={`${category.label}, ${topicCountLabel(category.topics.length)}`}
                data-category={category.id}
              >
                <span className="category-glyph" aria-hidden="true">{category.glyph}</span>
                <span>{category.shortLabel}</span>
                <span className="roadmap-selector-count" aria-hidden="true">· {category.topics.length}</span>
              </button>
            ))}
          </nav>

          <div className="level-selectors" role="group" aria-label="Topic levels">
            {LEVEL_FILTERS.map(level => (
              <button
                key={level}
                type="button"
                className={`level-selector ${selectedLevel === level ? 'active' : ''}`}
                aria-pressed={selectedLevel === level}
                onClick={() => setSelectedLevel(level)}
              >
                {level === 'all' ? 'All levels' : LEVEL_LABELS[level]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div aria-live="polite">
        <section className="category-overview" aria-labelledby="roadmap-summary">
          <h2 id="roadmap-summary">
            {selectedCategory === 'all' ? 'Recommended sequence' : CATEGORY_DETAILS[selectedCategory].label}
          </h2>
          <p>
            {selectedCategory === 'all'
              ? `Study ${visibleTopicCount} topics across five connected foundations. Each section below follows the recommended priority order.`
              : `${CATEGORY_DETAILS[selectedCategory].summary} ${topicCountLabel(visibleTopicCount)} in this path.`}
          </p>
        </section>

        {topics.length === 0 ? (
          <p className="category-overview">Loading the curriculum roadmap…</p>
        ) : visibleTopicCount === 0 ? (
          <section className="roadmap-empty-state" role="status" aria-labelledby="empty-roadmap-heading">
            <h2 id="empty-roadmap-heading">No topics match these filters</h2>
            <p>Choose another category or level to continue exploring the curriculum.</p>
            <button
              type="button"
              className="roadmap-empty-action"
              onClick={() => {
                setSelectedCategory('all')
                setSelectedLevel('all')
              }}
            >
              Show all topics
            </button>
          </section>
        ) : visibleCategories.filter(category => category.topics.length > 0).map((category, categoryIndex) => (
          <section
            key={category.id}
            className="category-overview"
            aria-labelledby={`${category.id}-heading`}
            data-category={category.id}
          >
            <h2 id={`${category.id}-heading`}>
              <span className="category-glyph" aria-hidden="true">{category.glyph}</span>{' '}
              {selectedCategory === 'all' ? `${categoryIndex + 1}. ${category.label}` : category.label}
            </h2>
            <div className="category-meta">
              <p>{category.summary}</p>
              <span>{topicCountLabel(category.topics.length)}</span>
            </div>
            <ol className="topic-rows" aria-label={`${category.label} topics`}>
              {category.topics.map((topic, topicIndex) => (
                <li key={topic.id} className="topic-row">
                  <span className="topic-number" aria-label={`Topic ${topicIndex + 1}`}>{String(topicIndex + 1).padStart(2, '0')}</span>
                  <div className="topic-row-body">
                    <span
                      className={`tier-badge tier-badge--${topic.level || 'beginner'}`}
                      aria-label={`${LEVEL_LABELS[topic.level] || 'Beginner'} level`}
                    >
                      <span className="tier-badge-glyph" aria-hidden="true">
                        {LEVEL_GLYPHS[topic.level] || LEVEL_GLYPHS.beginner}
                      </span>
                      <span>{LEVEL_LABELS[topic.level] || 'Beginner'}</span>
                    </span>
                    <h3 className="topic-row-title">{topic.title}</h3>
                    <p className="topic-row-summary">{topic.summary}</p>
                  </div>
                  <Link to={`/topic/${topic.id}`} className="roadmap-cta" aria-label={`Study ${topic.title}`}>
                    Study topic <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
