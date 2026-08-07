import React, { useState, useEffect } from 'react'
import { JavaMemoryModelEngine } from '../../../utils/simulationEngines/javaMemoryModelEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import memoryData from '../../../data/java-fundamentals-memory.json'

export default function JavaMemoryModelVisualizer() {
  const [engine] = useState(() => new JavaMemoryModelEngine())
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
      {/* Playback Controls */}
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
        style={{
          background: '#020617',
          border: '1px solid #1e293b',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          fontFamily: 'monospace',
          color: '#38bdf8',
          fontSize: '0.9rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <span style={{ color: '#4ade80' }}>java@thread-stack:~$</span>{' '}
          <strong style={{ color: '#f8fafc' }}>{currentStep?.command}</strong>
        </div>
        <span className="header-pill" style={{ background: '#1e293b', color: '#fbbf24', fontSize: '0.78rem' }}>
          Artifact: {currentStep?.artifact}
        </span>
      </div>

      {/* Action Description */}
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
        💡 <strong>Step {currentStep?.stepNumber}: {currentStep?.title}:</strong> {currentStep?.description}
      </div>

      {/* Navigation Buttons for Step Window */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
          disabled={currentStepIdx === 0}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>◀</span>
          <span>Previous Memory State</span>
        </button>

        <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>
          Step {currentStepIdx + 1} of {steps.length} — {currentStep?.stage}
        </span>

        <button
          onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStepIdx >= steps.length - 1}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>Next Memory State</span>
          <span>▶</span>
        </button>
      </div>

      {/* Dual Pane Memory Layout: Thread Stack vs Heap Memory */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Thread Stack Area */}
        <div className="viz-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', display: 'flex', justifyContent: 'space-between' }}>
            <span>📚 Thread Call Stack (LIFO Frames)</span>
            <span>Frames: {state.stackFrames.length}</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {state.stackFrames.map((frame, fIdx) => (
              <div
                key={fIdx}
                style={{
                  background: fIdx === 0 ? '#1e293b' : '#0f172a',
                  border: fIdx === 0 ? '2px solid #3b82f6' : '1px solid #334155',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}
              >
                <div style={{ color: '#38bdf8', fontWeight: 'bold', fontSize: '0.88rem', marginBottom: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                  <span>{fIdx === 0 ? '👉 ACTIVE FRAME: ' : ''}{frame.name}</span>
                  {fIdx === 0 && <span className="header-pill" style={{ background: '#2563eb', fontSize: '0.7rem' }}>Top of Stack</span>}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                  {frame.variables.map((v, vIdx) => (
                    <div
                      key={vIdx}
                      style={{
                        background: '#020617',
                        padding: '0.4rem 0.6rem',
                        borderRadius: '4px',
                        display: 'flex',
                        justify: 'space-between',
                        fontSize: '0.8rem',
                        border: '1px solid #1e293b'
                      }}
                    >
                      <div>
                        <span style={{ color: '#f8fafc', fontWeight: 600 }}>{v.name}</span>{' '}
                        <span style={{ color: '#94a3b8', fontSize: '0.72rem' }}>({v.type})</span>
                      </div>
                      <span
                        style={{
                          color: v.value.includes('Pointer') ? '#a78bfa' : v.value === 'null' ? '#f43f5e' : '#4ade80',
                          fontWeight: 'bold',
                          fontFamily: 'monospace'
                        }}
                      >
                        {v.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Heap Memory Area */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
            <span>🧠 Heap Memory Space (Shared Objects)</span>
            <span>Objects: {state.heapObjects.length}</span>
          </h4>

          {state.heapObjects.length === 0 ? (
            <div style={{ background: '#020617', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              Heap is empty. No objects allocated yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {state.heapObjects.map((obj, oIdx) => {
                const isUnreachable = obj.status.includes('UNREACHABLE')
                return (
                  <div
                    key={oIdx}
                    style={{
                      background: isUnreachable ? 'rgba(244,63,94,0.1)' : '#020617',
                      border: isUnreachable ? '2px dashed #f43f5e' : '2px solid #059669',
                      borderRadius: '8px',
                      padding: '0.75rem'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem' }}>
                      <span style={{ color: '#a78bfa', fontWeight: 'bold', fontFamily: 'monospace' }}>
                        @{obj.address} ({obj.className} Instance)
                      </span>
                      <span
                        className="header-pill"
                        style={{ background: isUnreachable ? '#e11d48' : '#059669', fontSize: '0.72rem' }}
                      >
                        {obj.status}
                      </span>
                    </div>

                    <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '6px' }}>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '0.25rem', fontWeight: 600 }}>Field Values:</div>
                      {Object.entries(obj.fields).map(([k, v]) => (
                        <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', fontFamily: 'monospace', padding: '0.15rem 0' }}>
                          <span style={{ color: '#38bdf8' }}>this.{k}</span>
                          <strong style={{ color: '#f8fafc' }}>{String(v)}</strong>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Execution Log & Metrics Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc' }}>📝 Memory Execution Console Log</h4>
          <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.75rem', color: '#a7f3d0', fontFamily: 'monospace', fontSize: '0.8rem', minHeight: '80px' }}>
            {state.consoleOutput.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.25rem' }}>{line}</div>
            ))}
          </div>
        </div>

        <StateInspector
          title="Memory Allocation Telemetry"
          data={{
            activeStackFrames: state.stackFrames.length,
            currentTopFrame: state.stackFrames[0]?.name || 'N/A',
            heapObjectCount: state.heapObjects.length,
            unreachableGcCandidates: state.heapObjects.filter(o => o.status.includes('UNREACHABLE')).length
          }}
        />
      </div>
    </div>
  )

  const conceptData = memoryData.javaMemory

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
