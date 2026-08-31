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
      <div className="viz-controls-card bptree-toolbar">
        <div className="vpn-select-row">
          <span className="field-label-strong">Select Virtual Page to Access:</span>
          {[0, 1, 2, 3, 4, 5, 6, 7].map(vpn => (
            <button
              key={vpn}
              onClick={() => handleTranslate(vpn)}
              className={`btn btn-compact ${selectedVpn === vpn ? 'btn-primary' : 'btn-secondary'}`}
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
      <div className="action-banner">
        💡 <strong>MMU Action:</strong> {currentStep?.description || 'Ready for address translation.'}
      </div>

      {/* Grid: TLB Cache vs Page Table Array vs Physical Frame RAM */}
      <div className="vm-grid">
        {/* TLB Cache */}
        <div className="viz-card accent-success">
          <h4 className="vm-card-header is-success">
            <span>⚡ Hardware TLB Cache (4 Slots)</span>
            <span>Fast L1 Lookup</span>
          </h4>

          <div className="vm-row-list">
            {state.tlb.map((entry, idx) => {
              const isMatch = currentStep?.isHit && entry.vpn === highlightVpn
              return (
                <div
                  key={idx}
                  style={{
                    background: isMatch ? 'var(--state-success-tint)' : 'var(--bg-code)',
                    border: '1px solid',
                    borderColor: isMatch ? 'var(--state-success)' : 'var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.8rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>VPN #{entry.vpn} ➔ Frame #{entry.frame}</span>
                  <span style={{ color: entry.valid ? 'var(--state-success)' : 'var(--text-muted)' }}>{entry.valid ? 'VALID' : 'INVALID'}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Page Table Array */}
        <div className="viz-card accent-info">
          <h4 className="vm-card-header is-info">
            <span>📋 Page Table Array (RAM)</span>
            <span>8 Pages</span>
          </h4>

          <div className="vm-row-list is-scroll">
            {state.pageTable.map(pt => {
              const isHighlight = pt.vpn === highlightVpn
              return (
                <div
                  key={pt.vpn}
                  style={{
                    background: isHighlight ? 'var(--state-info-tint)' : 'var(--bg-surface)',
                    border: '1px solid',
                    borderColor: isHighlight ? 'var(--state-info)' : 'var(--border-subtle)',
                    borderRadius: '4px',
                    padding: '0.3rem 0.6rem',
                    fontSize: '0.78rem',
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}
                >
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>Page #{pt.vpn}</span>
                  <span style={{ color: pt.valid ? 'var(--state-info)' : 'var(--state-danger)' }}>
                    {pt.valid ? `Frame #${pt.frame} (Valid)` : 'Disk Swap (Valid=0)'}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Physical RAM Frames */}
        <div className="viz-card accent-purple">
          <h4 className="vm-card-header is-purple">
            🖥 Physical RAM Frame Output
          </h4>

          <div className="vm-frame-panel">
            {highlightFrame !== null ? (
              <div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Target Physical Memory Frame</div>
                <div style={{ fontSize: '1.6rem', fontWeight: 'bold', color: 'var(--state-success)', margin: '0.4rem 0' }}>
                  Frame #{highlightFrame}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--state-info)' }}>
                  Physical Address: 0x{((highlightFrame << 12) | 0x0A4).toString(16).toUpperCase()}
                </div>
              </div>
            ) : (
              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No frame selected. Select a page to translate.</span>
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
