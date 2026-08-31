import React, { useState, useEffect } from 'react'
import { VirtualThreadsEngine } from '../../../utils/simulationEngines/virtualThreadsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import concData from '../../../data/concurrency-concepts.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

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
    if (isPlaying && steps.length > 0 && !prefersReducedMotion()) {
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
          background: 'var(--bg-surface)',
          border: '1px solid var(--state-info)',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          color: 'var(--state-info)',
          fontSize: '0.92rem'
        }}
      >
        💡 <strong>Loom Engine Action:</strong> {currentStep?.description || 'Virtual threads ready.'}
      </div>

      {/* Grid Display: Carrier OS Threads vs Virtual Threads Queue */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* ForkJoinPool Carrier OS Threads */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--cat-base)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--cat-hover)', display: 'flex', justifyContent: 'space-between' }}>
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
                    background: mounted ? 'var(--cat-tint)' : 'var(--bg-inset)',
                    border: '1px solid',
                    borderColor: mounted ? 'var(--cat-base)' : 'var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.75rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)', display: 'block' }}>{carrier.id}</strong>
                    <span style={{ fontSize: '0.75rem', color: mounted ? 'var(--cat-base)' : 'var(--text-muted)' }}>
                      Status: {carrier.status}
                    </span>
                  </div>

                  <div>
                    {mounted ? (
                      <span className="header-pill" style={{ background: 'var(--cat-border)', fontSize: '0.85rem' }}>
                        🔗 Mounted: {mounted.id}
                      </span>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: 'var(--state-success)', background: 'var(--state-success-tint)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
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
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-success)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-success)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌀 User-Mode Virtual Threads</span>
            <span>Total: {state.virtualThreads.length}</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '280px', overflowY: 'auto' }}>
            {state.virtualThreads.map(vt => {
              let statusColor = 'var(--text-secondary)'
              let bg = 'var(--bg-raised)'
              if (vt.status === 'MOUNTED') { statusColor = 'var(--cat-base)'; bg = 'var(--cat-tint)' }
              if (vt.status === 'PARKED_IO') { statusColor = 'var(--state-warning)'; bg = 'var(--state-warning-tint)' }
              if (vt.status === 'RUNNABLE') { statusColor = 'var(--state-success)'; bg = 'var(--state-success-tint)' }

              return (
                <div
                  key={vt.id}
                  style={{
                    background: bg,
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.5rem 0.75rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.85rem' }}>{vt.id}</strong>
                    <span style={{ color: statusColor, fontSize: '0.75rem', marginLeft: '0.5rem', fontWeight: 600 }}>
                      [{vt.status}]
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.3rem' }}>
                    {vt.status === 'MOUNTED' && (
                      <button
                        onClick={() => handleTriggerIO(vt.id)}
                        className="btn btn-secondary"
                        style={{ fontSize: '0.7rem', padding: '0.15rem 0.4rem', borderColor: 'var(--state-warning)', color: 'var(--state-warning)' }}
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
