import React, { useState, useEffect } from 'react'
import { TcpCongestionEngine } from '../../../utils/simulationEngines/tcpCongestionEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import netData from '../../../data/networking-concepts.json'

export default function TcpCongestionVisualizer() {
  const [algo, setAlgo] = useState('Reno')
  const [engine, setEngine] = useState(() => new TcpCongestionEngine('Reno', 16))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(900)

  const handleAlgoChange = (newAlgo) => {
    setAlgo(newAlgo)
    const newEng = new TcpCongestionEngine(newAlgo, 16)
    setEngine(newEng)
    setSteps([{ action: 'INIT', description: `TCP ${newAlgo} initialized. Initial cwnd = 1 MSS, ssthresh = 16 MSS.`, state: newEng.cloneState() }])
    setCurrentStepIdx(0)
    setIsPlaying(false)
  }

  useEffect(() => {
    const s = engine.nextRtt()
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

  const handleNextRtt = () => {
    const s = engine.nextRtt()
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handlePacketLoss = () => {
    const s = engine.triggerLoss()
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  // Calculate SVG Sawtooth Line Chart coordinates
  const maxRtt = Math.max(12, state.history.length)
  const maxCwnd = Math.max(32, ...state.history.map(h => h.cwnd))
  const chartWidth = 550
  const chartHeight = 220

  const points = state.history.map((h, i) => {
    const x = 40 + (h.rtt / maxRtt) * (chartWidth - 60)
    const y = chartHeight - 30 - (h.cwnd / maxCwnd) * (chartHeight - 60)
    return `${x},${y}`
  }).join(' ')

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>TCP Variant:</label>
            <select
              value={algo}
              onChange={e => handleAlgoChange(e.target.value)}
              className="select-input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value="Reno">TCP Reno (Fast Recovery / Halve cwnd)</option>
              <option value="Tahoe">TCP Tahoe (Collapse cwnd to 1)</option>
            </select>
          </div>

          <button onClick={handleNextRtt} className="btn btn-primary">
            ⏭ Advance 1 RTT
          </button>

          <button onClick={handlePacketLoss} className="btn btn-secondary" style={{ borderColor: '#ef4444', color: '#f87171' }}>
            🔥 Inject Packet Loss Event
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
        💡 <strong>TCP State:</strong> {currentStep?.description || 'TCP flow running.'}
      </div>

      {/* Grid: SVG Sawtooth Line Chart + Sliding Pipe Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* Real-Time SVG Sawtooth Line Chart */}
        <div className="viz-card" style={{ background: '#020617', padding: '1rem', borderRadius: '12px' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#93c5fd', display: 'flex', justifyContent: 'space-between' }}>
            <span>📈 Real-Time cwnd Sawtooth Chart</span>
            <span style={{ fontSize: '0.8rem', color: '#34d399' }}>Phase: {state.phase}</span>
          </h4>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width={chartWidth} height={chartHeight}>
              {/* Grid Lines */}
              <line x1="40" y1="20" x2="40" y2={chartHeight - 30} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
              <line x1="40" y1={chartHeight - 30} x2={chartWidth - 20} y2={chartHeight - 30} stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

              {/* ssthresh Line */}
              {(() => {
                const ssthreshY = chartHeight - 30 - (state.ssthresh / maxCwnd) * (chartHeight - 60)
                return (
                  <g>
                    <line x1="40" y1={ssthreshY} x2={chartWidth - 20} y2={ssthreshY} stroke="#f59e0b" strokeDasharray="4 4" strokeWidth="1.5" />
                    <text x={chartWidth - 90} y={ssthreshY - 5} fill="#fbbf24" fontSize="10" fontWeight="bold">
                      ssthresh ({state.ssthresh})
                    </text>
                  </g>
                )
              })()}

              {/* Polyline Sawtooth */}
              <polyline fill="none" stroke="#3b82f6" strokeWidth="3" points={points} />

              {/* Chart Points */}
              {state.history.map((h, i) => {
                const cx = 40 + (h.rtt / maxRtt) * (chartWidth - 60)
                const cy = chartHeight - 30 - (h.cwnd / maxCwnd) * (chartHeight - 60)
                return (
                  <circle key={i} cx={cx} cy={cy} r="4" fill={h.phase === 'SLOW_START' ? '#10b981' : '#3b82f6'} />
                )
              })}
            </svg>
          </div>
        </div>

        {/* Sliding Pipe Window Display */}
        <div className="viz-card" style={{ borderLeft: '4px solid #10b981' }}>
          <h4 style={{ margin: '0 0 0.75rem 0', color: '#34d399' }}>
            📦 In-Flight Packets in Network Pipe
          </h4>

          <div style={{ background: '#020617', padding: '1rem', borderRadius: '8px' }}>
            <div style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Current `cwnd`: <strong style={{ color: '#f8fafc', fontSize: '1.1rem' }}>{state.cwnd} MSS Packets</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', maxHeight: '120px', overflowY: 'auto' }}>
              {Array.from({ length: Math.min(32, state.cwnd) }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    background: state.phase === 'SLOW_START' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(59, 130, 246, 0.25)',
                    border: '1px solid',
                    borderColor: state.phase === 'SLOW_START' ? '#10b981' : '#3b82f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '0.7rem',
                    fontWeight: 'bold',
                    color: '#f8fafc'
                  }}
                >
                  P#{i + 1}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* State Metrics */}
      <StateInspector
        title="TCP Congestion Control Metrics"
        data={{
          tcpVariant: state.algo,
          currentCwnd: `${state.cwnd} MSS`,
          ssthresh: `${state.ssthresh} MSS`,
          currentRTT: state.rtt,
          congestionPhase: state.phase
        }}
      />
    </div>
  )

  const conceptData = netData.tcpCongestion

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
