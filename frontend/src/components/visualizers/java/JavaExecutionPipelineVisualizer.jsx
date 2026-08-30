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

  const pipelineStages = [
    { id: 'SOURCE', label: '1. Write Code', icon: '📄', cmd: 'cat Main.java' },
    { id: 'COMPILATION', label: '2. javac Compile', icon: '⚙️', cmd: 'javac Main.java' },
    { id: 'CLASSLOADER', label: '3. ClassLoader', icon: '🌳', cmd: 'java Main' },
    { id: 'VERIFIER', label: '4. Verifier & Memory', icon: '🛡️', cmd: 'verifier Main.class' },
    { id: 'EXECUTION', label: '5. JIT Execution', icon: '🔥', cmd: 'java -XX:+JIT Main' }
  ]

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

      {/* Interactive Step Conveyor Belt */}
      <div className="viz-card" style={{ marginBottom: '1rem', background: 'var(--bg-code)', padding: '1rem' }}>
        <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          🔄 Java Execution Conveyor Belt (Click any stage to jump)
        </h4>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', overflowX: 'auto', paddingBottom: '0.25rem' }}>
          {pipelineStages.map((stage, idx) => {
            const isActive = currentStep?.stage === stage.id
            const isPassed = currentStepIdx > idx
            return (
              <React.Fragment key={stage.id}>
                <button
                  onClick={() => { setCurrentStepIdx(idx); setIsPlaying(false); }}
                  style={{
                    background: isActive ? 'var(--state-info-border)' : isPassed ? 'var(--bg-surface)' : 'var(--bg-inset)',
                    border: isActive ? '2px solid var(--state-info)' : isPassed ? '1px solid var(--state-info)' : '1px solid var(--bg-raised)',
                    borderRadius: '8px',
                    padding: '0.6rem 0.85rem',
                    color: isActive ? 'var(--text-primary)' : isPassed ? 'var(--state-info)' : 'var(--text-muted)',
                    fontWeight: isActive ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem',
                    fontSize: '0.85rem',
                    boxShadow: isActive ? '0 0 12px var(--state-info-border)' : 'none',
                    transition: 'background-color var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard), box-shadow var(--dur-base) var(--ease-standard), transform var(--dur-base) var(--ease-standard)'
                  }}
                >
                  <span>{stage.icon}</span>
                  <span>{stage.label}</span>
                </button>
                {idx < pipelineStages.length - 1 && (
                  <span style={{ color: isPassed ? 'var(--state-info)' : 'var(--border-default)', fontWeight: 'bold' }}>➔</span>
                )}
              </React.Fragment>
            )
          })}
        </div>
      </div>

      {/* Command Prompt Simulator */}
      <div
        style={{
          background: 'var(--bg-inset)',
          border: '1px solid var(--bg-raised)',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          fontFamily: 'monospace',
          color: 'var(--state-info)',
          fontSize: '0.9rem',
          display: 'flex',
          justify: 'space-between',
          alignItems: 'center'
        }}
      >
        <div>
          <span style={{ color: 'var(--state-success)' }}>user@jvm-host:~$</span>{' '}
          <strong style={{ color: 'var(--text-primary)' }}>{currentStep?.command}</strong>
        </div>
        <span className="header-pill" style={{ background: 'var(--bg-raised)', color: 'var(--state-warning)', fontSize: '0.78rem' }}>
          Artifact: {currentStep?.artifact}
        </span>
      </div>

      {/* Action Description */}
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
        💡 <strong>{currentStep?.title}:</strong> {currentStep?.description}
      </div>

      {/* Stage Navigation Header with < and > Buttons */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <button
          onClick={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
          disabled={currentStepIdx === 0}
          className="btn btn-secondary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>◀</span>
          <span>Previous Step</span>
        </button>

        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
          Showing Active Window ({currentStepIdx === 0 ? 'Step 1' : `Steps ${currentStepIdx} & ${currentStepIdx + 1}`} of 5)
        </span>

        <button
          onClick={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={currentStepIdx >= steps.length - 1}
          className="btn btn-primary"
          style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
        >
          <span>Next Step</span>
          <span>▶</span>
        </button>
      </div>

      {/* Stage Specific Pipeline Visualizers (Max 2 Cards View Window) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Stage 1: Source Editor */}
        {(currentStepIdx === 0 || currentStepIdx === 1) && (
          <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'SOURCE' ? '4px solid var(--state-info)' : '4px solid var(--border-default)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-info)' }}>📄 1. Source File (`Main.java`)</h4>
            <CodePanel code={state.sourceCode} language="java" />
          </div>
        )}

        {/* Stage 2: Bytecode Output */}
        {(currentStepIdx === 1 || currentStepIdx === 2 || (currentStepIdx === 0 && false)) && (
          <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'COMPILATION' ? '4px solid var(--state-success)' : '4px solid var(--border-default)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-success)' }}>⚙️ 2. javac Bytecode (`Main.class`)</h4>
            <div style={{ background: 'var(--bg-code)', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--state-success)' }}>
              {state.bytecode.map((line, idx) => (
                <div key={idx} style={{ marginBottom: '0.2rem' }}>{line}</div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 3: ClassLoader Delegation Flow */}
        {(currentStepIdx === 2 || currentStepIdx === 3) && (
          <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'CLASSLOADER' ? '4px solid var(--state-warning)' : '4px solid var(--border-default)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-warning)' }}>🌳 3. ClassLoader Parent Delegation Flow</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {state.classLoaders.map((cl, idx) => (
                <div key={idx} style={{ background: 'var(--bg-raised)', border: '1px solid var(--text-muted)', borderRadius: '6px', padding: '0.5rem 0.75rem', fontSize: '0.82rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>{cl.name}</strong>
                    <span className="header-pill" style={{ background: cl.level === 1 ? 'var(--state-success-border)' : cl.level === 2 ? 'var(--state-warning-border)' : 'var(--state-info-border)', fontSize: '0.72rem' }}>
                      {cl.status}
                    </span>
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem', fontFamily: 'monospace' }}>{cl.path}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stage 4: Verifier & Memory */}
        {(currentStepIdx === 3 || currentStepIdx === 4) && (
          <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'VERIFIER' ? '4px solid var(--state-danger)' : '4px solid var(--border-default)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-danger)' }}>🛡️ 4. Bytecode Verifier & Memory</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.82rem' }}>
              <div style={{ background: 'var(--bg-inset)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--bg-raised)', color: 'var(--state-info)' }}>
                🔒 Type Safety Check: <strong>PASSED</strong>
              </div>
              <div style={{ background: 'var(--bg-inset)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--bg-raised)', color: 'var(--state-info)' }}>
                📏 Stack Bounds Check: <strong>PASSED</strong>
              </div>
              <div style={{ background: 'var(--bg-inset)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--bg-raised)', color: 'var(--cat-hover)' }}>
                🧠 Metaspace: Allocated <code>Main.class</code>
              </div>
              <div style={{ background: 'var(--bg-inset)', padding: '0.4rem 0.6rem', borderRadius: '4px', border: '1px solid var(--bg-raised)', color: 'var(--state-success)' }}>
                📚 Thread Stack: Pushed <code>main(String[])</code>
              </div>
            </div>
          </div>
        )}

        {/* Stage 5: Native CPU Assembly */}
        {currentStepIdx === 4 && (
          <div className="viz-card" style={{ borderLeft: currentStep?.stage === 'EXECUTION' ? '4px solid var(--cat-base)' : '4px solid var(--border-default)' }}>
            <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--cat-hover)' }}>🔥 5. JIT Native Machine Code (x86_64)</h4>
            <div style={{ background: 'var(--bg-code)', padding: '0.75rem', borderRadius: '6px', fontFamily: 'monospace', fontSize: '0.82rem', color: 'var(--cat-hover)' }}>
              {state.nativeAssembly.map((line, idx) => (
                <div key={idx} style={{ marginBottom: '0.2rem' }}>{line}</div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Console Output & Metrics Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="viz-card" style={{ borderLeft: '4px solid var(--state-success)' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-success)' }}>🖥️ Execution Console Output</h4>
          <div style={{ background: 'var(--bg-code)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '1rem', color: 'var(--state-success)', fontFamily: 'monospace', minHeight: '65px' }}>
            {state.output || '> JVM Standing by...'}
          </div>
        </div>

        <StateInspector
          title="JVM Execution Engine Metrics"
          data={{
            stage: currentStep?.stage || 'IDLE',
            stepNumber: currentStep?.stepNumber || 1,
            jitCompiled: state.isJitCompiled ? 'YES (Native Machine Code)' : 'NO (Interpreted)',
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
