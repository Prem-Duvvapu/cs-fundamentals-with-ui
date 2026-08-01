import React from 'react'

export default function StateInspector({ title = 'Internal State Inspector', data = {}, highlightKey = null }) {
  if (!data || Object.keys(data).length === 0) return null

  return (
    <div className="viz-card" style={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '10px', padding: '1rem' }}>
      <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.95rem', color: '#93c5fd', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
        🔍 {title}
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '0.6rem' }}>
        {Object.entries(data).map(([key, val]) => {
          const isHighlighted = highlightKey === key
          const formattedVal = typeof val === 'object' ? JSON.stringify(val) : String(val)

          return (
            <div
              key={key}
              style={{
                background: isHighlighted ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255,255,255,0.03)',
                border: '1px solid',
                borderColor: isHighlighted ? '#3b82f6' : 'rgba(255,255,255,0.06)',
                borderRadius: '6px',
                padding: '0.5rem 0.65rem',
                transition: 'all 0.2s ease'
              }}
            >
              <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: '#94a3b8', letterSpacing: '0.05em' }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 600, color: isHighlighted ? '#60a5fa' : '#f8fafc', marginTop: '0.15rem', wordBreak: 'break-word' }}>
                {formattedVal}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
