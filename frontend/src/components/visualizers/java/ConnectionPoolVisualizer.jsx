import React, { useState, useEffect } from 'react'
import { ConnectionPoolEngine } from '../../../utils/simulationEngines/connectionPoolEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import springJpaData from '../../../data/spring-jpa-concepts.json'

export default function ConnectionPoolVisualizer() {
  const [engine] = useState(() => new ConnectionPoolEngine(4))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  useEffect(() => {
    // Initial requests
    const s1 = engine.requestConnection('Tomcat-Thread-1')
    const s2 = engine.requestConnection('Tomcat-Thread-2')
    setSteps([...s1, ...s2])
  }, [])

  useEffect(() => {
    let timer = null
    if (isPlaying && steps.length > 0) {
      timer = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, steps.length, speed])

  const handleRequest = () => {
    const s = engine.requestConnection()
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleReturn = (connId) => {
    const s = engine.returnConnection(connId)
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls Card */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button onClick={handleRequest} className="btn btn-primary">
            📥 Simulate Incoming DB Query Request
          </button>
        </div>

        <SimulationControlBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onStepForward={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
          onStepBackward={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
          onReset={() => { setCurrentStepIdx(0); setIsPlaying(false); }}
          currentTime={currentStepIdx}
          maxTime={Math.max(0, steps.length - 1)}
          speed={speed}
          onSpeedChange={setSpeed}
          onSeek={setCurrentStepIdx}
        />
      </div>

      {/* Action Banner */}
      <div
        style={{
          background: '#0f172a',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          color: '#60a5fa',
          fontSize: '0.92rem'
        }}
      >
        💡 <strong>HikariCP Event:</strong> {currentStep?.description || 'Pool ready.'}
      </div>

      {/* Grid: Pooled Connections vs Wait Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* HikariCP Connection Slots */}
        <div className="viz-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔌 HikariCP Pooled DB Connections</span>
            <span>Max: {state.maxPoolSize}</span>
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            {state.connections.map(conn => {
              const inUse = conn.status === 'IN_USE'
              return (
                <div
                  key={conn.id}
                  style={{
                    background: inUse ? 'rgba(59, 130, 246, 0.2)' : '#020617',
                    border: '1px solid',
                    borderColor: inUse ? '#3b82f6' : 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justify: 'space-between'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#f8fafc' }}>{conn.id}</strong>
                    <span
                      style={{
                        fontSize: '0.7rem',
                        fontWeight: 'bold',
                        padding: '0.15rem 0.4rem',
                        borderRadius: '4px',
                        background: inUse ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.2)',
                        color: inUse ? '#60a5fa' : '#34d399'
                      }}
                    >
                      {conn.status}
                    </span>
                  </div>

                  <div style={{ marginTop: '0.5rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                    {inUse ? `Leased to: ${conn.borrowedBy}` : 'Ready for queries'}
                  </div>

                  {inUse && (
                    <button
                      onClick={() => handleReturn(conn.id)}
                      className="btn btn-secondary"
                      style={{ marginTop: '0.5rem', fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
                    >
                      ↩ Return Connection
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Wait Queue */}
        <div className="viz-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#fbbf24', display: 'flex', justifyContent: 'space-between' }}>
            <span>⏳ Request Thread FIFO Wait Queue</span>
            <span>Waiting: {state.waitQueue.length}</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.waitQueue.map((thread, idx) => (
              <div
                key={idx}
                style={{
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid #f59e0b',
                  borderRadius: '6px',
                  padding: '0.5rem 0.75rem',
                  fontSize: '0.85rem',
                  display: 'flex',
                  justify: 'space-between',
                  alignItems: 'center'
                }}
              >
                <strong style={{ color: '#f8fafc' }}>#{idx + 1} {thread}</strong>
                <span style={{ fontSize: '0.7rem', color: '#fbbf24' }}>Blocked (Awaiting Connection)</span>
              </div>
            ))}
            {state.waitQueue.length === 0 && (
              <span style={{ fontSize: '0.85rem', color: '#64748b' }}>No queued threads. All requests served instantly.</span>
            )}
          </div>
        </div>
      </div>

      {/* State Metrics */}
      <StateInspector
        title="HikariCP Pool Metrics"
        data={{
          maxPoolSize: state.maxPoolSize,
          activeConnections: `${state.connections.filter(c => c.status === 'IN_USE').length} / ${state.maxPoolSize}`,
          availableConnections: state.connections.filter(c => c.status === 'AVAILABLE').length,
          queuedThreads: state.waitQueue.length
        }}
      />
    </div>
  )

  const conceptData = springJpaData.connectionPool

  return (
    <ConceptModuleShell
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      simulationComponent={simulationView}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    />
  )
}
