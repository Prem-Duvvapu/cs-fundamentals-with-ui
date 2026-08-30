import React, { useState, useEffect } from 'react'
import { ConsistentHashingEngine } from '../../../utils/simulationEngines/consistentHashingEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import netData from '../../../data/networking-concepts.json'

export default function ConsistentHashingVisualizer() {
  const [engine] = useState(() => new ConsistentHashingEngine(1))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000)

  const [vNodeCount, setVNodeCount] = useState(1)

  useEffect(() => {
    setSteps([{ action: 'INIT', description: 'Consistent Hash Ring initialized with 3 physical servers.', state: engine.cloneState() }])
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

  const handleAddServer = () => {
    const sName = `Server-${String.fromCharCode(65 + engine.servers.length)}`
    const s = engine.addServer(sName)
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleRemoveServer = (sName) => {
    const s = engine.removeServer(sName)
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const handleVNodeChange = (count) => {
    setVNodeCount(count)
    const s = engine.setVirtualNodes(count)
    setSteps(s)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()

  // Calculate SVG ring points
  const centerX = 200
  const centerY = 200
  const radius = 140

  const getPoint = (angle) => {
    const rad = ((angle - 90) * Math.PI) / 180
    return {
      x: centerX + radius * Math.cos(rad),
      y: centerY + radius * Math.sin(rad)
    }
  }

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls Card */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <button onClick={handleAddServer} className="btn btn-primary">
            + Add Server Node
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Virtual Nodes per Server:</label>
            <select
              value={vNodeCount}
              onChange={e => handleVNodeChange(Number(e.target.value))}
              className="select-input"
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.85rem' }}
            >
              <option value={1}>1 VNode (Standard)</option>
              <option value={3}>3 VNodes (Balanced)</option>
              <option value={5}>5 VNodes (High Uniformity)</option>
            </select>
          </div>
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
        💡 <strong>Ring Event:</strong> {currentStep?.description || 'Consistent Hash Ring ready.'}
      </div>

      {/* Grid: 360 Degree SVG Hash Ring + Key Mapping Inspector */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
        {/* SVG 360-Degree Hash Ring */}
        <div className="viz-card" style={{ background: 'var(--bg-code)', padding: '1rem', borderRadius: '12px', textAlign: 'center' }}>
          <h4 style={{ margin: '0 0 0.5rem 0', color: 'var(--state-info)' }}>⭕ 360° Circular Hash Ring</h4>

          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <svg width="400" height="400" style={{ overflow: 'visible' }}>
              {/* Outer Ring Circle */}
              <circle cx={centerX} cy={centerY} r={radius} fill="none" stroke="var(--border-strong)" strokeWidth="4" />

              {/* Render Server Nodes on Ring */}
              {state.ringNodes.map((node, i) => {
                const p = getPoint(node.angle)
                const colors = ['var(--state-info)', 'var(--state-success)', 'var(--state-warning)', 'var(--state-danger)', 'var(--cat-base)']
                const sIdx = state.servers.indexOf(node.server)
                const color = colors[sIdx % colors.length]

                return (
                  <g key={i}>
                    <line x1={centerX} y1={centerY} x2={p.x} y2={p.y} stroke="var(--border-subtle)" strokeDasharray="2 2" />
                    <circle cx={p.x} cy={p.y} r="12" fill={color} stroke="var(--text-primary)" strokeWidth="2" />
                    <text x={p.x} y={p.y + 4} fill="var(--text-primary)" fontSize="9" fontWeight="bold" textAnchor="middle">
                      {node.server.replace('Server-', '')}
                    </text>
                  </g>
                )
              })}

              {/* Render Keys on Ring */}
              {state.keys.map((k, i) => {
                const p = getPoint(k.angle)
                return (
                  <g key={i}>
                    <circle cx={p.x} cy={p.y} r="6" fill="var(--state-danger)" stroke="var(--text-primary)" strokeWidth="1.5" />
                    <text x={p.x + 10} y={p.y + 4} fill="var(--text-secondary)" fontSize="10" fontWeight="bold">
                      {k.id}
                    </text>
                  </g>
                )
              })}
            </svg>
          </div>
        </div>

        {/* Server & Key Mappings List */}
        <div className="viz-card">
          <h4 style={{ margin: '0 0 0.75rem 0', color: 'var(--state-success)' }}>🔑 Active Server Nodes & Key Mapping</h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
            {state.servers.map((sName, idx) => {
              const assignedKeys = state.keys.filter(k => k.mappedServer === sName)
              return (
                <div
                  key={sName}
                  style={{
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '8px',
                    padding: '0.65rem 0.85rem',
                    display: 'flex',
                    justify: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{sName}</strong>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                      Assigned Keys ({assignedKeys.length}): {assignedKeys.map(k => k.id).join(', ') || 'None'}
                    </div>
                  </div>

                  {state.servers.length > 1 && (
                    <button
                      onClick={() => handleRemoveServer(sName)}
                      className="btn-delete"
                      title="Remove node from ring"
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Metrics */}
      <StateInspector
        title="Hash Ring Distribution Metrics"
        data={{
          physicalServers: state.servers.length,
          virtualNodesPerServer: state.virtualNodesCount,
          totalRingNodes: state.ringNodes.length,
          totalMappedKeys: state.keys.length
        }}
      />
    </div>
  )

  const conceptData = netData.consistentHashing

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
