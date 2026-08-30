import React, { useState, useEffect } from 'react'
import { JavaStaticFinalRecordsEngine } from '../../../utils/simulationEngines/javaStaticFinalRecordsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import staticRecordsData from '../../../data/java-fundamentals-static-records.json'

export default function JavaStaticRecordsVisualizer() {
  const [engine] = useState(() => new JavaStaticFinalRecordsEngine())
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

      {/* Command Prompt Execution Bar */}
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
              Java Metaspace & Record Execution Simulator
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

      {/* METASPACE STATICS & HEAP ARCHITECTURE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* METASPACE STATIC FIELDS PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--cat-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--cat-base)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>🧠 Metaspace (Class-Level Statics)</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Shared across all instances</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.metaspaceStatics.map((s, idx) => (
              <div key={idx} style={{ background: 'var(--bg-code)', padding: '0.5rem 0.75rem', borderRadius: '6px', border: '1px solid var(--border-subtle)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
                <div style={{ color: 'var(--state-info)', fontWeight: 600 }}>{s.className}</div>
                <div style={{ color: 'var(--state-success)', marginTop: '0.2rem' }}>{s.field}</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Location: {s.address} • Reads: {s.accessCount}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* JAVA 14+ RECORD VALUE SEMANTICS PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-success-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-success)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📦 Java 14+ Record Semantics</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>Value-Based Identity</span>
          </h4>

          {state.recordInstance ? (
            <div style={{ background: 'var(--bg-code)', padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--state-success)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
              <div style={{ color: 'var(--cat-base)', fontWeight: 700 }}>{state.recordInstance.typeName}</div>
              <div style={{ color: 'var(--state-info)', margin: '0.35rem 0', fontSize: '0.75rem' }}>
                Allocated at: {state.recordInstance.address}
              </div>

              <div style={{ background: 'color-mix(in srgb, var(--bg-raised) 70%, transparent)', padding: '0.5rem', borderRadius: '4px', marginTop: '0.4rem' }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', textTransform: 'uppercase' }}>Immutable Record Components:</div>
                <div style={{ color: 'var(--text-primary)', marginTop: '0.2rem' }}>
                  id: <strong style={{ color: 'var(--state-success)' }}>{state.recordInstance.components.id}</strong><br />
                  email: <strong style={{ color: 'var(--state-warning)' }}>{state.recordInstance.components.email}</strong><br />
                  createdAt: <strong style={{ color: 'var(--state-info)' }}>{state.recordInstance.components.createdAt}</strong>
                </div>
              </div>

              <div style={{ marginTop: '0.5rem', fontSize: '0.72rem', color: 'var(--state-success)' }}>
                ✅ Auto-generated: canonical constructor, getters without 'get' prefix, equals(), hashCode(), toString()
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-inset)', borderRadius: '6px' }}>
              Step forward to observe Java 14+ Record instantiation.
            </div>
          )}
        </div>
      </div>

      {/* STATE INSPECTOR AUDIT LOG */}
      <StateInspector
        state={{
          currentStage: currentStep?.stage || 'INIT',
          stepNumber: currentStep?.stepNumber || 0,
          metaspaceStaticCount: state.metaspaceStatics.length,
          heapObjectCount: state.heapObjects.length,
          recordActive: !!state.recordInstance,
          auditLog: state.auditLog
        }}
        title="JVM Runtime State Inspector"
      />
    </div>
  )

  return (
    <ConceptModuleShell
      conceptData={staticRecordsData}
      simulationComponent={simulationView}
    />
  )
}
