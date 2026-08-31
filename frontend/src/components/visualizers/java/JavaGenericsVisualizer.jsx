import React, { useState, useEffect } from 'react'
import { JavaGenericsEngine } from '../../../utils/simulationEngines/javaGenericsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import genericsData from '../../../data/java-fundamentals-generics.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

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
          background: 'linear-gradient(135deg, var(--bg-code) 0%, var(--bg-code) 100%)',
          border: '1px solid var(--state-info-border)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--state-danger)', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--state-warning)', display: 'inline-block' }} />
            <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: 'var(--state-success)', display: 'inline-block' }} />
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginLeft: '0.4rem', fontFamily: 'monospace' }}>
              Java Generics & PECS Wildcard Type Engine
            </span>
          </div>
          <span className="header-pill" style={{ background: 'var(--cat-tint)', color: 'var(--text-secondary)', fontSize: '0.75rem' }}>
            Step {currentStep ? currentStep.stepNumber : 0} of {steps.length}
          </span>
        </div>

        <div style={{ fontFamily: 'monospace', fontSize: '0.9rem', color: 'var(--state-info)', marginTop: '0.4rem' }}>
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
            background: 'color-mix(in srgb, var(--bg-page) 90%, transparent)',
            borderLeft: '4px solid var(--cat-base)'
          }}
        >
          <h4 style={{ margin: '0 0 0.35rem', color: 'var(--cat-base)', fontSize: '1rem' }}>
            {currentStep.title}
          </h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 0.5rem' }}>
            {currentStep.description}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--state-info)', fontFamily: 'monospace', background: 'var(--bg-code)', padding: '0.35rem 0.6rem', borderRadius: '4px' }}>
            {currentStep.artifact}
          </div>
        </div>
      )}

      {/* DUAL PECS PANEL GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* PRODUCER EXTENDS PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-info-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-info)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📤 Producer Extends (? extends T)</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--state-success)' }}>READ-ONLY</span>
          </h4>

          <div style={{ background: 'var(--bg-code)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Wildcard: {state.producerList.wildcard}</div>
            <div style={{ display: 'flex', gap: '0.5rem', margin: '0.4rem 0' }}>
              <span className="header-pill" style={{ background: 'var(--state-success-border)', color: 'var(--state-success)' }}>
                get() ➔ Returns {state.producerList.readType}
              </span>
              <span className="header-pill" style={{ background: 'var(--state-danger-tint)', color: 'var(--state-danger)' }}>
                add() ➔ BLOCKED
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Safe to produce/read because every element is guaranteed to be at least an Animal.
            </div>
          </div>
        </div>

        {/* CONSUMER SUPER PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-warning-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-warning)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📥 Consumer Super (? super T)</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--state-warning)' }}>WRITE-SAFE</span>
          </h4>

          <div style={{ background: 'var(--bg-code)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Wildcard: {state.consumerList.wildcard}</div>
            <div style={{ display: 'flex', gap: '0.5rem', margin: '0.4rem 0' }}>
              <span className="header-pill" style={{ background: 'var(--state-success-border)', color: 'var(--state-success)' }}>
                add({state.consumerList.writeType}) ➔ ALLOWED
              </span>
              <span className="header-pill" style={{ background: 'var(--cat-tint)', color: 'var(--text-secondary)' }}>
                get() ➔ Returns Object
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.3rem' }}>
              Safe to consume/write because the underlying list holds some supertype of Dog.
            </div>
          </div>
        </div>
      </div>

      {/* BYTECODE TYPE ERASURE & BRIDGE METHOD INSPECTOR */}
      {state.typeErasureArtifact && (
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--cat-border)', marginBottom: '1rem' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--cat-base)', fontSize: '0.92rem' }}>
            🔍 Bytecode Type Erasure & Synthetic Bridge Method Inspector
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            <div style={{ background: 'var(--bg-inset)', padding: '0.5rem', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>SOURCE CODE (Java 5+):</div>
              <div style={{ color: 'var(--state-info)', marginTop: '0.2rem' }}>{state.typeErasureArtifact.sourceSignature}</div>
            </div>
            <div style={{ background: 'var(--bg-inset)', padding: '0.5rem', borderRadius: '6px' }}>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem' }}>BYTECODE AFTER ERASURE:</div>
              <div style={{ color: 'var(--state-success)', marginTop: '0.2rem' }}>{state.typeErasureArtifact.bytecodeSignature}</div>
            </div>
          </div>
          <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: 'var(--state-warning)', fontFamily: 'monospace' }}>
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
