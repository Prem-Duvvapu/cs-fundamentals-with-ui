import React, { useState } from 'react'
import JvmMemoryVisualizer from './java/JvmMemoryVisualizer'

export default function JavaSpringVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'jvm-gc': return 'jvm'
      case 'spring-mvc-lifecycle': return 'mvc'
      case 'quartz-scheduler': return 'quartz'
      default: return 'jvm'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

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
  // MODE 6: QUARTZ SCHEDULER & CLUSTER LOCKING
  // ==========================================
  const [disallowConcurrent, setDisallowConcurrent] = useState(true)
  const [misfirePolicy, setMisfirePolicy] = useState('fire_now')

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>☕ Java, Spring Boot & JPA Runtime Engine</h2>
          <p>Explore JVM Memory & Threads, Spring MVC Pipeline & Quartz.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher hub-subnav is-centered">
          <button
            onClick={() => setActiveTab('jvm')}
            className={`main-tab-btn ${activeTab === 'jvm' ? 'active-tab' : ''}`}
          >
            🧠 JVM Heap & GC
          </button>
          <button
            onClick={() => setActiveTab('mvc')}
            className={`main-tab-btn ${activeTab === 'mvc' ? 'active-tab' : ''}`}
          >
            🌐 Spring MVC Request Flow
          </button>
          <button
            onClick={() => setActiveTab('quartz')}
            className={`main-tab-btn ${activeTab === 'quartz' ? 'active-tab' : ''}`}
          >
            ⏱ Quartz Scheduler & Cluster
          </button>
        </div>
      </div>

      {/* MODE 1: JVM MEMORY & HEAP GENERATIONS */}
      {activeTab === 'jvm' && (
        <JvmMemoryVisualizer />
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
