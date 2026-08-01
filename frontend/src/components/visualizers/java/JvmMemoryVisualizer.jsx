import React, { useState, useEffect } from 'react'
import { JvmMemoryEngine } from '../../../utils/simulationEngines/jvmEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import javaData from '../../../data/java-concepts.json'

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

          <button onClick={handleTriggerGC} className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#f87171' }}>
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
          background: '#0f172a',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          color: '#60a5fa',
          fontSize: '0.92rem'
        }}
      >
        💡 <strong>JVM Event:</strong> {currentStep?.description || 'Ready for allocations.'}
      </div>

      {/* Heap Memory Visual Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Young Gen: Eden */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
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
                    borderColor: obj ? '#10b981' : 'rgba(255,255,255,0.08)',
                    background: obj ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.02)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    fontSize: '0.75rem'
                  }}
                >
                  {obj ? (
                    <>
                      <strong style={{ color: '#f8fafc' }}>{obj.name}</strong>
                      <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Age: {obj.age}</span>
                    </>
                  ) : (
                    <span style={{ color: '#475569' }}>Empty</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Young Gen: Survivor S0 & S1 */}
        <div className="viz-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#fbbf24', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔄 Survivor Spaces (S0 / S1)</span>
            <span>Active: {state.activeSurvivor === 0 ? 'S0' : 'S1'}</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.75rem' }}>
            <div style={{ background: '#020617', padding: '0.5rem', borderRadius: '6px', border: state.activeSurvivor === 0 ? '1px solid #f59e0b' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.3rem' }}>S0 Space</div>
              {state.s0.map((obj, i) => (
                <div key={i} style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.4rem', borderRadius: '4px', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                  {obj.name} (Age {obj.age})
                </div>
              ))}
              {state.s0.length === 0 && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Empty</span>}
            </div>

            <div style={{ background: '#020617', padding: '0.5rem', borderRadius: '6px', border: state.activeSurvivor === 1 ? '1px solid #f59e0b' : '1px solid transparent' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 'bold', color: '#fbbf24', marginBottom: '0.3rem' }}>S1 Space</div>
              {state.s1.map((obj, i) => (
                <div key={i} style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.2rem 0.4rem', borderRadius: '4px', marginBottom: '0.2rem', fontSize: '0.75rem' }}>
                  {obj.name} (Age {obj.age})
                </div>
              ))}
              {state.s1.length === 0 && <span style={{ fontSize: '0.7rem', color: '#64748b' }}>Empty</span>}
            </div>
          </div>
        </div>

        {/* Old Generation */}
        <div className="viz-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#60a5fa', display: 'flex', justifyContent: 'space-between' }}>
            <span>🏛 Old Generation (Tenured)</span>
            <span>{state.oldGen.length} / {engine.oldCapacity}</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.4rem', marginTop: '0.75rem' }}>
            {state.oldGen.map((obj, idx) => (
              <div key={idx} style={{ background: 'rgba(59, 130, 246, 0.25)', border: '1px solid #3b82f6', padding: '0.4rem', borderRadius: '6px', fontSize: '0.75rem', textAlign: 'center' }}>
                <strong style={{ color: '#93c5fd', display: 'block' }}>{obj.name}</strong>
                <span style={{ fontSize: '0.65rem', color: '#cbd5e1' }}>Tenured</span>
              </div>
            ))}
            {state.oldGen.length === 0 && <span style={{ color: '#475569', fontSize: '0.8rem', gridColumn: 'span 4' }}>No long-lived objects.</span>}
          </div>
        </div>
      </div>

      {/* Metaspace Off-Heap Panel */}
      <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem 0', color: '#c084fc' }}>
          💾 Metaspace (Native Off-Heap Class Metadata)
        </h4>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {state.metaspace.map((cls, i) => (
            <span key={i} className="header-pill" style={{ background: '#7c3aed', fontSize: '0.85rem' }}>
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
