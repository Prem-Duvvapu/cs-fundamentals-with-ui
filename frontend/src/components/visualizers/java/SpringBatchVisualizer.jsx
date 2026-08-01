import React, { useState, useEffect } from 'react'
import { SpringBatchEngine } from '../../../utils/simulationEngines/springBatchEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import batchData from '../../../data/batch-concepts.json'

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
          background: '#0f172a',
          border: '1px solid #3b82f6',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          color: '#60a5fa',
          fontSize: '0.92rem'
        }}
      >
        💡 <strong>Batch Chunk Engine:</strong> {currentStep?.description || 'Batch step ready.'}
      </div>

      {/* Grid: Reader -> Chunk Buffer -> Writer */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Unread Source Data */}
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc', display: 'flex', justifyContent: 'space-between' }}>
            <span>📖 ItemReader Source Queue</span>
            <span>Unread: {state.unreadItems.length}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.unreadItems.map(item => (
              <span key={item.id} className="header-pill" style={{ background: '#7c3aed', fontSize: '0.8rem' }}>
                {item.name}
              </span>
            ))}
            {state.unreadItems.length === 0 && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Source queue empty.</span>}
          </div>
        </div>

        {/* Current Active Chunk Buffer */}
        <div className="viz-card" style={{ borderLeft: '4px solid #f59e0b' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#fbbf24', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚙️ In-Memory Chunk Buffer</span>
            <span>Limit: {state.chunkSize}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.chunkBuffer.map(item => (
              <span key={item.id} className="header-pill" style={{ background: '#d97706', fontSize: '0.85rem' }}>
                {item.name} [{item.status}]
              </span>
            ))}
            {state.chunkBuffer.length === 0 && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>Buffer empty (waiting for next chunk).</span>}
          </div>
        </div>

        {/* Committed Database Records */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
            <span>💾 Committed DB Records</span>
            <span>Total: {state.committedItems.length}</span>
          </h4>

          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {state.committedItems.map(item => (
              <span key={item.id} className="header-pill" style={{ background: '#059669', fontSize: '0.8rem' }}>
                {item.name}
              </span>
            ))}
            {state.committedItems.length === 0 && <span style={{ color: '#64748b', fontSize: '0.8rem' }}>No commits yet.</span>}
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
