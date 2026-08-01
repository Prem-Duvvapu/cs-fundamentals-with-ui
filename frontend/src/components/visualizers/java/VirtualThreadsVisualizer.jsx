import React, { useState, useEffect } from 'react'
import { VirtualThreadsEngine } from '../../../utils/simulationEngines/virtualThreadsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import concData from '../../../data/concurrency-concepts.json'

export default function VirtualThreadsVisualizer() {
  const [engine] = useState(() => new VirtualThreadsEngine(2))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1100)

  useEffect(() => {
    const initialSteps = engine.spawnVirtualThreads(4)
    setSteps(initialSteps)
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

  const handleSpawn = () => {
    const spawnSteps = engine.spawnVirtualThreads(3)
    setSteps(spawnSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleTriggerIO = (vtId) => {
    const ioSteps = engine.triggerIO(vtId)
    setSteps(ioSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleCompleteIO = (vtId) => {
    const doneSteps = engine.completeIO(vtId)
    setSteps(doneSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  const simulationView = (
    <div className="visualizer-container">
      {/* Control Card */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button onClick={handleSpawn} className="btn btn-primary">
            ⚡ Spawn 3 Virtual Threads
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
        💡 <strong>Loom Engine Action:</strong> {currentStep?.description || 'Virtual threads ready.'}
      </div>

      {/* Grid Display: Carrier OS Threads vs Virtual Threads Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* ForkJoinPool Carrier OS Threads */}
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc', display: 'flex', justifyContent: 'space-between' }}>
            <span>🖥 Carrier OS Threads (1:1 Kernel Threads)</span>
            <span>Count: {state.carriers.length}</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {state.carriers.map((carrier, idx) => {
              const mounted = carrier.mountedVThread
              return (
                <div
                  key={idx}
                  style={{
                    background: mounted ? 'rgba(167, 139, 250, 0.15)' : '#020617',
                    border: '1px solid',
                    borderColor: mounted ? '#a78bfa' : 'rgba(255,255,255,0.08)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: '#f8fafc', display: 'block' }}>{carrier.id}</strong>
                    <span style={{ fontSize: '0.75rem', color: mounted ? '#a78bfa' : '#64748b' }}>
                      Status: {carrier.status}
                    </span>
                  </div>

                  <div>
                    {mounted ? (
                      <span className="header-pill" style={{ background: '#7c3aed', fontSize: '0.85rem' }}>
                        🔗 Mounted: {mounted.id}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#10b981', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                        FREE (Idle)
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Virtual Threads List */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌀 User-Mode Virtual Threads</span>
            <span>Total: {state.virtualThreads.length}</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
            {state.virtualThreads.map(vt => {
              let statusColor = '#94a3b8'
              let bg = 'rgba(255,255,255,0.03)'
              if (vt.status === 'MOUNTED') { statusColor = '#a78bfa'; bg = 'rgba(167, 139, 250, 0.2)' }
              if (vt.status === 'PARKED_IO') { statusColor = '#f59e0b'; bg = 'rgba(245, 158, 11, 0.2)' }
              if (vt.status === 'RUNNABLE') { statusColor = '#10b981'; bg = 'rgba(16, 185, 129, 0.15)' }

              return (
                <div
                  key={vt.id}
                  style={{
                    background: bg,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: '#f8fafc', fontSize: '0.85rem' }}>{vt.id}</strong>
                    <span style={{ color: statusColor, fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 600 }}>
                      [{vt.status}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {vt.status === 'MOUNTED' && (
                      <button
                        onClick={() => handleTriggerIO(vt.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderColor: '#f59e0b', color: '#fbbf24' }}
                      >
                        🌐 Trigger Blocking I/O
                      </button>
                    )}
                    {vt.status === 'PARKED_IO' && (
                      <button
                        onClick={() => handleCompleteIO(vt.id)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem' }}
                      >
                        ✅ Complete I/O
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <StateInspector
        title="Project Loom Scheduler State"
        data={{
          carrierOsThreads: state.carriers.length,
          totalVirtualThreads: state.virtualThreads.length,
          mountedRunning: state.virtualThreads.filter(t => t.status === 'MOUNTED').length,
          parkedOnIO: state.virtualThreads.filter(t => t.status === 'PARKED_IO').length,
          runnableWaiting: state.virtualThreads.filter(t => t.status === 'RUNNABLE').length
        }}
      />
    </div>
  )

  const conceptData = concData.virtualThreads

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
