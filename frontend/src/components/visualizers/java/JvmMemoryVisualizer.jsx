import React, { useState, useEffect } from 'react'
import { JvmMemoryEngine } from '../../../utils/simulationEngines/jvmEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import javaData from '../../../data/java-concepts.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

export default function JvmMemoryVisualizer() {
  const [engine] = useState(() => new JvmMemoryEngine(6, 4, 8))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)
  const [customObjName, setCustomObjName] = useState('')

  useEffect(() => {
    // Initial allocation setup
    const initialSteps = engine.allocateObject('UserSession', 128)
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

  const handleAllocate = (e) => {
    if (e) e.preventDefault()
    const name = customObjName.trim() || `User_${Math.floor(Math.random() * 900 + 100)}`
    const newSteps = engine.allocateObject(name, 128, false)
    setSteps(newSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
    setCustomObjName('')
  }

  const handleAllocateLarge = () => {
    const name = `LargePayload_${Math.floor(Math.random() * 90 + 10)}`
    const newSteps = engine.allocateObject(name, 2048, true)
    setSteps(newSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleTriggerGC = () => {
    const gcSteps = engine.triggerMinorGC()
    setSteps(gcSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls Header */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <form onSubmit={handleAllocate} style={{ display: 'flex', gap: '0.4rem', flex: 1, minWidth: '220px' }}>
            <input
              type="text"
              placeholder="Object Name (e.g. OrderDTO)"
              value={customObjName}
              onChange={e => setCustomObjName(e.target.value)}
              className="text-input"
              style={{ flex: 1, padding: '0.4rem 0.75rem' }}
            />
            <button type="submit" className="btn btn-primary">
              + Allocate in Eden
            </button>
          </form>

          <button onClick={handleAllocateLarge} className="btn btn-secondary">
            📦 Allocate Large Object (Direct to Old)
          </button>

          <button onClick={handleTriggerGC} className="btn btn-secondary" style={{ borderColor: 'var(--state-danger)', color: 'var(--state-danger)' }}>
            🧹 Force Minor GC
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

      {/* Live Action Status */}
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
        💡 <strong>JVM Event:</strong> {currentStep?.description || 'Ready for allocations.'}
      </div>

      {/* Heap Memory Visual Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Young Gen: Eden */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-success)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--state-success)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌱 Young Gen: Eden Space</span>
            <span>{state.eden.length} / {engine.edenCapacity}</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', marginTop: '0.75rem' }}>
            {Array.from({ length: engine.edenCapacity }).map((_, idx) => {
              const obj = state.eden[idx]
              return (
                <div
                  key={idx}
                  style={{
                    height: '54px',
                    borderRadius: '6px',
                    border: '1px solid',
                    borderColor: obj ? 'var(--state-success)' : 'var(--border-subtle)',
                    background: obj ? 'var(--state-success-tint)' : 'var(--bg-inset)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem'
                  }}
                >
                  {obj ? (
                    <>
                      <strong style={{ color: 'var(--text-primary)' }}>{obj.name}</strong>
                      <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>Age: {obj.age}</span>
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>Empty</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Young Gen: Survivor S0 & S1 */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-warning)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--state-warning)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔄 Survivor Spaces (S0 / S1)</span>
            <span>Active: {state.activeSurvivor === 0 ? 'S0' : 'S1'}</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ background: 'var(--bg-inset)', padding: '0.5rem', borderRadius: '6px', border: state.activeSurvivor === 0 ? '1px solid var(--state-warning)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--state-warning)', marginBottom: '0.3rem' }}>S0 Space</div>
              {state.s0.map((obj, i) => (
                <div key={i} style={{ background: 'var(--state-warning-tint)', padding: '0.2rem 0.4rem', borderRadius: '4px', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                  {obj.name} (Age {obj.age})
                </div>
              ))}
              {state.s0.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empty</span>}
            </div>

            <div style={{ background: 'var(--bg-inset)', padding: '0.5rem', borderRadius: '6px', border: state.activeSurvivor === 1 ? '1px solid var(--state-warning)' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--state-warning)', marginBottom: '0.3rem' }}>S1 Space</div>
              {state.s1.map((obj, i) => (
                <div key={i} style={{ background: 'var(--state-warning-tint)', padding: '0.2rem 0.4rem', borderRadius: '4px', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                  {obj.name} (Age {obj.age})
                </div>
              ))}
              {state.s1.length === 0 && <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Empty</span>}
            </div>
          </div>
        </div>

        {/* Old Generation */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-info)' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--state-info)', display: 'flex', justifyContent: 'space-between' }}>
            <span>🏛 Old Generation (Tenured)</span>
            <span>{state.oldGen.length} / {engine.oldCapacity}</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.75rem' }}>
            {state.oldGen.map((obj, idx) => (
              <div key={idx} style={{ background: 'var(--state-info-tint)', border: '1px solid var(--state-info)', padding: '0.4rem', borderRadius: '6px', fontSize: '0.75rem', textAlign: 'center' }}>
                <strong style={{ color: 'var(--state-info)', display: 'block' }}>{obj.name}</strong>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Tenured</span>
              </div>
            ))}
            {state.oldGen.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', gridColumn: 'span 4' }}>No long-lived objects.</span>}
          </div>
        </div>
      </div>

      {/* Metaspace Off-Heap Panel */}
      <div className="viz-card" style={{ borderLeft: '4px solid var(--cat-base)', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--cat-hover)' }}>
          💾 Metaspace (Native Off-Heap Class Metadata)
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {state.metaspace.map((cls, i) => (
            <span key={i} className="header-pill" style={{ background: 'var(--cat-border)', fontSize: '0.85rem' }}>
              {cls}
            </span>
          ))}
        </div>
      </div>

      {/* Runtime Metrics */}
      <StateInspector
        title="JVM Runtime Metrics"
        data={{
          minorGcCount: state.gcCount,
          edenSlotsUsed: `${state.eden.length} / ${engine.edenCapacity}`,
          activeSurvivorSpace: state.activeSurvivor === 0 ? 'S0' : 'S1',
          oldGenPromotions: state.oldGen.length,
          metaspaceClasses: state.metaspace.length
        }}
      />
    </div>
  )

  const conceptData = javaData.jvmMemory

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
