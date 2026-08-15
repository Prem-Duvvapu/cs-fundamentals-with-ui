import React, { useState, useEffect } from 'react'
import { JavaFunctionalLambdasEngine } from '../../../utils/simulationEngines/javaFunctionalLambdasEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import functionalData from '../../../data/java-fundamentals-functional.json'

export default function JavaFunctionalLambdasVisualizer() {
  const [engine] = useState(() => new JavaFunctionalLambdasEngine())
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

      {/* Command Prompt Simulator */}
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
              Java Lambda & invokedynamic Execution Engine
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

      {/* DUAL ARCHITECTURE GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* SAM FUNCTIONAL INTERFACE CONTRACT */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(139,92,246,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#a78bfa', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📜 Functional Interface SAM Contract</span>
            <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>@FunctionalInterface</span>
          </h4>

          <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)', fontFamily: 'monospace', fontSize: '0.8rem' }}>
            <div style={{ color: '#ec4899', fontWeight: 700 }}>interface Calculator</div>
            <div style={{ color: '#38bdf8', margin: '0.4rem 0', padding: '0.3rem', background: 'rgba(56,189,248,0.1)', borderRadius: '4px' }}>
              ⭐ Abstract Method: <strong>{state.interfaceContract.singleAbstractMethod}</strong>
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
              Default Methods: {state.interfaceContract.defaultMethods.join(', ')}
            </div>
            <div style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '0.2rem' }}>
              Static Methods: {state.interfaceContract.staticMethods.join(', ')}
            </div>
          </div>
        </div>

        {/* INVOKEDYNAMIC CALLSITE PANEL */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#34d399', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚡ JVM invokedynamic & CallSite</span>
            <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>Zero .class on Disk</span>
          </h4>

          {state.invokedynamicCallSite ? (
            <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', border: '1px solid #10b981', fontFamily: 'monospace', fontSize: '0.78rem' }}>
              <div style={{ color: '#f59e0b', fontWeight: 700 }}>{state.invokedynamicCallSite.opcode}</div>
              <div style={{ color: '#38bdf8', margin: '0.3rem 0' }}>
                Bootstrap: {state.invokedynamicCallSite.bootstrapMethod}
              </div>
              <div style={{ color: '#4ade80' }}>
                Linked Target: {state.invokedynamicCallSite.generatedTarget}
              </div>
              <div style={{ color: '#a78bfa', marginTop: '0.4rem', fontSize: '0.72rem' }}>
                {state.invokedynamicCallSite.allocatedOnDisk}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.82rem', background: '#020617', borderRadius: '6px' }}>
              Step forward to observe invokedynamic CallSite bootstrapping.
            </div>
          )}
        </div>
      </div>

      {/* STATE INSPECTOR */}
      <StateInspector
        state={{
          currentStage: currentStep?.stage || 'INIT',
          stepNumber: currentStep?.stepNumber || 0,
          interfaceLoaded: state.interfaceContract.name,
          invokedynamicLinked: !!state.invokedynamicCallSite,
          lambdaOutput: state.lambdaInstance ? `${state.lambdaInstance.result} (in ${state.lambdaInstance.executionTimeNs}ns)` : 'N/A',
          auditLog: state.auditLog
        }}
        title="JVM Lambda & Functional State Inspector"
      />
    </div>
  )

  return (
    <ConceptModuleShell
      conceptData={functionalData}
      simulationComponent={simulationView}
    />
  )
}
