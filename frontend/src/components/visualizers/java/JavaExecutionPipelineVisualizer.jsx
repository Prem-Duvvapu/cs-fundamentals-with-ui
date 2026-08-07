import React, { useState, useEffect } from 'react'
import { JavaExecutionEngine } from '../../../utils/simulationEngines/javaExecutionEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import CodePanel from '../../shared/CodePanel'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import executionData from '../../../data/java-fundamentals-execution.json'

export default function JavaExecutionPipelineVisualizer() {
  const [engine] = useState(() => new JavaExecutionEngine())
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1200)

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
        💡 <strong>{currentStep?.title || 'Execution Stage'}:</strong> {currentStep?.description}
      </div>

      {/* Grid: Source -> Bytecode -> ClassLoaders -> Execution */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Source Code */}
        <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'SOURCE' ? '4px solid #3b82f6' : '4px solid #334155' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa' }}>📄 1. Java Source Code (`Main.java`)</h4>
          <CodePanel code={state.sourceCode} language="java" />
        </div>

        {/* Bytecode */}
        <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'COMPILATION' ? '4px solid #10b981' : '4px solid #334155' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399' }}>⚙️ 2. JVM Bytecode (`Main.class`)</h4>
          <div style={{ background: '#020617', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', color: '#a7f3d0' }}>
            {state.bytecode.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.2rem' }}>{line}</div>
            ))}
          </div>
        </div>

        {/* ClassLoader Parent Delegation Hierarchy */}
        <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'CLASSLOADER' ? '4px solid #f59e0b' : '4px solid #334155' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#fbbf24' }}>🌳 3. ClassLoader Parent Delegation</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {state.classLoaders.map((cl, idx) => (
              <div key={idx} style={{ background: '#1e293b', border: '1px solid #475569', borderRadius: '6px', padding: '0.5rem 0.75rem', display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                <span style={{ fontWeight: 'bold', color: '#f8fafc' }}>{cl.name}</span>
                <span className="header-pill" style={{ background: cl.level === 1 ? '#059669' : cl.level === 2 ? '#d97706' : '#2563eb', fontSize: '0.75rem' }}>
                  {cl.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Output & State Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc' }}>🖥️ JVM Console Output</h4>
          <div style={{ background: '#090d16', border: '1px solid #1e293b', borderRadius: '6px', padding: '1rem', color: '#4ade80', fontFamily: 'monospace', minHeight: '60px' }}>
            {state.output || '> JVM Initializing...'}
          </div>
        </div>

        <StateInspector
          title="JVM Execution Engine Metrics"
          data={{
            stage: currentStep?.stage || 'IDLE',
            jitCompiled: state.isJitCompiled ? 'YES (Native Code)' : 'NO (Interpreted)',
            hotspotCallCounter: state.hotspotCount,
            executionMode: state.isJitCompiled ? 'JIT Tier 4 (C2 Server Compiler)' : 'Tier 0 Interpreter'
          }}
        />
      </div>
    </div>
  )

  const conceptData = executionData.javaExecution

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
