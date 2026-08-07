import React, { useState, useEffect } from 'react'
import { JavaOopEngine } from '../../../utils/simulationEngines/javaOopEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import oopData from '../../../data/java-fundamentals-oop.json'

export default function JavaOopVisualizer() {
  const [engine] = useState(() => new JavaOopEngine())
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
          <span style={{ color: '#4ade80' }}>javac@oop-vtable:~$</span>{' '}
          <strong style={{ color: '#f8fafc' }}>{currentStep?.command}</strong>
        </div>
        <span className="header-pill" style={{ background: '#1e293b', color: '#fbbf24', fontSize: '0.78rem' }}>
          Artifact: {currentStep?.artifact}
        </span>
      </div>

      {/* Description */}
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
          <span>Previous Step</span>
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
          <span>Next Step</span>
          <span>▶</span>
        </button>
      </div>

      {/* Main Grid Layout: OOP Hierarchy vs JVM vtable */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Left Column: Inheritance & Access Matrix */}
        <div className="viz-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa' }}>🌳 Inheritance Hierarchy & Access Scope</h4>

          <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '8px', padding: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ color: '#a78bfa', fontWeight: 'bold', fontSize: '0.85rem', marginBottom: '0.3rem' }}>
              abstract class Animal
            </div>
            <div style={{ fontSize: '0.78rem', color: '#cbd5e1', fontFamily: 'monospace' }}>
              • private String id;<br />
              • protected int age;<br />
              • public abstract void makeSound();
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <div
              style={{
                background: state.activePet?.actualType === 'Dog' ? 'rgba(59,130,246,0.15)' : '#020617',
                border: state.activePet?.actualType === 'Dog' ? '2px solid #3b82f6' : '1px solid #1e293b',
                borderRadius: '6px',
                padding: '0.6rem'
              }}
            >
              <strong style={{ color: '#60a5fa', fontSize: '0.82rem' }}>class Dog extends Animal</strong>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                @Override makeSound() ➔ "Woof!"
              </div>
            </div>

            <div
              style={{
                background: state.activePet?.actualType === 'Cat' ? 'rgba(168,85,247,0.15)' : '#020617',
                border: state.activePet?.actualType === 'Cat' ? '2px solid #a855f7' : '1px solid #1e293b',
                borderRadius: '6px',
                padding: '0.6rem'
              }}
            >
              <strong style={{ color: '#c084fc', fontSize: '0.82rem' }}>class Cat extends Animal</strong>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                @Override makeSound() ➔ "Meow!"
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: JVM vtable Slot Inspector */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
            <span>🔍 JVM Metaspace vtable Inspector</span>
            <span>Type: {state.activePet?.actualType || 'N/A'}</span>
          </h4>

          {state.activePet ? (
            <div>
              <div style={{ background: '#020617', padding: '0.5rem 0.75rem', borderRadius: '6px', marginBottom: '0.75rem', fontSize: '0.82rem' }}>
                <span style={{ color: '#94a3b8' }}>Active Pointer:</span>{' '}
                <strong style={{ color: '#38bdf8' }}>{state.activePet.declaredType} {state.activePet.referenceName}</strong> ={' '}
                <strong style={{ color: '#a78bfa' }}>new {state.activePet.actualType}({state.activePet.name}) [{state.activePet.address}]</strong>
              </div>

              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc', marginBottom: '0.35rem' }}>
                {state.activePet.actualType} Class vtable (Virtual Method Array):
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                {(state.activePet.actualType === 'Dog' ? state.vtableDog : state.vtableCat).map((v, idx) => (
                  <div
                    key={idx}
                    style={{
                      background: idx === 0 ? '#1e293b' : '#020617',
                      border: idx === 0 ? '1px solid #10b981' : '1px solid #1e293b',
                      borderRadius: '4px',
                      padding: '0.4rem 0.6rem',
                      display: 'flex',
                      justify: 'space-between',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace'
                    }}
                  >
                    <span style={{ color: '#fbbf24' }}>vtable[{v.slot}] : {v.methodName}</span>
                    <span style={{ color: idx === 0 ? '#4ade80' : '#cbd5e1', fontWeight: idx === 0 ? 'bold' : 'normal' }}>
                      ➔ {v.resolvedTarget}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ background: '#020617', padding: '1.5rem', borderRadius: '8px', textAlign: 'center', color: '#64748b', fontSize: '0.88rem' }}>
              No active polymorphic object instantiated yet.
            </div>
          )}
        </div>
      </div>

      {/* Output Console & Telemetry */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc' }}>🖥️ invokevirtual Dispatch Result</h4>
          <div style={{ background: '#020617', border: '1px solid #1e293b', borderRadius: '6px', padding: '0.85rem', color: '#4ade80', fontFamily: 'monospace', fontSize: '0.85rem', minHeight: '60px' }}>
            {state.dispatchResult || '> Waiting for virtual method call...'}
          </div>
        </div>

        <StateInspector
          title="JVM Dynamic Dispatch Telemetry"
          data={{
            stage: currentStep?.stage || 'IDLE',
            declaredType: state.activePet?.declaredType || 'N/A',
            actualType: state.activePet?.actualType || 'N/A',
            vtableSlotResolved: currentStepIdx >= 4 ? 'Slot #0' : 'N/A',
            dispatchOpcode: 'invokevirtual'
          }}
        />
      </div>
    </div>
  )

  const conceptData = oopData.javaOop

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
