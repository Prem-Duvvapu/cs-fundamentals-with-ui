import React, { useState, useEffect } from 'react'
import { SpringBatchEngine } from '../../../utils/simulationEngines/springBatchEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import batchData from '../../../data/batch-concepts.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

export default function SpringBatchVisualizer() {
  const [engine] = useState(() => new SpringBatchEngine(3))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  useEffect(() => {
    const s = engine.processNextChunk()
    setSteps(s)
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

  const handleNextChunk = () => {
    const s = engine.processNextChunk()
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
          <button onClick={handleNextChunk} className="btn btn-primary">
            📦 Process Chunk of {state.chunkSize} Items
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

      {/* Action Banner */}
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
        💡 <strong>Batch Chunk Engine:</strong> {currentStep?.description || 'Batch step ready.'}
      </div>

      {/* Grid: Reader -> Chunk Buffer -> Writer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Unread Source Data */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--cat-base)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--cat-hover)', display: 'flex', justifyContent: 'space-between' }}>
            <span>📖 ItemReader Source Queue</span>
            <span>Unread: {state.unreadItems.length}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.unreadItems.map(item => (
              <span key={item.id} className="header-pill" style={{ background: 'var(--cat-border)', fontSize: '0.8rem' }}>
                {item.name}
              </span>
            ))}
            {state.unreadItems.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Source queue empty.</span>}
          </div>
        </div>

        {/* Current Active Chunk Buffer */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-warning)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-warning)', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚙️ In-Memory Chunk Buffer</span>
            <span>Limit: {state.chunkSize}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.chunkBuffer.map(item => (
              <span key={item.id} className="header-pill" style={{ background: 'var(--state-warning-border)', fontSize: '0.85rem' }}>
                {item.name} [{item.status}]
              </span>
            ))}
            {state.chunkBuffer.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Buffer empty (waiting for next chunk).</span>}
          </div>
        </div>

        {/* Committed Database Records */}
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-success)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-success)', display: 'flex', justifyContent: 'space-between' }}>
            <span>💾 Committed DB Records</span>
            <span>Total: {state.committedItems.length}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.committedItems.map(item => (
              <span key={item.id} className="header-pill" style={{ background: 'var(--state-success-border)', fontSize: '0.8rem' }}>
                {item.name}
              </span>
            ))}
            {state.committedItems.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>No commits yet.</span>}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <StateInspector
        title="Spring Batch Step Metrics (`BATCH_STEP_EXECUTION`)"
        data={{
          chunkSize: state.chunkSize,
          committedTransactions: state.transactionCount,
          totalCommittedItems: state.committedItems.length,
          remainingItems: state.unreadItems.length
        }}
      />
    </div>
  )

  const conceptData = batchData.springBatch

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
