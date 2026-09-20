import React, { useState, useMemo } from 'react'
import JvmMemoryVisualizer from './java/JvmMemoryVisualizer'
import SimulationControlBar from '../shared/SimulationControlBar'
import StateInspector from '../shared/StateInspector'
import { EventDrivenMessagingEngine, MESSAGING_SCENARIOS } from '../../utils/simulationEngines/eventDrivenMessagingEngine'
import { CircuitBreakerEngine, CIRCUIT_BREAKER_SCENARIOS } from '../../utils/simulationEngines/circuitBreakerEngine'

export default function JavaSpringVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'jvm-gc': return 'jvm'
      case 'spring-mvc-lifecycle': return 'mvc'
      case 'quartz-scheduler': return 'quartz'
      case 'event-driven-messaging': return 'messaging'
      case 'microservices-patterns': return 'circuit-breaker'
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

  // ==========================================
  // MODE 7: EVENT-DRIVEN MESSAGING (OUTBOX PATTERN)
  // ==========================================
  const messagingEngine = useMemo(() => new EventDrivenMessagingEngine(), [])
  const [messagingState, setMessagingState] = useState(() => messagingEngine.getCurrentState())
  const [messagingPlaying, setMessagingPlaying] = useState(false)

  const handleMessagingScenario = (scenarioId) => {
    setMessagingState(messagingEngine.setScenario(scenarioId))
    setMessagingPlaying(false)
  }

  // ==========================================
  // MODE 8: CIRCUIT BREAKER STATE MACHINE
  // ==========================================
  const circuitBreakerEngine = useMemo(() => new CircuitBreakerEngine(), [])
  const [circuitBreakerState, setCircuitBreakerState] = useState(() => circuitBreakerEngine.getCurrentState())
  const [circuitBreakerPlaying, setCircuitBreakerPlaying] = useState(false)

  const handleCircuitBreakerScenario = (scenarioId) => {
    setCircuitBreakerState(circuitBreakerEngine.setScenario(scenarioId))
    setCircuitBreakerPlaying(false)
  }

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
          <button
            onClick={() => setActiveTab('messaging')}
            className={`main-tab-btn ${activeTab === 'messaging' ? 'active-tab' : ''}`}
          >
            📨 Event-Driven Messaging
          </button>
          <button
            onClick={() => setActiveTab('circuit-breaker')}
            className={`main-tab-btn ${activeTab === 'circuit-breaker' ? 'active-tab' : ''}`}
          >
            🔌 Circuit Breaker
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

      {/* MODE 7: EVENT-DRIVEN MESSAGING (OUTBOX PATTERN) */}
      {activeTab === 'messaging' && (
        <div className="u-col-lg">
          <div className="scenario-picker-panel">
            <label className="scenario-picker-label">Select Scenario:</label>
            <div className="scenario-picker-grid">
              {Object.values(MESSAGING_SCENARIOS).map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleMessagingScenario(scenario.id)}
                  className={`scenario-chip ${messagingState.activeScenario === scenario.id ? 'is-active' : ''}`}
                  title={scenario.description}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h4>{messagingState.stepData.title}</h4>
              <span className="status-chip is-normal">
                Step {messagingState.stepIndex + 1} of {messagingState.totalSteps}
              </span>
            </div>
            <p className="detail-card-desc">{messagingState.stepData.explanation}</p>

            <div className="metrics-grid">
              {messagingState.stepData.outboxStatus !== undefined && (
                <div className="viz-card">
                  <h4>📤 Outbox Row</h4>
                  <span className={`status-chip ${messagingState.stepData.outboxStatus === 'PUBLISHED' ? 'is-normal' : 'is-alert'}`}>
                    {messagingState.stepData.outboxStatus}
                  </span>
                </div>
              )}
              {messagingState.stepData.brokerQueue !== undefined && (
                <div className="viz-card">
                  <h4>📮 Broker Queue</h4>
                  {messagingState.stepData.brokerQueue.length === 0
                    ? <span className="status-chip">empty</span>
                    : messagingState.stepData.brokerQueue.map((msg, i) => (
                      <span key={i} className="header-pill">{msg}</span>
                    ))}
                </div>
              )}
              {messagingState.stepData.idempotencyStore !== undefined && (
                <div className="viz-card">
                  <h4>🔑 Idempotency Store</h4>
                  {messagingState.stepData.idempotencyStore.length === 0
                    ? <span className="status-chip">empty</span>
                    : messagingState.stepData.idempotencyStore.map((id, i) => (
                      <span key={i} className="header-pill">{id}</span>
                    ))}
                </div>
              )}
              {messagingState.stepData.dlq !== undefined && (
                <div className="viz-card">
                  <h4>☠️ Dead-Letter Queue</h4>
                  {messagingState.stepData.dlq.length === 0
                    ? <span className="status-chip">empty</span>
                    : messagingState.stepData.dlq.map((id, i) => (
                      <span key={i} className="status-chip is-alert">{id}</span>
                    ))}
                </div>
              )}
            </div>
          </div>

          <SimulationControlBar
            isPlaying={messagingPlaying}
            onTogglePlay={() => setMessagingPlaying(!messagingPlaying)}
            onStepForward={() => setMessagingState(messagingEngine.nextStep())}
            onStepBackward={() => setMessagingState(messagingEngine.prevStep())}
            onReset={() => { setMessagingState(messagingEngine.reset()); setMessagingPlaying(false) }}
            currentTime={messagingState.stepIndex}
            maxTime={Math.max(0, messagingState.totalSteps - 1)}
            onSeek={(idx) => {
              messagingEngine.stepIndex = idx
              setMessagingState(messagingEngine.getCurrentState())
            }}
          />

          <StateInspector
            title="Outbox Pattern Inspector"
            data={{
              scenario: messagingState.scenarioMeta.name,
              outboxStatus: messagingState.stepData.outboxStatus ?? 'n/a',
              brokerQueueDepth: messagingState.stepData.brokerQueue?.length ?? 0,
              inventoryReservedCount: messagingState.stepData.inventoryReservedCount ?? 0,
              retryCount: messagingState.stepData.retryCount ?? 0
            }}
          />
        </div>
      )}

      {/* MODE 8: CIRCUIT BREAKER STATE MACHINE */}
      {activeTab === 'circuit-breaker' && (
        <div className="u-col-lg">
          <div className="scenario-picker-panel">
            <label className="scenario-picker-label">Select Scenario:</label>
            <div className="scenario-picker-grid">
              {Object.values(CIRCUIT_BREAKER_SCENARIOS).map(scenario => (
                <button
                  key={scenario.id}
                  onClick={() => handleCircuitBreakerScenario(scenario.id)}
                  className={`scenario-chip ${circuitBreakerState.activeScenario === scenario.id ? 'is-active' : ''}`}
                  title={scenario.description}
                >
                  {scenario.name}
                </button>
              ))}
            </div>
          </div>

          <div className="detail-card">
            <div className="detail-card-header">
              <h4>Call {circuitBreakerState.stepData.callNumber}</h4>
              <span className={`status-chip ${circuitBreakerState.stepData.state === 'OPEN' ? 'is-alert' : 'is-normal'}`}>
                {circuitBreakerState.stepData.state}
              </span>
            </div>
            <p className="detail-card-desc">{circuitBreakerState.stepData.explanation}</p>

            {circuitBreakerState.stepData.rejected && (
              <div className="info-panel accent-danger">
                <p>⛔ Call rejected immediately — <code>CallNotPermittedException</code>, no network call attempted.</p>
              </div>
            )}
          </div>

          <SimulationControlBar
            isPlaying={circuitBreakerPlaying}
            onTogglePlay={() => setCircuitBreakerPlaying(!circuitBreakerPlaying)}
            onStepForward={() => setCircuitBreakerState(circuitBreakerEngine.nextStep())}
            onStepBackward={() => setCircuitBreakerState(circuitBreakerEngine.prevStep())}
            onReset={() => { setCircuitBreakerState(circuitBreakerEngine.reset()); setCircuitBreakerPlaying(false) }}
            currentTime={circuitBreakerState.stepIndex}
            maxTime={Math.max(0, circuitBreakerState.totalSteps - 1)}
            onSeek={(idx) => {
              circuitBreakerEngine.stepIndex = idx
              setCircuitBreakerState(circuitBreakerEngine.getCurrentState())
            }}
          />

          <StateInspector
            title="Circuit Breaker Inspector"
            data={{
              scenario: circuitBreakerState.scenarioMeta.name,
              state: circuitBreakerState.stepData.state,
              failureRatePercent: circuitBreakerState.stepData.failureRatePercent != null
                ? `${circuitBreakerState.stepData.failureRatePercent.toFixed(1)}%`
                : 'not yet evaluated',
              rejected: circuitBreakerState.stepData.rejected ? 'yes' : 'no'
            }}
          />
        </div>
      )}
    </div>
  )
}
