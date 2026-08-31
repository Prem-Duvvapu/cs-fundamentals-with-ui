import React, { useState, useEffect } from 'react'
import { JavaStreamsOptionalEngine } from '../../../utils/simulationEngines/javaStreamsOptionalEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import streamsData from '../../../data/java-fundamentals-streams.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

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
              Java Streams & Optional Monadic Pipeline Engine
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

      {/* STREAM PIPELINE VERTICAL FUSION PANEL */}
      <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-info-border)', marginBottom: '1rem' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-info)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>🌊 Stream Pipeline Vertical Loop Fusion</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--state-success)' }}>
            Output: {state.terminalResult ? JSON.stringify(state.terminalResult) : 'Lazy (Pending Trigger)'}
          </span>
        </h4>

        {state.processedItems.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.5rem', marginTop: '0.75rem' }}>
            {state.processedItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  background: item.includedInOutput ? 'var(--state-success-tint)' : 'var(--bg-raised)',
                  border: item.includedInOutput ? '1px solid var(--state-success)' : '1px solid var(--text-muted)',
                  borderRadius: '6px',
                  padding: '0.5rem',
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ color: 'var(--text-secondary)' }}>Input: <strong>{item.item}</strong></div>
                <div style={{ color: item.passedFilter ? 'var(--state-success)' : 'var(--state-danger)', margin: '0.2rem 0' }}>
                  filter: {item.passedFilter ? 'PASS' : 'DROP'}
                </div>
                {item.mappedValue !== null && (
                  <div style={{ color: 'var(--state-warning)', fontWeight: 700 }}>
                    map ➔ {item.mappedValue}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-inset)', borderRadius: '6px' }}>
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
