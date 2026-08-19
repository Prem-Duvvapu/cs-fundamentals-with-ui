import { useState, lazy, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import TopicViewer from '../components/TopicViewer'

const SchedulingVisualizer = lazy(() => import('../components/visualizers/SchedulingVisualizer'))
const ProcessLifecycleVisualizer = lazy(() => import('../components/visualizers/ProcessLifecycleVisualizer'))
const MemoryVisualizer = lazy(() => import('../components/visualizers/MemoryVisualizer'))
const SynchronizationVisualizer = lazy(() => import('../components/visualizers/SynchronizationVisualizer'))
const DeadlockVisualizer = lazy(() => import('../components/visualizers/DeadlockVisualizer'))
const NetworkingVisualizer = lazy(() => import('../components/visualizers/NetworkingVisualizer'))
const DbmsVisualizer = lazy(() => import('../components/visualizers/DbmsVisualizer'))
const AiMlVisualizer = lazy(() => import('../components/visualizers/AiMlVisualizer'))
const JavaSpringVisualizer = lazy(() => import('../components/visualizers/JavaSpringVisualizer'))
const FileSystemVisualizer = lazy(() => import('../components/visualizers/os/FileSystemVisualizer'))
const IoSystemsVisualizer = lazy(() => import('../components/visualizers/os/IoSystemsVisualizer'))
const DiskSchedulingVisualizer = lazy(() => import('../components/visualizers/os/DiskSchedulingVisualizer'))

export default function TopicPage() {
  const { topicId } = useParams()
  const [activeTab, setActiveTab] = useState('simulator') // 'theory', 'simulator'

  const titleMap = {
    'process-management': 'Process Management & Lifecycle',
    'memory-management': 'Memory Management & Virtual Paging',
    'cpu-scheduling': 'CPU Scheduling Algorithms',
    'synchronization': 'Process Synchronization & Locks',
    'deadlocks': 'Deadlocks & Banker\'s Algorithm',
    'file-systems': 'File Systems & Inodes',
    'io-systems': 'I/O Systems & Kernel Architecture',
    'disk-scheduling': 'Disk Scheduling Algorithms & File Allocation',
    'network-fundamentals': 'Computer Network Fundamentals, Devices & Topologies',
    'physical-layer-media': 'Physical Layer: Transmission Media, Modes & Encoding',
    'osi-model': 'OSI 7-Layer & TCP/IP Reference Model',
    'data-link-layer': 'Data Link Layer, MAC & ARQ Protocols',
    'ip-subnetting': 'IP Addressing, CIDR Subnetting & Protocols',
    'routing-algorithms': 'Routing Algorithms & Link-State vs Distance Vector',
    'tcp-ip': 'TCP vs UDP & Connection Management',
    'tcp-congestion': 'TCP Flow & Congestion Control',
    'transport-layer-protocols': 'Transport Protocols: QUIC, SCTP & TCP Segment Internals',
    'application-layer': 'Application Layer: DNS, HTTP/3 & TLS 1.3',
    'network-security': 'Network Security, Cryptography & Threat Prevention',
    'network-performance-qos': 'Network QoS, Traffic Shaping & Modern Networking',
    'dbms-introduction': 'DBMS Introduction, Architecture & Components',
    'dbms-architecture': 'DBMS Architecture & 3-Schema ANSI-SPARC',
    'er-model': 'ER Diagram Modeling & Relational Mapping',
    'relational-algebra-calculus': 'Relational Algebra, Tuple Calculus & Joins',
    'functional-dependencies-keys': 'Keys, Functional Dependencies & Canonical Cover',
    'database-normalization': 'Database Normalization (1NF to BCNF) & Decompositions',
    'dbms-indexing': 'B/B+ Tree Indexing & Storage Structures',
    'storage-raid-indexing': 'File Organization, RAID Storage & Advanced Indexing',
    'transactions-acid': 'Transactions, ACID States & Crash Recovery',
    'concurrency-control': 'Concurrency Control, 2PL & Timestamp Ordering',
    'query-optimization': 'Query Processing & Cost-Based Optimizer',
    'distributed-databases-cap': 'Distributed DBMS, 2-Phase Commit (2PC) & CAP Theorem',
    'embeddings-vector-db': 'Vector Embeddings, Similarity Search & Vector DBs',
    'rag-architecture': 'Retrieval-Augmented Generation (RAG) Architecture',
    'model-serving': 'LLM Model Serving & Low-Latency Inference',
    'llm-parameters': 'LLM Sampling Parameters, Tokenization & ReAct Agents',
    'feature-stores': 'Feature Stores, Data Drift & MLOps Architecture',
    'recommendation-systems': '2-Stage Recommendation Engine Architecture',
    'java-execution-pipeline': 'Java Execution Pipeline & JDK/JRE/JVM Architecture',
    'java-memory-model': 'Java Memory Model: Primitives, References, Stack & Heap',
    'java-oop-pillars': 'OOP Pillars & Dynamic Method Dispatch (vtable)',
    'java-static-final-records': 'Static, Final, Immutability & Java Records',
    'java-functional-lambdas': 'Interfaces, Functional Interfaces & Lambda Expressions',
    'java-generics': 'Generics, Wildcards (PECS) & Type Erasure',
    'java-collections-framework': 'Collections Framework: List, Set, Queue & PriorityQueue',
    'java-hashmap-internals': 'HashMap Bucket Internals, Treeification & TreeMap',
    'java-streams-optional': 'Java Streams API Lazy Pipeline & Optional',
    'java-reflection-exceptions': 'Reflection API, Annotations & Exception Unwinding',
    'java-multithreading-concurrency': 'Multithreading, Monitors, CAS & ThreadPool Executors',
    'jvm-gc': 'JVM Memory Architecture, GC & Virtual Threads',
    'spring-bean-lifecycle': 'Spring IoC Container & Bean Lifecycle',
    'spring-mvc-lifecycle': 'Spring MVC Request Execution & Security Pipeline',
    'jpa-hibernate-lifecycle': 'JPA / Hibernate Entity Lifecycle & N+1 Solver',
    'spring-batch-lifecycle': 'Spring Batch Execution Architecture & Chunk Engine',
    'quartz-scheduler': 'Quartz Scheduler Lifecycle & Clustered JobStoreTX',
    'design-patterns-solid': 'SOLID Principles & Design Patterns',
  }

  const title = titleMap[topicId] || topicId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const renderVisualizer = () => {
    switch (topicId) {
      case 'cpu-scheduling':
        return <SchedulingVisualizer />
      case 'process-management':
        return <ProcessLifecycleVisualizer />
      case 'memory-management':
        return <MemoryVisualizer />
      case 'synchronization':
        return <SynchronizationVisualizer />
      case 'deadlocks':
        return <DeadlockVisualizer />
      case 'file-systems':
        return <FileSystemVisualizer />
      case 'io-systems':
        return <IoSystemsVisualizer />
      case 'disk-scheduling':
        return <DiskSchedulingVisualizer />
      case 'network-fundamentals':
      case 'physical-layer-media':
      case 'osi-model':
      case 'data-link-layer':
      case 'ip-subnetting':
      case 'routing-algorithms':
      case 'tcp-ip':
      case 'tcp-congestion':
      case 'transport-layer-protocols':
      case 'application-layer':
      case 'network-security':
      case 'network-performance-qos':
      case 'networking':
        return <NetworkingVisualizer defaultTopicId={topicId} />
      case 'embeddings-vector-db':
      case 'rag-architecture':
      case 'model-serving':
      case 'llm-parameters':
      case 'feature-stores':
      case 'recommendation-systems':
      case 'aiml':
        return <AiMlVisualizer defaultTopicId={topicId} />
      case 'java-execution-pipeline':
      case 'java-memory-model':
      case 'java-oop-pillars':
      case 'java-static-final-records':
      case 'jvm-gc':
      case 'java-functional-lambdas':
      case 'java-generics':
      case 'java-collections-framework':
      case 'java-hashmap-internals':
      case 'java-streams-optional':
      case 'java-reflection-exceptions':
      case 'java-multithreading-concurrency':
      case 'spring-bean-lifecycle':
      case 'spring-mvc-lifecycle':
      case 'jpa-hibernate-lifecycle':
      case 'spring-batch-lifecycle':
      case 'quartz-scheduler':
      case 'design-patterns-solid':
      case 'java-spring':
        return <JavaSpringVisualizer defaultTopicId={topicId} />
      case 'dbms-introduction':
      case 'dbms-architecture':
      case 'er-model':
      case 'relational-algebra-calculus':
      case 'functional-dependencies-keys':
      case 'database-normalization':
      case 'dbms-indexing':
      case 'storage-raid-indexing':
      case 'transactions-acid':
      case 'concurrency-control':
      case 'query-optimization':
      case 'distributed-databases-cap':
      case 'dbms':
        return <DbmsVisualizer defaultTopicId={topicId} />
      default:
        return <div className="viz-card"><h3>Visualizer coming soon for this topic.</h3></div>
    }
  }

  return (
    <div className="topic-page-container">
      <div className="topic-page-header">
        <Link to="/" className="back-link">
          ← Back to All Topics
        </Link>
        <h1 className="topic-page-title">{title}</h1>

        <div className="main-tab-switcher">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`main-tab-btn ${activeTab === 'simulator' ? 'active-tab' : ''}`}
          >
            ⚡ Interactive Visual Simulation
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`main-tab-btn ${activeTab === 'theory' ? 'active-tab' : ''}`}
          >
            📖 Educational Content & Deep Dive
          </button>
        </div>
      </div>

      <div className="tab-content-area">
        {activeTab === 'simulator' ? (
          <Suspense fallback={<div className="viz-card"><h3>Loading visualizer…</h3></div>}>
            {renderVisualizer()}
          </Suspense>
        ) : (
          <TopicViewer topicId={topicId} />
        )}
      </div>
    </div>
  )
}
