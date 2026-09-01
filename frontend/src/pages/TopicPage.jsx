import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import TopicViewer from '../components/TopicViewer'
import { hasTopicVisualizer, TopicVisualizer } from '../components/visualizers/topicVisualizerRegistry'
import { CATEGORY_METADATA, getTopicCategory } from '../utils/topicCategories'

export default function TopicPage() {
  const { topicId } = useParams()
  const [activeTab, setActiveTab] = useState('theory') // 'theory', 'simulator'
  const [compactHeader, setCompactHeader] = useState(false)
  const tabRefs = useRef([])

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
    'sql-querying': 'Practical SQL, Joins, CTEs & Window Functions',
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
    'ml-fundamentals': 'Machine Learning Fundamentals & Evaluation',
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
    'spring-boot-internals': 'Spring Boot Internals, Auto-configuration & Profiles',
    'spring-rest-api-design': 'Spring REST API Design, Validation & Error Contracts',
    'spring-security': 'Spring Security, JWT & OAuth2 Fundamentals',
    'spring-caching-async': 'Spring Caching, Async Work & Scheduling',
    'spring-testing-production': 'Spring Testing & Production Operations',
  }

  const title = titleMap[topicId] || topicId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
  const category = getTopicCategory(topicId)
  const categoryMetadata = CATEGORY_METADATA[category]
  const canSimulate = hasTopicVisualizer(topicId)
  const tabs = canSimulate ? ['theory', 'simulator'] : ['theory']
  const selectedTab = canSimulate ? activeTab : 'theory'

  useEffect(() => {
    const updateHeader = () => setCompactHeader(window.scrollY > 120)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  useEffect(() => {
    setActiveTab('theory')
  }, [topicId])

  const selectTab = (tab, focus = false) => {
    const index = tabs.indexOf(tab)
    setActiveTab(tab)
    if (focus) tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.indexOf(selectedTab)
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    selectTab(tabs[nextIndex], true)
  }

  return (
    <div className="topic-page-container" data-category={category}>
      <div className={`topic-page-header ${compactHeader ? 'topic-page-header--compact' : ''}`}>
        <nav className="topic-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/">All topics</Link></li>
            <li aria-current="page">
              <span aria-hidden="true">{categoryMetadata.glyph}</span> {categoryMetadata.label}
            </li>
          </ol>
        </nav>
        <h1 className="topic-page-title">{title}</h1>

        {canSimulate && (
          <div className="main-tab-switcher" role="tablist" aria-label="Topic view">
            <button
              ref={element => { tabRefs.current[0] = element }}
              id="topic-tab-theory"
              type="button"
              role="tab"
              aria-selected={selectedTab === 'theory'}
              aria-controls="topic-panel-theory"
              tabIndex={selectedTab === 'theory' ? 0 : -1}
              onClick={() => selectTab('theory')}
              onKeyDown={handleTabKeyDown}
              className={`main-tab-btn ${selectedTab === 'theory' ? 'active-tab' : ''}`}
            >
              <span aria-hidden="true">📖</span> Study
            </button>
            <button
              ref={element => { tabRefs.current[1] = element }}
              id="topic-tab-simulator"
              type="button"
              role="tab"
              aria-selected={selectedTab === 'simulator'}
              aria-controls="topic-panel-simulator"
              tabIndex={selectedTab === 'simulator' ? 0 : -1}
              onClick={() => selectTab('simulator')}
              onKeyDown={handleTabKeyDown}
              className={`main-tab-btn ${selectedTab === 'simulator' ? 'active-tab' : ''}`}
            >
              <span aria-hidden="true">⚡</span> Simulation
            </button>
          </div>
        )}
      </div>

      <div
        className="tab-content-area"
        id={canSimulate ? `topic-panel-${selectedTab}` : undefined}
        role={canSimulate ? 'tabpanel' : undefined}
        aria-labelledby={canSimulate ? `topic-tab-${selectedTab}` : undefined}
        tabIndex={canSimulate ? '0' : undefined}
      >
        {selectedTab === 'simulator' ? (
          <Suspense fallback={<div className="viz-card"><h3>Loading visualizer…</h3></div>}>
            <TopicVisualizer topicId={topicId} />
          </Suspense>
        ) : (
          <TopicViewer topicId={topicId} category={category} />
        )}
      </div>
    </div>
  )
}
