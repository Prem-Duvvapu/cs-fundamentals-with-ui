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
    <div className="viz-card" style={{ border: '1px solid var(--border-subtle)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <div>
          <h3 style={{ margin: 0, color: 'var(--cat-os-base)' }}>
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
      <div style={{ background: 'var(--bg-inset)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--state-info-border)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.5rem', fontFamily: 'monospace' }}>
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
                  background: isSelected ? 'linear-gradient(135deg, var(--cat-tint), var(--cat-tint))' : 'var(--bg-raised)',
                  border: isSelected ? '2px solid var(--cat-base)' : '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  transition: 'background-color var(--dur-base) var(--ease-standard), border-color var(--dur-base) var(--ease-standard), color var(--dur-base) var(--ease-standard)',
                  color: 'var(--text-primary)'
                }}
              >
                <div style={{ fontSize: '0.72rem', color: isSelected ? 'var(--cat-base)' : 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bytes {field.bytes} • {field.bits} Bits
                </div>
                <div style={{ fontWeight: 600, fontSize: '0.9rem', marginTop: '0.25rem' }}>
                  {field.name}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--state-info)', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                  {field.example}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* SELECTED FIELD DETAIL INSPECTOR CARD */}
      {selectedField && (
        <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1.25rem', borderRadius: '10px', borderLeft: '4px solid var(--cat-base)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.05rem' }}>
              🔍 Field Analysis: <span style={{ color: 'var(--state-info)' }}>{selectedField.name}</span>
            </h4>
            <span className="header-pill" style={{ background: 'var(--cat-border)', color: 'var(--cat-hover)' }}>
              Offset: {selectedField.bytes} ({selectedField.bits} bits)
            </span>
          </div>

          <p style={{ color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: '1.5', margin: '0.5rem 0' }}>
            {selectedField.description}
          </p>

          <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', fontSize: '0.85rem' }}>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Sample Value: </span>
              <code style={{ color: 'var(--state-success)', background: 'var(--state-success-tint)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                {selectedField.example}
              </code>
            </div>
            <div>
              <span style={{ color: 'var(--text-secondary)' }}>Protocol Overhead: </span>
              <strong style={{ color: 'var(--state-warning)' }}>
                {protocol === 'tcp' ? '20 Bytes base (up to 60B with options)' : '8 Bytes fixed datagram header'}
              </strong>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
