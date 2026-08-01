import React, { useState, useEffect } from 'react'
import { VirtualMemoryEngine } from '../../../utils/simulationEngines/virtualMemoryEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import osData from '../../../data/os-concepts.json'

export default function VirtualMemoryVisualizer() {
  const [engine] = useState(() => new VirtualMemoryEngine())
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1100)

  const [selectedVpn, setSelectedVpn] = useState(1)

  useEffect(() => {
    const s = engine.translate(1)
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

  const handleTranslate = (vpn) => {
    setSelectedVpn(vpn)
    const s = engine.translate(vpn)
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()
  const highlightVpn = currentStep?.highlightVpn ?? null
  const highlightFrame = currentStep?.highlightFrame ?? null

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Select Virtual Page to Access:</span>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(vpn => (
            <button
              key={vpn}
              onClick={() => handleTranslate(vpn)}
              className={`btn ${selectedVpn === vpn ? 'btn-primary' : 'btn-secondary'}`}
              style={{ fontSize: '0.8rem', padding: '0.3rem 0.6rem' }}
            >
              Page #{vpn} {vpn === 4 || vpn === 6 ? ' (Disk)' : ''}
            </button>
          ))}
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
        💡 <strong>MMU Action:</strong> {currentStep?.description || 'Ready for address translation.'}
      </div>

      {/* Grid: TLB Cache vs Page Table Array vs Physical Frame RAM */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* TLB Cache */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399', display: 'flex', justifyContent: 'space-between' }}>
            <span>⚡ Hardware TLB Cache (4 Slots)</span>
            <span>Fast L1 Lookup</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
            {state.tlb.map((entry, idx) => {
              const isMatch = currentStep?.isHit && entry.vpn === highlightVpn
              return (
                <div
                  key={idx}
                  style={{
                    background: isMatch ? 'rgba(16, 185, 129, 0.25)' : '#020617',
                    border: '1px solid',
                    borderColor: isMatch ? '#10b981' : 'rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justify: 'space-between'
                  }}
                >
                  <span>VPN #{entry.vpn} ➔ Frame #{entry.frame}</span>
                  <span style={{ color: entry.valid ? '#34d399' : '#64748b' }}>{entry.valid ? 'VALID' : 'INVALID'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Page Table Array */}
        <div className="viz-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#60a5fa', display: 'flex', justifyContent: 'space-between' }}>
            <span>📋 Page Table Array (RAM)</span>
            <span>8 Pages</span>
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', maxHeight: '220px', overflowY: 'auto' }}>
            {state.pageTable.map(pt => {
              const isHighlight = pt.vpn === highlightVpn
              return (
                <div
                  key={pt.vpn}
                  style={{
                    background: isHighlight ? 'rgba(59, 130, 246, 0.25)' : '#0f172a',
                    border: '1px solid',
                    borderColor: isHighlight ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    justify: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#f8fafc' }}>Page #{pt.vpn}</span>
                  <span style={{ color: pt.valid ? '#60a5fa' : '#ef4444' }}>
                    {pt.valid ? `Frame #${pt.frame} (Valid)` : 'Disk Swap (Valid=0)'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Physical RAM Frames */}
        <div className="viz-card" style={{ borderLeft: '4px solid #a78bfa' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#c084fc' }}>
            🖥 Physical RAM Frame Output
          </h4>

          <div style={{ background: '#020617', padding: '1rem', borderRadius: '8px', textAlign: 'center' }}>
            {highlightFrame !== null ? (
              <div>
                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Target Physical Memory Frame</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: '#34d399', margin: '0.4rem 0' }}>
                  Frame #{highlightFrame}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#60a5fa' }}>
                  Physical Address: 0x{((highlightFrame << 12) | 0x0A4).toString(16).toUpperCase()}
                </div>
              </div>
            ) : (
              <span style={{ color: '#64748b', fontSize: '0.85rem' }}>No frame selected. Select a page to translate.</span>
            )}
          </div>
        </div>
      </div>

      {/* State Inspector */}
      <StateInspector
        title="MMU Hardware State"
        data={{
          lastTargetPage: `VPN #${selectedVpn}`,
          tlbEntries: state.tlb.length,
          pageTableValidCount: state.pageTable.filter(p => p.valid).length,
          pagesOnDisk: state.pageTable.filter(p => !p.valid).length,
          lastAction: currentStep ? currentStep.action : 'IDLE'
        }}
      />
    </div>
  )

  const conceptData = osData.virtualMemory

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
