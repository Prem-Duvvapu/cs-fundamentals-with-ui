import React, { useState } from 'react'

export default function DistanceVectorVisualizer() {
  const [round, setRound] = useState(0)

  // Topolgy:
  // Link weights: (A-B: 2), (A-C: 7), (B-C: 1), (B-D: 4), (C-D: 1)
  const roundsData = [
    {
      roundNum: 0,
      title: 'Round 0: Local Direct Link Initialization',
      desc: 'Each router only knows the cost to its direct physical neighbors. All other remote destinations are set to ∞ (Infinity). No vector exchange has occurred yet.',
      converged: false,
      tables: {
        A: [
          { dest: 'A', cost: 0, nextHop: 'A' },
          { dest: 'B', cost: 2, nextHop: 'B' },
          { dest: 'C', cost: 7, nextHop: 'C' },
          { dest: 'D', cost: '∞', nextHop: '-' }
        ],
        B: [
          { dest: 'A', cost: 2, nextHop: 'A' },
          { dest: 'B', cost: 0, nextHop: 'B' },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 4, nextHop: 'D' }
        ],
        C: [
          { dest: 'A', cost: 7, nextHop: 'A' },
          { dest: 'B', cost: 1, nextHop: 'B' },
          { dest: 'C', cost: 0, nextHop: 'C' },
          { dest: 'D', cost: 1, nextHop: 'D' }
        ],
        D: [
          { dest: 'A', cost: '∞', nextHop: '-' },
          { dest: 'B', cost: 4, nextHop: 'B' },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 0, nextHop: 'D' }
        ]
      }
    },
    {
      roundNum: 1,
      title: 'Round 1: First Neighbor Vector Exchange (Bellman-Ford)',
      desc: 'Routers exchange distance vectors with direct neighbors. Router A learns that B can reach C with cost 1; updating A➔C cost to 2 + 1 = 3 (via B), beating direct cost 7! Router A also discovers D via B (2 + 4 = 6) and via C (7 + 1 = 8).',
      converged: false,
      tables: {
        A: [
          { dest: 'A', cost: 0, nextHop: 'A' },
          { dest: 'B', cost: 2, nextHop: 'B' },
          { dest: 'C', cost: 3, nextHop: 'B', updated: true },
          { dest: 'D', cost: 6, nextHop: 'B', updated: true }
        ],
        B: [
          { dest: 'A', cost: 2, nextHop: 'A' },
          { dest: 'B', cost: 0, nextHop: 'B' },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 2, nextHop: 'C', updated: true }
        ],
        C: [
          { dest: 'A', cost: 3, nextHop: 'B', updated: true },
          { dest: 'B', cost: 1, nextHop: 'B' },
          { dest: 'C', cost: 0, nextHop: 'C' },
          { dest: 'D', cost: 1, nextHop: 'D' }
        ],
        D: [
          { dest: 'A', cost: 6, nextHop: 'B', updated: true },
          { dest: 'B', cost: 2, nextHop: 'C', updated: true },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 0, nextHop: 'D' }
        ]
      }
    },
    {
      roundNum: 2,
      title: 'Round 2: Second Iteration & Optimal Path Convergence',
      desc: 'Routers recompute Bellman-Ford equations with updated vectors. Router A discovers that reaching D via B ➔ C ➔ D costs only 2 + 1 + 1 = 4 (via B), improving upon earlier cost 6. Router D discovers path to A costs 4 (via C).',
      converged: true,
      tables: {
        A: [
          { dest: 'A', cost: 0, nextHop: 'A' },
          { dest: 'B', cost: 2, nextHop: 'B' },
          { dest: 'C', cost: 3, nextHop: 'B' },
          { dest: 'D', cost: 4, nextHop: 'B', updated: true }
        ],
        B: [
          { dest: 'A', cost: 2, nextHop: 'A' },
          { dest: 'B', cost: 0, nextHop: 'B' },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 2, nextHop: 'C' }
        ],
        C: [
          { dest: 'A', cost: 3, nextHop: 'B' },
          { dest: 'B', cost: 1, nextHop: 'B' },
          { dest: 'C', cost: 0, nextHop: 'C' },
          { dest: 'D', cost: 1, nextHop: 'D' }
        ],
        D: [
          { dest: 'A', cost: 4, nextHop: 'C', updated: true },
          { dest: 'B', cost: 2, nextHop: 'C' },
          { dest: 'C', cost: 1, nextHop: 'C' },
          { dest: 'D', cost: 0, nextHop: 'D' }
        ]
      }
    }
  ]

  const current = roundsData[round]

  return (
    <div className="viz-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>
          📊 Distance Vector Routing (Bellman-Ford) Convergence Simulator
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Equation: <code>D_x(y) = min_v &#123; c(x,v) + D_v(y) &#125;</code> — Observe how distributed routing tables converge across iterations.
        </p>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <button onClick={() => setRound(0)} className="btn btn-secondary">
          ⏮ Reset (Round 0)
        </button>
        <button
          onClick={() => setRound(prev => Math.max(0, prev - 1))}
          disabled={round === 0}
          className="btn btn-secondary"
        >
          ◀ Prev Round
        </button>
        <button
          onClick={() => setRound(prev => Math.min(roundsData.length - 1, prev + 1))}
          disabled={round === roundsData.length - 1}
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, #6366f1, #a855f7)' }}
        >
          Next Convergence Round ▶
        </button>

        {current.converged && (
          <span className="header-pill" style={{ background: '#065f46', color: '#a7f3d0', border: '1px solid #10b981' }}>
            ✅ Routing Tables Fully Converged!
          </span>
        )}
      </div>

      {/* ROUND INFO BANNER */}
      <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #8b5cf6', marginBottom: '1.25rem' }}>
        <h4 style={{ margin: '0 0 0.35rem', color: '#a78bfa', fontSize: '0.98rem' }}>
          {current.title}
        </h4>
        <p style={{ color: '#cbd5e1', fontSize: '0.88rem', lineHeight: '1.5', margin: 0 }}>
          {current.desc}
        </p>
      </div>

      {/* 4 ROUTING TABLES GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
        {['A', 'B', 'C', 'D'].map(routerId => (
          <div key={routerId} style={{ background: '#0b1329', padding: '0.85rem', borderRadius: '10px', border: '1px solid rgba(59,130,246,0.2)' }}>
            <h5 style={{ margin: '0 0 0.5rem', color: '#38bdf8', fontSize: '0.88rem', display: 'flex', justifyContent: 'space-between' }}>
              <span>Router {routerId} Distance Vector</span>
              <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>D_{routerId}(*)</span>
            </h5>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.78rem', fontFamily: 'monospace', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Dest</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Cost</th>
                  <th style={{ padding: '0.3rem 0.5rem' }}>Next Hop</th>
                </tr>
              </thead>
              <tbody>
                {current.tables[routerId].map((row, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderTop: '1px solid rgba(255,255,255,0.05)',
                      background: row.updated ? 'rgba(99,102,241,0.2)' : 'transparent',
                      color: row.updated ? '#a78bfa' : '#f8fafc'
                    }}
                  >
                    <td style={{ padding: '0.35rem 0.5rem', fontWeight: 600 }}>{row.dest}</td>
                    <td style={{ padding: '0.35rem 0.5rem', color: row.cost === '∞' ? '#ef4444' : '#4ade80', fontWeight: 600 }}>
                      {row.cost}
                    </td>
                    <td style={{ padding: '0.35rem 0.5rem', color: '#38bdf8' }}>{row.nextHop}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  )
}
