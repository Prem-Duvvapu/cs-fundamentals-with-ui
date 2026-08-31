import React, { useState, useEffect } from 'react'
import { JavaCollectionsEngine } from '../../../utils/simulationEngines/javaCollectionsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import collectionsData from '../../../data/java-fundamentals-collections.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

export default function JavaCollectionsVisualizer() {
  const [engine] = useState(() => new JavaCollectionsEngine())
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
              Java Collections & Min-Heap PriorityQueue Engine
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

      {/* DUAL PANELS: ARRAYLIST VS MIN-HEAP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* ARRAYLIST SLOTS PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-info-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-info)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📊 ArrayList Memory Layout</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--state-success)' }}>
              Size: {state.arrayListState.size} / Cap: {state.arrayListState.capacity}
            </span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {Array.from({ length: state.arrayListState.capacity }).map((_, idx) => {
              const val = state.arrayListState.elements[idx]
              return (
                <div
                  key={idx}
                  style={{
                    flex: '1 1 40px',
                    minWidth: '40px',
                    height: '48px',
                    background: val ? 'var(--state-info-tint)' : 'var(--bg-inset)',
                    border: val ? '1px solid var(--state-info)' : '1px dashed var(--border-default)',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>[{idx}]</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: val ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {val || 'null'}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Contiguous memory array with O(1) random index access: elementData[index]
          </div>
        </div>

        {/* PRIORITYQUEUE MIN-HEAP PANEL */}
        <div style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-success-border)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--state-success)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌲 PriorityQueue Min-Heap Array</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--state-warning)' }}>Root: index 0 (Min)</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {state.minHeapState.map((val, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: idx === 0 ? 'var(--state-success-border)' : 'var(--bg-inset)',
                  border: idx === 0 ? '1px solid var(--state-success)' : '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>[{idx}]</div>
                <div style={{ fontWeight: 700, color: idx === 0 ? 'var(--state-success)' : 'var(--text-primary)' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            Complete Binary Tree: parentIndex = (k - 1) &gt;&gt;&gt; 1 • O(log N) siftUp / siftDown
          </div>
        </div>
      </div>

      {/* STATE INSPECTOR */}
      <StateInspector
        state={{
          currentStage: currentStep?.stage || 'INIT',
          stepNumber: currentStep?.stepNumber || 0,
          arrayListCapacity: state.arrayListState.capacity,
          arraySize: state.arrayListState.size,
          heapRootValue: state.minHeapState[0],
          auditLog: state.auditLog
        }}
        title="Java Collections Runtime State Inspector"
      />
    </div>
  )

  return (
    <ConceptModuleShell
      conceptData={collectionsData}
      simulationComponent={simulationView}
    />
  )
}
