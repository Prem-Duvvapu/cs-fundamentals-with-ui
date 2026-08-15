import React, { useState, useEffect } from 'react'
import { JavaStreamsOptionalEngine } from '../../../utils/simulationEngines/javaStreamsOptionalEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import streamsData from '../../../data/java-fundamentals-streams.json'

export default function JavaStreamsOptionalVisualizer() {
  const [engine] = useState(() => new JavaStreamsOptionalEngine())
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
              Java Streams & Optional Monadic Pipeline Engine
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

      {/* STREAM PIPELINE VERTICAL FUSION PANEL */}
      <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>🌊 Stream Pipeline Vertical Loop Fusion</span>
          <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>
            Output: {state.terminalResult ? JSON.stringify(state.terminalResult) : 'Lazy (Pending Trigger)'}
          </span>
        </h4>

        {state.processedItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
            {state.processedItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: item.includedInOutput ? '#064e3b' : '#1e293b',
                  border: item.includedInOutput ? '1px solid #10b981' : '1px solid #475569',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: '#94a3b8' }}>Input: <strong>{item.item}</strong></div>
                <div style={{ color: item.passedFilter ? '#34d399' : '#f87171', margin: '0.2rem 0' }}>
                  filter: {item.passedFilter ? 'PASS' : 'DROP'}
                </div>
                {item.mappedValue !== null && (
                  <div style={{ color: '#fbbf24', fontWeight: 700 }}>
                    map ➔ {item.mappedValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.82rem', background: '#020617', borderRadius: '6px' }}>
            Lazy pipeline constructed: list.stream().filter(n &gt; 10).map(n * 2). Advance to trigger terminal pull.
          </div>
        )}
      </div>

      {/* STATE INSPECTOR */}
      <StateInspector
        state={{
          currentStage: currentStep?.stage || 'INIT',
          stepNumber: currentStep?.stepNumber || 0,
          sourceDataCount: state.sourceData.length,
          outputResult: state.terminalResult || 'PENDING',
          optionalPresent: state.optionalState.isPresent,
          auditLog: state.auditLog
        }}
        title="Java Streams & Optional State Inspector"
      />
    </div>
  )

  return (
    <ConceptModuleShell
      conceptData={streamsData}
      simulationComponent={simulationView}
    />
  )
}
