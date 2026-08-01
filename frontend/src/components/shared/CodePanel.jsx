import React from 'react'

export default function CodePanel({ code = '', activeLine = -1, title = 'Implementation Snippet' }) {
  if (!code) return null

  const lines = code.trim().split('\n')

  return (
    <div className="viz-card" style={{ background: '#020617', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ padding: '0.5rem 1rem', background: '#0f172a', borderBottom: '1px solid rgba(255,255,255,0.08)', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
        💻 {title}
      </div>
      <div style={{ padding: '0.75rem 0', fontFamily: 'Fira Code, Consolas, Monaco, monospace', fontSize: '0.82rem', overflowX: 'auto' }}>
        {lines.map((line, idx) => {
          const lineNum = idx + 1
          const isActive = lineNum === activeLine

          return (
            <div
              key={idx}
              style={{
                display: 'flex',
                padding: '0.15rem 1rem',
                background: isActive ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                borderLeft: isActive ? '3px solid #3b82f6' : '3px solid transparent',
                color: isActive ? '#93c5fd' : '#cbd5e1'
              }}
            >
              <span style={{ width: '2.5rem', color: '#475569', select: 'none', textAlign: 'right', paddingRight: '1rem' }}>
                {lineNum}
              </span>
              <span style={{ whiteSpace: 'pre' }}>{line}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
