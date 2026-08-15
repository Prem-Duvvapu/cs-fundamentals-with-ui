import React, { useState } from 'react'
import { tcpHeaderFields, udpHeaderFields } from '../../../utils/tcpSegmentData'

export default function TcpSegmentVisualizer() {
  const [protocol, setProtocol] = useState('tcp') // 'tcp' | 'udp'
  const [selectedField, setSelectedField] = useState(tcpHeaderFields[0])

  const fields = protocol === 'tcp' ? tcpHeaderFields : udpHeaderFields

  const handleSelectField = (field) => {
    setSelectedField(field)
  }

  const handleToggleProtocol = (proto) => {
    setProtocol(proto)
    setSelectedField(proto === 'tcp' ? tcpHeaderFields[0] : udpHeaderFields[0])
  }

  return (
    <div className="viz-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>
            📋 {protocol === 'tcp' ? 'TCP Segment Header Inspector (20–60 Bytes)' : 'UDP Datagram Header Inspector (8 Bytes Fixed)'}
          </h3>
          <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
            Click or inspect any header field to analyze bit allocations, byte offsets, and protocol role.
          </p>
        </div>

        <div className="main-tab-switcher" style={{ margin: 0 }}>
          <button
            onClick={() => handleToggleProtocol('tcp')}
            className={`main-tab-btn ${protocol === 'tcp' ? 'active-tab' : ''}`}
          >
            TCP Header (20B)
          </button>
          <button
            onClick={() => handleToggleProtocol('udp')}
            className={`main-tab-btn ${protocol === 'udp' ? 'active-tab' : ''}`}
          >
            UDP Header (8B)
          </button>
        </div>
      </div>

      {/* HEADER BIT/BYTE GRID VISUALIZATION */}
      <div style={{ background: '#0b1329', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(59,130,246,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
          <span>Bit 0</span>
          <span>Bit 15</span>
          <span>Bit 16</span>
          <span>Bit 31</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.5rem' }}>
          {fields.map((field, idx) => {
            const isSelected = selectedField?.name === field.name
            return (
              <button
                key={field.name}
                onClick={() => handleSelectField(field)}
                style={{
                  background: isSelected ? 'linear-gradient(135deg, rgba(99,102,241,0.35), rgba(168,85,247,0.35))' : 'rgba(30,41,59,0.7)',
                  border: isSelected ? '2px solid #8b5cf6' : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  color: '#fff'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: isSelected ? '#a78bfa' : '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bytes {field.bytes} • {field.bits} Bits
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {field.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: '#38bdf8', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {field.example}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SELECTED FIELD DETAIL INSPECTOR CARD */}
      {selectedField && (
        <div style={{ background: 'rgba(15,23,42,0.85)', padding: '1.25rem', borderRadius: '10px', borderLeft: '4px solid #8b5cf6' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, color: '#f8fafc', fontSize: '1.05rem' }}>
              🔍 Field Analysis: <span style={{ color: '#38bdf8' }}>{selectedField.name}</span>
            </h4>
            <span className="header-pill" style={{ background: '#4338ca', color: '#e0e7ff' }}>
              Offset: {selectedField.bytes} ({selectedField.bits} bits)
            </span>
          </div>

          <p style={{ color: '#cbd5e1', fontSize: '0.92rem', lineHeight: '1.5', margin: '0.5rem 0' }}>
            {selectedField.description}
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: '#94a3b8' }}>Sample Value: </span>
              <code style={{ color: '#4ade80', background: '#022c22', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                {selectedField.example}
              </code>
            </div>
            <div>
              <span style={{ color: '#94a3b8' }}>Protocol Overhead: </span>
              <strong style={{ color: '#f59e0b' }}>
                {protocol === 'tcp' ? '20 Bytes base (up to 60B with options)' : '8 Bytes fixed datagram header'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
