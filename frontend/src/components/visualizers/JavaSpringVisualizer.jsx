import React, { useState } from 'react'
import JvmMemoryVisualizer from './java/JvmMemoryVisualizer'
import HashMapVisualizer from './java/HashMapVisualizer'
import VirtualThreadsVisualizer from './java/VirtualThreadsVisualizer'
import ConnectionPoolVisualizer from './java/ConnectionPoolVisualizer'
import SpringBatchVisualizer from './java/SpringBatchVisualizer'
import JavaExecutionPipelineVisualizer from './java/JavaExecutionPipelineVisualizer'
import JavaMemoryModelVisualizer from './java/JavaMemoryModelVisualizer'
import JavaOopVisualizer from './java/JavaOopVisualizer'
import JavaStaticRecordsVisualizer from './java/JavaStaticRecordsVisualizer'
import JavaFunctionalLambdasVisualizer from './java/JavaFunctionalLambdasVisualizer'
import JavaGenericsVisualizer from './java/JavaGenericsVisualizer'
import JavaCollectionsVisualizer from './java/JavaCollectionsVisualizer'
import JavaStreamsOptionalVisualizer from './java/JavaStreamsOptionalVisualizer'

export default function JavaSpringVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'java-execution-pipeline': return 'pipeline'
      case 'java-memory-model': return 'memory-model'
      case 'java-oop-pillars':
      case 'java-oop-vtable': return 'oop-vtable'
      case 'java-static-final-records': return 'static-records'
      case 'java-functional-lambdas': return 'functional-lambdas'
      case 'java-generics': return 'generics'
      case 'java-collections-framework': return 'collections'
      case 'java-streams-optional': return 'streams-optional'
      case 'jvm-gc': return 'jvm'
      case 'spring-bean-lifecycle': return 'bean'
      case 'spring-mvc-lifecycle': return 'mvc'
      case 'jpa-hibernate-lifecycle': return 'jpa'
      case 'spring-batch-lifecycle': return 'batch'
      case 'quartz-scheduler': return 'quartz'
      default: return 'pipeline'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // ==========================================
  // MODE 1: JVM MEMORY & THREAD 6-STATE MACHINE
  // ==========================================
  const [threadState, setThreadState] = useState('NEW')
  const [threadType, setThreadType] = useState('platform') // 'platform', 'virtual'

  // ==========================================
  // MODE 2: SPRING BEAN LIFECYCLE PIPELINE
  // ==========================================
  const [beanStep, setBeanStep] = useState(0)
  const beanSteps = [
    { title: 'Step 1: Bean Definition Loading', desc: 'Spring scans @Component classes and registers BeanDefinition in BeanFactory registry.' },
    { title: 'Step 2: Bean Instantiation', desc: 'Constructs raw Bean instance using Java reflection / constructor injection.' },
    { title: 'Step 3: Populate Properties', desc: 'Injects dependencies annotated with @Autowired, @Value, or @Resource.' },
    { title: 'Step 4: Aware Interfaces Execution', desc: 'Invokes BeanNameAware.setBeanName(), BeanFactoryAware.setBeanFactory(), ApplicationContextAware.' },
    { title: 'Step 5: BeanPostProcessor (Before Initialization)', desc: 'Executes postProcessBeforeInitialization() across custom BeanPostProcessors.' },
    { title: 'Step 6: @PostConstruct / InitializingBean', desc: 'Executes @PostConstruct method or InitializingBean.afterPropertiesSet() custom init logic.' },
    { title: 'Step 7: BeanPostProcessor (After Initialization)', desc: 'Executes postProcessAfterInitialization() — Wraps bean in CGLIB/JDK AOP Proxy for @Transactional & @Async!' },
    { title: 'Step 8: BEAN IS READY FOR USE', desc: 'Bean is fully initialized and stored in Spring Singleton Bean Registry.' },
    { title: 'Step 9: @PreDestroy (Shutdown)', desc: 'Executes @PreDestroy / DisposableBean.destroy() when ApplicationContext closes.' }
  ]

  // ==========================================
  // MODE 3: SPRING MVC REQUEST LIFECYCLE
  // ==========================================
  const [mvcStep, setMvcStep] = useState(0)
  const mvcPipeline = [
    { title: '1. Client HTTP Request', desc: 'GET /api/v1/orders/101 arrives at Tomcat / Jetty Servlet Container.' },
    { title: '2. Security Filter Chain', desc: 'FilterChainProxy executes BearerTokenAuthenticationFilter & AuthorizationFilter (@PreAuthorize).' },
    { title: '3. DispatcherServlet Front Controller', desc: 'Delegates request to Spring MVC infrastructure.' },
    { title: '4. HandlerMapping Lookup', desc: 'Finds matching @GetMapping("/api/v1/orders/{id}") OrderController method.' },
    { title: '5. HandlerAdapter Invocation', desc: 'Resolves method arguments (@PathVariable, @RequestBody) and invokes controller method.' },
    { title: '6. Controller Business Execution', desc: 'OrderService executes business logic & fetches data from JPA repository.' },
    { title: '7. HttpMessageConverter JSON Response', desc: 'Jackson HttpMessageConverter serializes Java DTO to HTTP 200 OK JSON response body.' }
  ]

  // ==========================================
  // MODE 4: JPA / HIBERNATE ENTITY STATE MACHINE & N+1 SOLVER
  // ==========================================
  const [entityState, setEntityState] = useState('TRANSIENT')
  const [dirtyField, setDirtyField] = useState('Alice')
  const [isDirty, setIsDirty] = useState(false)
  const [fetchStrategy, setFetchStrategy] = useState('lazy') // 'lazy', 'joinfetch'

  const handleUpdateField = (val) => {
    setDirtyField(val)
    if (entityState === 'PERSISTENT') {
      setIsDirty(true)
    }
  }

  // ==========================================
  // MODE 5: SPRING BATCH CHUNK EXECUTION ENGINE
  // ==========================================
  const [batchStep, setBatchStep] = useState(0)
  const [chunkSize, setChunkSize] = useState(3)
  const [processedCount, setProcessedCount] = useState(0)
  const [skipCount, setSkipCount] = useState(0)

  const handleRunChunk = () => {
    setProcessedCount(prev => prev + chunkSize)
  }

  // ==========================================
  // MODE 6: QUARTZ SCHEDULER & CLUSTER LOCKING
  // ==========================================
  const [quartzState, setQuartzState] = useState('IDLE')
  const [disallowConcurrent, setDisallowConcurrent] = useState(true)
  const [misfirePolicy, setMisfirePolicy] = useState('fire_now')

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>☕ Java, Spring Boot, JPA & Enterprise Batch Engine</h2>
          <p>Explore JVM Memory & Threads, Spring Bean Lifecycle, Spring MVC Pipeline, JPA Entity States, Spring Batch & Quartz.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher hub-subnav is-centered">
          <button
            onClick={() => setActiveTab('pipeline')}
            className={`main-tab-btn ${activeTab === 'pipeline' ? 'active-tab' : ''}`}
          >
            ⚙️ Execution Pipeline
          </button>
          <button
            onClick={() => setActiveTab('memory-model')}
            className={`main-tab-btn ${activeTab === 'memory-model' ? 'active-tab' : ''}`}
          >
            💾 Memory Model (Stack vs Heap)
          </button>
          <button
            onClick={() => setActiveTab('oop-vtable')}
            className={`main-tab-btn ${activeTab === 'oop-vtable' ? 'active-tab' : ''}`}
          >
            🐕 OOP & vtable Dispatch
          </button>
          <button
            onClick={() => setActiveTab('static-records')}
            className={`main-tab-btn ${activeTab === 'static-records' ? 'active-tab' : ''}`}
          >
            🔒 Static, Final & Records
          </button>
          <button
            onClick={() => setActiveTab('functional-lambdas')}
            className={`main-tab-btn ${activeTab === 'functional-lambdas' ? 'active-tab' : ''}`}
          >
            ⚡ Lambdas & invokedynamic
          </button>
          <button
            onClick={() => setActiveTab('generics')}
            className={`main-tab-btn ${activeTab === 'generics' ? 'active-tab' : ''}`}
          >
            🧬 Generics & PECS
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`main-tab-btn ${activeTab === 'collections' ? 'active-tab' : ''}`}
          >
            📚 Collections & Heap
          </button>
          <button
            onClick={() => setActiveTab('streams-optional')}
            className={`main-tab-btn ${activeTab === 'streams-optional' ? 'active-tab' : ''}`}
          >
            🌊 Streams & Optional
          </button>
          <button
            onClick={() => setActiveTab('jvm')}
            className={`main-tab-btn ${activeTab === 'jvm' ? 'active-tab' : ''}`}
          >
            🧠 JVM Heap & GC
          </button>
          <button
            onClick={() => setActiveTab('hashmap')}
            className={`main-tab-btn ${activeTab === 'hashmap' ? 'active-tab' : ''}`}
          >
            🔑 HashMap & Bucket Internals
          </button>
          <button
            onClick={() => setActiveTab('virtual-threads')}
            className={`main-tab-btn ${activeTab === 'virtual-threads' ? 'active-tab' : ''}`}
          >
            🌀 Virtual Threads (Loom)
          </button>
          <button
            onClick={() => setActiveTab('bean')}
            className={`main-tab-btn ${activeTab === 'bean' ? 'active-tab' : ''}`}
          >
            🌱 Spring Bean Lifecycle
          </button>
          <button
            onClick={() => setActiveTab('mvc')}
            className={`main-tab-btn ${activeTab === 'mvc' ? 'active-tab' : ''}`}
          >
            🌐 Spring MVC Request Flow
          </button>
          <button
            onClick={() => setActiveTab('hikari-pool')}
            className={`main-tab-btn ${activeTab === 'hikari-pool' ? 'active-tab' : ''}`}
          >
            🔌 HikariCP Connection Pool
          </button>
          <button
            onClick={() => setActiveTab('jpa')}
            className={`main-tab-btn ${activeTab === 'jpa' ? 'active-tab' : ''}`}
          >
            🗄 JPA Entity States & N+1
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`main-tab-btn ${activeTab === 'batch' ? 'active-tab' : ''}`}
          >
            📦 Spring Batch Chunk Engine
          </button>
          <button
            onClick={() => setActiveTab('quartz')}
            className={`main-tab-btn ${activeTab === 'quartz' ? 'active-tab' : ''}`}
          >
            ⏱ Quartz Scheduler & Cluster
          </button>
        </div>
      </div>

      {/* MODE 0: JAVA EXECUTION PIPELINE */}
      {activeTab === 'pipeline' && (
        <JavaExecutionPipelineVisualizer />
      )}

      {/* MODE 0.5: JAVA MEMORY MODEL (STACK VS HEAP) */}
      {activeTab === 'memory-model' && (
        <JavaMemoryModelVisualizer />
      )}

      {/* MODE 0.75: JAVA OOP & DYNAMIC METHOD DISPATCH (VTABLE) */}
      {activeTab === 'oop-vtable' && (
        <JavaOopVisualizer />
      )}

      {/* MODE 0.85: STATIC, FINAL, IMMUTABILITY & JAVA RECORDS */}
      {activeTab === 'static-records' && (
        <JavaStaticRecordsVisualizer />
      )}

      {/* MODE 0.90: FUNCTIONAL INTERFACES & LAMBDAS */}
      {activeTab === 'functional-lambdas' && (
        <JavaFunctionalLambdasVisualizer />
      )}

      {/* MODE 0.92: GENERICS & PECS */}
      {activeTab === 'generics' && (
        <JavaGenericsVisualizer />
      )}

      {/* MODE 0.94: COLLECTIONS FRAMEWORK & PRIORITYQUEUE */}
      {activeTab === 'collections' && (
        <JavaCollectionsVisualizer />
      )}

      {/* MODE 0.96: STREAMS API & OPTIONAL */}
      {activeTab === 'streams-optional' && (
        <JavaStreamsOptionalVisualizer />
      )}

      {/* MODE 1: JVM MEMORY & HEAP GENERATIONS */}
      {activeTab === 'jvm' && (
        <JvmMemoryVisualizer />
      )}

      {/* MODE 2: HASHMAP & BUCKET INTERNALS */}
      {activeTab === 'hashmap' && (
        <HashMapVisualizer />
      )}

      {/* MODE 3: VIRTUAL THREADS (LOOM) */}
      {activeTab === 'virtual-threads' && (
        <VirtualThreadsVisualizer />
      )}

      {/* MODE 4: HIKARICP CONNECTION POOL */}
      {activeTab === 'hikari-pool' && (
        <ConnectionPoolVisualizer />
      )}

      {/* MODE 2: SPRING BEAN LIFECYCLE */}
      {activeTab === 'bean' && (
        <div className="viz-card">
          <h3>🌱 Spring IoC Container & Bean Initialization Pipeline</h3>

          <div className="action-buttons-group">
            <button onClick={() => setBeanStep(0)} className="btn btn-secondary">⏮ Reset Context</button>
            <button onClick={() => setBeanStep(prev => Math.min(8, prev + 1))} disabled={beanStep >= 8} className="btn btn-primary">
              Next Lifecycle Step ▶
            </button>
          </div>

          <div className="info-panel">
            <h4>{beanSteps[beanStep].title}</h4>
            <p>{beanSteps[beanStep].desc}</p>
          </div>
        </div>
      )}

      {/* MODE 3: SPRING MVC REQUEST LIFECYCLE */}
      {activeTab === 'mvc' && (
        <div className="viz-card">
          <h3>🌐 Spring MVC DispatcherServlet Request Execution Pipeline</h3>

          <div className="action-buttons-group">
            <button onClick={() => setMvcStep(0)} className="btn btn-secondary">⏮ Reset Request</button>
            <button onClick={() => setMvcStep(prev => Math.min(6, prev + 1))} disabled={mvcStep >= 6} className="btn btn-primary">
              Step Pipeline Forward ▶
            </button>
          </div>

          <div className="info-panel accent-info">
            <h4>{mvcPipeline[mvcStep].title}</h4>
            <p>{mvcPipeline[mvcStep].desc}</p>
          </div>
        </div>
      )}

      {/* MODE 4: JPA / HIBERNATE ENTITY STATE MACHINE */}
      {activeTab === 'jpa' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🗄 JPA / Hibernate 4-State Entity Machine</h3>

            <div className="entity-state-grid">
              <button onClick={() => { setEntityState('TRANSIENT'); setIsDirty(false) }} className={`btn ${entityState === 'TRANSIENT' ? 'btn-primary' : 'btn-secondary'}`}>
                1. Transient (new User())
              </button>
              <button onClick={() => { setEntityState('PERSISTENT'); setIsDirty(false) }} className={`btn ${entityState === 'PERSISTENT' ? 'btn-primary' : 'btn-secondary'}`}>
                2. Persistent / Managed (em.persist())
              </button>
              <button onClick={() => setEntityState('DETACHED')} className={`btn ${entityState === 'DETACHED' ? 'btn-primary' : 'btn-secondary'}`}>
                3. Detached (em.detach())
              </button>
              <button onClick={() => setEntityState('REMOVED')} className={`btn ${entityState === 'REMOVED' ? 'btn-primary' : 'btn-secondary'}`}>
                4. Removed (em.remove())
              </button>
            </div>

            <div className="info-panel mt-panel">
              <h4>Current Entity State: <span className="state-value">{entityState}</span></h4>

              <div className="dirty-check-row">
                <label className="field-label-strong">Test Dirty Checking (Modify Field):</label>
                <input
                  type="text"
                  value={dirtyField}
                  onChange={e => handleUpdateField(e.target.value)}
                  className="num-input is-full"
                />
              </div>

              {isDirty && (
                <div className="dirty-alert">
                  🔥 <strong>Automatic Dirty Checking Triggered!</strong> Hibernate tracked field change and will automatically execute SQL UPDATE upon transaction commit!
                </div>
              )}
            </div>
          </div>

          <div className="viz-card">
            <h3>⚡ N+1 Query Problem vs JOIN FETCH Optimization</h3>

            <div className="main-tab-switcher subnav-compact">
              <button onClick={() => setFetchStrategy('lazy')} className={`main-tab-btn ${fetchStrategy === 'lazy' ? 'active-tab' : ''}`}>
                Unoptimized LAZY Fetch (N+1 Problem)
              </button>
              <button onClick={() => setFetchStrategy('joinfetch')} className={`main-tab-btn ${fetchStrategy === 'joinfetch' ? 'active-tab' : ''}`}>
                Optimized JOIN FETCH (1 SQL Query)
              </button>
            </div>

            <div className="info-panel">
              <div className="query-compare-row">
                <span>SQL Queries Executed for 100 Orders:</span>
                <strong className={`query-count ${fetchStrategy === 'lazy' ? 'is-danger' : 'is-success'}`}>
                  {fetchStrategy === 'lazy' ? '101 SQL Queries (1 + 100 N+1 Queries!)' : '1 SQL Query (JOIN FETCH)'}
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 5: SPRING BATCH CHUNK ENGINE */}
      {activeTab === 'batch' && (
        <SpringBatchVisualizer />
      )}

      {/* MODE 6: QUARTZ SCHEDULER & CLUSTER LOCKING */}
      {activeTab === 'quartz' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>⏱ Quartz Scheduler Execution & Misfire Engine</h3>

            <div className="quartz-controls">
              <div className="u-row">
                <input
                  type="checkbox"
                  id="disallowConc"
                  checked={disallowConcurrent}
                  onChange={e => setDisallowConcurrent(e.target.checked)}
                />
                <label htmlFor="disallowConc" className="field-label-strong">
                  @DisallowConcurrentExecution (Block Parallel Job Runs)
                </label>
              </div>

              <div>
                <label className="field-label-strong is-block">Misfire Handling Policy:</label>
                <select
                  value={misfirePolicy}
                  onChange={e => setMisfirePolicy(e.target.value)}
                  className="num-input is-full"
                >
                  <option value="fire_now">MISFIRE_INSTRUCTION_FIRE_NOW (Run Missed Job Immediately)</option>
                  <option value="do_nothing">MISFIRE_INSTRUCTION_DO_NOTHING (Ignore Missed Runs)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>🔒 Clustered `JobStoreTX` Database Locking (`QRTZ_LOCKS`)</h3>

            <div className="info-panel">
              <p>
                In a multi-pod Kubernetes deployment, Quartz acquires a row-level DB lock on <code>QRTZ_LOCKS (LOCK_NAME = 'TRIGGER_ACCESS')</code> to guarantee exactly-once execution across the microservice cluster!
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
