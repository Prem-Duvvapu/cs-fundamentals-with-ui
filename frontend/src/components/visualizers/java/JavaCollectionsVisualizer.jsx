import React, { useState, useEffect } from 'react'
import { JavaCollectionsEngine } from '../../../utils/simulationEngines/javaCollectionsEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import collectionsData from '../../../data/java-fundamentals-collections.json'

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
              Java Collections & Min-Heap PriorityQueue Engine
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

      {/* DUAL PANELS: ARRAYLIST VS MIN-HEAP */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* ARRAYLIST SLOTS PANEL */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(56,189,248,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📊 ArrayList Memory Layout</span>
            <span style={{ fontSize: '0.72rem', color: '#4ade80' }}>
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
                    background: val ? 'rgba(56,189,248,0.15)' : '#020617',
                    border: val ? '1px solid #38bdf8' : '1px dashed #334155',
                    borderRadius: '6px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontFamily: 'monospace'
                  }}
                >
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>[{idx}]</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: val ? '#f8fafc' : '#475569' }}>
                    {val || 'null'}
                  </span>
                </div>
              )
            })}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
            Contiguous memory array with O(1) random index access: elementData[index]
          </div>
        </div>

        {/* PRIORITYQUEUE MIN-HEAP PANEL */}
        <div style={{ background: '#0b1329', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(16,185,129,0.3)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: '#34d399', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>🌲 PriorityQueue Min-Heap Array</span>
            <span style={{ fontSize: '0.72rem', color: '#fbbf24' }}>Root: index 0 (Min)</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
            {state.minHeapState.map((val, idx) => (
              <div
                key={idx}
                style={{
                  padding: '0.3rem 0.6rem',
                  background: idx === 0 ? '#065f46' : '#020617',
                  border: idx === 0 ? '1px solid #34d399' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  fontFamily: 'monospace',
                  fontSize: '0.8rem',
                  textAlign: 'center'
                }}
              >
                <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>[{idx}]</div>
                <div style={{ fontWeight: 700, color: idx === 0 ? '#a7f3d0' : '#f8fafc' }}>{val}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.5rem' }}>
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
