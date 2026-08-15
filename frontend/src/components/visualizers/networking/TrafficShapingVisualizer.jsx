import React, { useState } from 'react'
import { simulateTokenBucket, simulateLeakyBucket } from '../../../utils/trafficShapingEngine'

export default function TrafficShapingVisualizer() {
  const [capacity, setCapacity] = useState(10)
  const [tokenRate, setTokenRate] = useState(3)
  const [leakRate, setLeakRate] = useState(3)
  const [burstSize, setBurstSize] = useState(6)

  // Simulation state
  const [tick, setTick] = useState(0)
  const [tokenState, setTokenState] = useState({ tokens: 10, transmitted: 0, dropped: 0, tokensAdded: 0 })
  const [leakyState, setLeakyState] = useState({ buffer: 0, transmitted: 0, dropped: 0, accepted: 0 })
  const [logs, setLogs] = useState([
    'System ready. Configure capacity and generation rates, then click "Step Next Tick ▶" or "Inject Traffic Burst 🚀".'
  ])

  const handleStepTick = (incoming = 0) => {
    const nextTick = tick + 1
    setTick(nextTick)

    // Token Bucket Step
    const tbRes = simulateTokenBucket(tokenState.tokens, capacity, tokenRate, incoming)
    setTokenState(tbRes)

    // Leaky Bucket Step
    const lbRes = simulateLeakyBucket(leakyState.buffer, capacity, leakRate, incoming)
    setLeakyState(lbRes)

    const logEntry = `[Tick ${nextTick}] Incoming: ${incoming} pkts | Token Bucket: +${tokenRate} tokens (avail: ${tbRes.tokens + tbRes.transmitted}), sent ${tbRes.transmitted}, dropped ${tbRes.dropped} | Leaky Bucket: queued ${lbRes.accepted} (buf: ${lbRes.buffer + lbRes.transmitted}/${capacity}), sent ${lbRes.transmitted} at rate ${leakRate}/t, dropped ${lbRes.dropped}`

    setLogs(prev => [logEntry, ...prev.slice(0, 19)])
  }

  const handleInjectBurst = () => {
    handleStepTick(burstSize)
  }

  const handleReset = () => {
    setTick(0)
    setTokenState({ tokens: capacity, transmitted: 0, dropped: 0, tokensAdded: 0 })
    setLeakyState({ buffer: 0, transmitted: 0, dropped: 0, accepted: 0 })
    setLogs(['Simulation reset to initial state.'])
  }

  return (
    <div className="viz-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>
          🪣 Traffic Shaping Simulator: Token Bucket vs. Leaky Bucket
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Compare how Token Bucket permits regulated bursts up to capacity while Leaky Bucket strictly flattens output to a constant rate.
        </p>
      </div>

      {/* PARAMETER CONTROLS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem', background: '#0b1329', padding: '1rem', borderRadius: '10px', marginBottom: '1.25rem' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
            Bucket Capacity: <strong style={{ color: '#38bdf8' }}>{capacity}</strong>
          </label>
          <input
            type="range"
            min="5"
            max="20"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
            Token Generation Rate: <strong style={{ color: '#4ade80' }}>{tokenRate} tokens/tick</strong>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={tokenRate}
            onChange={(e) => setTokenRate(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
            Leaky Outflow Rate: <strong style={{ color: '#f59e0b' }}>{leakRate} pkts/tick</strong>
          </label>
          <input
            type="range"
            min="1"
            max="10"
            value={leakRate}
            onChange={(e) => setLeakRate(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#94a3b8', display: 'block', marginBottom: '0.3rem' }}>
            Burst Packet Batch: <strong style={{ color: '#ec4899' }}>{burstSize} pkts</strong>
          </label>
          <input
            type="range"
            min="1"
            max="15"
            value={burstSize}
            onChange={(e) => setBurstSize(Number(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>

      {/* ACTION BUTTONS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => handleStepTick(0)} className="btn btn-secondary">
          Step Idle Tick (0 pkts) ⏱
        </button>
        <button onClick={handleInjectBurst} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}>
          Inject Traffic Burst ({burstSize} Packets) 🚀
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          ⏮ Reset
        </button>
      </div>

      {/* SIDE-BY-SIDE VISUAL COMPARISON */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem', marginBottom: '1.25rem' }}>
        {/* TOKEN BUCKET PANEL */}
        <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(99,102,241,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, color: '#818cf8' }}>🪙 Token Bucket</h4>
            <span className="header-pill" style={{ background: '#312e81', color: '#c7d2fe' }}>
              Tokens: {tokenState.tokens} / {capacity}
            </span>
          </div>

          <div style={{ height: '140px', background: '#020617', borderRadius: '8px', border: '2px dashed #4338ca', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
            <div
              style={{
                height: `${Math.min(100, (tokenState.tokens / capacity) * 100)}%`,
                background: 'linear-gradient(to top, #4f46e5, #818cf8)',
                borderRadius: '4px',
                transition: 'height 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {tokenState.tokens > 0 && `${tokenState.tokens} Tokens Available`}
            </div>
            {tokenState.tokens === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', margin: 'auto 0' }}>
                Bucket Empty (Awaiting Tokens)
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
            <div style={{ background: '#064e3b', color: '#a7f3d0', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              Transmitted: <strong>{tokenState.transmitted}</strong>
            </div>
            <div style={{ background: tokenState.dropped > 0 ? '#7f1d1d' : '#1e293b', color: tokenState.dropped > 0 ? '#fecaca' : '#94a3b8', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              Dropped/Delayed: <strong>{tokenState.dropped}</strong>
            </div>
          </div>
        </div>

        {/* LEAKY BUCKET PANEL */}
        <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1.25rem', borderRadius: '12px', border: '1px solid rgba(245,158,11,0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
            <h4 style={{ margin: 0, color: '#fbbf24' }}>🚰 Leaky Bucket (FIFO)</h4>
            <span className="header-pill" style={{ background: '#78350f', color: '#fde68a' }}>
              Queue: {leakyState.buffer} / {capacity}
            </span>
          </div>

          <div style={{ height: '140px', background: '#020617', borderRadius: '8px', border: '2px dashed #b45309', padding: '0.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', position: 'relative' }}>
            <div
              style={{
                height: `${Math.min(100, (leakyState.buffer / capacity) * 100)}%`,
                background: 'linear-gradient(to top, #d97706, #fbbf24)',
                borderRadius: '4px',
                transition: 'height 0.3s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600
              }}
            >
              {leakyState.buffer > 0 && `${leakyState.buffer} Packets Queued`}
            </div>
            {leakyState.buffer === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', fontSize: '0.8rem', margin: 'auto 0' }}>
                Buffer Idle (0 In Queue)
              </div>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem' }}>
            <div style={{ background: '#064e3b', color: '#a7f3d0', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              Drained: <strong>{leakyState.transmitted}</strong>
            </div>
            <div style={{ background: leakyState.dropped > 0 ? '#7f1d1d' : '#1e293b', color: leakyState.dropped > 0 ? '#fecaca' : '#94a3b8', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              Buffer Overflow Drop: <strong>{leakyState.dropped}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* EVENT AUDIT LOG */}
      <div style={{ background: '#020617', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
        <h5 style={{ margin: '0 0 0.5rem', color: '#94a3b8', fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          📜 Traffic Event Audit Log (Current Tick: {tick})
        </h5>
        <div style={{ maxHeight: '130px', overflowY: 'auto', fontFamily: 'monospace', fontSize: '0.78rem', color: '#cbd5e1' }}>
          {logs.map((log, i) => (
            <div key={i} style={{ padding: '0.2rem 0', borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
