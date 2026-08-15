import React, { useState, useEffect } from 'react'
import { JavaGenericsEngine } from '../../../utils/simulationEngines/javaGenericsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import genericsData from '../../../data/java-fundamentals-generics.json'

export default function JavaGenericsVisualizer() {
  const [engine] = useState(() => new JavaGenericsEngine())
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1500)

  useEffect(() => {
    const s = engine.getExecutionSteps()
    setSteps(s)
  }, [engine])

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

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
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

      {/* Command Execution Bar */}
      <div
        className="viz-card"
        style={{
          marginBottom: '1rem',
          background: 'linear-gradient(135deg, #090d16 0%, #111827 100%)',
          border: '1px solid rgba(59, 130, 246, 0.2)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', marginLeft: '0.4rem', fontFamily: 'monospace' }}>
              Java Generics & PECS Wildcard Type Engine
            </span>
          </div>
          <span className="header-pill" style={{ background: '#312e81', color: '#c7d2fe', fontSize: '0.75rem' }}>
            Step {currentStep ? currentStep.stepNumber : 0} of {steps.length}
          </span>
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: '#38bdf8', marginTop: '0.4rem' }}>
          &gt; {currentStep?.command || 'Initializing...'}
        </div>
      </div>

      {/* Step Navigation Pill Indicator */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.4rem' }}>
          {steps.map((s, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentStepIdx(idx)}
              className={`btn ${currentStepIdx === idx ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
            >
              Step {s.stepNumber}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '0.4rem' }}>
          <button
            onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
            disabled={currentStepIdx === 0}
            className="btn btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
          >
            ◀ Previous
          </button>
          <button
            onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
            disabled={currentStepIdx >= steps.length - 1}
            className="btn btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.3rem 0.7rem' }}
          >
            Next Step ▶
          </button>
        </div>
      </div>

      {/* STAGE DESCRIPTION BANNER */}
      {currentStep && (
        <div
          className="viz-card"
          style={{
            marginBottom: '1rem',
            background: 'rgba(15, 23, 42, 0.9)',
            borderLeft: '4px solid #8b5cf6'
          }}
        >
          <h4 style={{ margin: '0 0 0.35rem', color: '#a78bfa', fontSize: '1rem' }}>
            {currentStep.title}
          </h4>
          <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 0.5rem' }}>
            {currentStep.description}
          </p>
          <div style={{ fontSize: '0.8rem', color: '#38bdf8', fontFamily: 'monospace', background: '#020617', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
            {currentStep.artifact}
          </div>
        </div>
      )}

      {/* DUAL PECS PANEL GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* PRODUCER EXTENDS PANEL */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📤 Producer Extends (? extends T)</span>
            <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>READ-ONLY</span>
          </h4>

          <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ color: '#f8fafc', fontWeight: 600 }}>Wildcard: {state.producerList.wildcard}</div>
            <div style={{ display: 'flex', gap: '0.5rem', margin: '0.4rem 0' }}>
              <span className="header-pill" style={{ background: '#065f46', color: '#a7f3d0' }}>
                get() ➔ Returns {state.producerList.readType}
              </span>
              <span className="header-pill" style={{ background: '#7f1d1d', color: '#fecaca' }}>
                add() ➔ BLOCKED
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
              Safe to produce/read because every element is guaranteed to be at least an Animal.
            </div>
          </div>
        </div>

        {/* CONSUMER SUPER PANEL */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#fbbf24', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📥 Consumer Super (? super T)</span>
            <span style={{ fontSize: '0.72rem', color: '#f59e0b' }}>WRITE-SAFE</span>
          </h4>

          <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ color: '#f8fafc', fontWeight: 600 }}>Wildcard: {state.consumerList.wildcard}</div>
            <div style={{ display: 'flex', gap: '0.5rem', margin: '0.4rem 0' }}>
              <span className="header-pill" style={{ background: '#065f46', color: '#a7f3d0' }}>
                add({state.consumerList.writeType}) ➔ ALLOWED
              </span>
              <span className="header-pill" style={{ background: '#312e81', color: '#c7d2fe' }}>
                get() ➔ Returns Object
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.3rem' }}>
              Safe to consume/write because the underlying list holds some supertype of Dog.
            </div>
          </div>
        </div>
      </div>

      {/* BYTECODE TYPE ERASURE & BRIDGE METHOD INSPECTOR */}
      {state.typeErasureArtifact && (
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#a78bfa', fontSize: '0.92rem' }}>
            🔍 Bytecode Type Erasure & Synthetic Bridge Method Inspector
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            <div style={{ background: '#020617', padding: '0.5rem', borderRadius: '6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>SOURCE CODE (Java 5+):</div>
              <div style={{ color: '#38bdf8', marginTop: '0.2rem' }}>{state.typeErasureArtifact.sourceSignature}</div>
            </div>
            <div style={{ background: '#020617', padding: '0.5rem', borderRadius: '6px' }}>
              <div style={{ color: '#94a3b8', fontSize: '0.7rem' }}>BYTECODE AFTER ERASURE:</div>
              <div style={{ color: '#4ade80', marginTop: '0.2rem' }}>{state.typeErasureArtifact.bytecodeSignature}</div>
            </div>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#fbbf24', fontFamily: 'monospace' }}>
            Injected: {state.typeErasureArtifact.bridgeMethod}
          </div>
        </div>
      )}

      {/* STATE INSPECTOR */}
      <StateInspector
        state={{
          currentStage: currentStep?.stage || 'INIT',
          stepNumber: currentStep?.stepNumber || 0,
          producerExtendsSafe: state.producerList.canRead,
          consumerSuperSafe: state.consumerList.canWrite,
          typeErasureActive: !!state.typeErasureArtifact,
          auditLog: state.auditLog
        }}
        title="Java Generics & PECS State Inspector"
      />
    </div>
  )

  return (
    <ConceptModuleShell
      conceptData={genericsData}
      simulationComponent={simulationView}
    />
  )
}
