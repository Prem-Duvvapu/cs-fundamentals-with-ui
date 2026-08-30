import React, { useState } from 'react'

export default function DhcpDoraVisualizer() {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Step 1: DHCPDISCOVER (Client ➔ Broadcast)',
      direction: 'right',
      sender: 'Client (Unconfigured)',
      receiver: 'Broadcast (255.255.255.255)',
      srcIp: '0.0.0.0:68',
      dstIp: '255.255.255.255:67',
      srcMac: 'AA:BB:CC:11:22:33',
      dstMac: 'FF:FF:FF:FF:FF:FF',
      message: 'Client boots on network with no IP. Broadcasts UDP datagram seeking any active DHCP server on subnet.',
      highlightColor: 'var(--cat-base)'
    },
    {
      title: 'Step 2: DHCPOFFER (DHCP Server ➔ Broadcast/Unicast)',
      direction: 'left',
      sender: 'DHCP Server (192.168.1.1)',
      receiver: 'Client (AA:BB:CC:11:22:33)',
      srcIp: '192.168.1.1:67',
      dstIp: '192.168.1.105:68',
      srcMac: '00:11:22:33:44:55',
      dstMac: 'AA:BB:CC:11:22:33',
      message: 'Server reserves 192.168.1.105 from its IP pool and offers it along with Subnet Mask (255.255.255.0), Gateway (192.168.1.1), and Lease Time (86400s).',
      highlightColor: 'var(--state-info)'
    },
    {
      title: 'Step 3: DHCPREQUEST (Client ➔ Broadcast)',
      direction: 'right',
      sender: 'Client',
      receiver: 'Broadcast (255.255.255.255)',
      srcIp: '0.0.0.0:68',
      dstIp: '255.255.255.255:67',
      srcMac: 'AA:BB:CC:11:22:33',
      dstMac: 'FF:FF:FF:FF:FF:FF',
      message: 'Client formally requests the offered IP (192.168.1.105) and identifies Server 192.168.1.1. Broadcast informs any other DHCP servers to release their tentative offers.',
      highlightColor: 'var(--state-warning)'
    },
    {
      title: 'Step 4: DHCPACK (DHCP Server ➔ Client)',
      direction: 'left',
      sender: 'DHCP Server (192.168.1.1)',
      receiver: 'Client (192.168.1.105)',
      srcIp: '192.168.1.1:67',
      dstIp: '192.168.1.105:68',
      srcMac: '00:11:22:33:44:55',
      dstMac: 'AA:BB:CC:11:22:33',
      message: 'Server commits IP lease to permanent table and sends DHCPACK. Client binds 192.168.1.105 to its NIC interface and begins normal IP routing.',
      highlightColor: 'var(--state-success)'
    }
  ]

  const current = steps[step]

  return (
    <div className="viz-card" style={{ border: '1px solid var(--border-subtle)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>
          📡 DHCP 4-Step DORA Lease Protocol Simulator
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Discover, Offer, Request, and Acknowledge exchange allowing network hosts to dynamically obtain IP leases.
        </p>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => setStep(0)} className="btn btn-secondary">
          ⏮ Reset (Step 1)
        </button>
        <button
          onClick={() => setStep(prev => Math.max(0, prev - 1))}
          disabled={step === 0}
          className="btn btn-secondary"
        >
          ◀ Prev
        </button>
        <button
          onClick={() => setStep(prev => Math.min(steps.length - 1, prev + 1))}
          disabled={step === steps.length - 1}
          className="btn btn-primary"
          style={{ background: 'linear-gradient(135deg, var(--cat-base), var(--cat-hover))' }}
        >
          Next Step ▶
        </button>
      </div>

      {/* TIMELINE PROGRESS INDICATOR */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {['1. Discover', '2. Offer', '3. Request', '4. Acknowledge'].map((label, idx) => (
          <button
            key={label}
            onClick={() => setStep(idx)}
            style={{
              background: idx === step ? 'var(--cat-tint)' : idx < step ? 'var(--bg-raised)' : 'var(--bg-surface)',
              border: idx === step ? '2px solid var(--cat-base)' : '1px solid var(--border-subtle)',
              color: idx === step ? 'var(--text-primary)' : idx < step ? 'var(--text-secondary)' : 'var(--text-muted)',
              padding: '0.6rem 0.2rem',
              borderRadius: '8px',
              fontWeight: 600,
              fontSize: '0.8rem',
              cursor: 'pointer'
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* INTERACTIVE HOST ARCHITECTURE DIAGRAM */}
      <div style={{ background: 'var(--bg-code)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--state-info-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '1rem' }}>
          {/* CLIENT BOX */}
          <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-info)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>💻</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>Client Host</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>MAC: AA:BB:CC:11:22:33</div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', background: 'var(--bg-surface)', padding: '0.3rem', borderRadius: '4px' }}>
              State: <strong style={{ color: step === 3 ? 'var(--state-success)' : 'var(--state-warning)' }}>{step === 3 ? 'BOUND (192.168.1.105)' : 'INIT / REQUESTING'}</strong>
            </div>
          </div>

          {/* ANIMATED PACKET ARROW */}
          <div style={{ textAlign: 'center', minWidth: '160px' }}>
            <div style={{ fontSize: '0.75rem', color: current.highlightColor, fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.25rem' }}>
              UDP Port {current.direction === 'right' ? '68 ➔ 67' : '67 ➔ 68'}
            </div>
            <div style={{ height: '4px', background: current.highlightColor, position: 'relative', borderRadius: '2px' }}>
              <div
                style={{
                  position: 'absolute',
                  top: '-6px',
                  [current.direction === 'right' ? 'right' : 'left']: '0',
                  width: '0',
                  height: '0',
                  borderTop: '8px solid transparent',
                  borderBottom: '8px solid transparent',
                  [current.direction === 'right' ? 'borderLeft' : 'borderRight']: `12px solid ${current.highlightColor}`
                }}
              />
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', marginTop: '0.35rem', fontFamily: 'monospace' }}>
              {current.title.split(' ')[1]}
            </div>
          </div>

          {/* DHCP SERVER BOX */}
          <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--state-success)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.75rem', marginBottom: '0.25rem' }}>🗄️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.95rem' }}>DHCP Server</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>IP: 192.168.1.1:67</div>
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', background: 'var(--bg-surface)', padding: '0.3rem', borderRadius: '4px' }}>
              Pool: <strong style={{ color: 'var(--state-info)' }}>192.168.1.100 - .200</strong>
            </div>
          </div>
        </div>
      </div>

      {/* PACKET HEADER BREAKDOWN */}
      <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1.25rem', borderRadius: '10px', borderLeft: `4px solid ${current.highlightColor}` }}>
        <h4 style={{ margin: '0 0 0.5rem', color: current.highlightColor, fontSize: '1rem' }}>
          {current.title}
        </h4>
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', lineHeight: '1.5', margin: '0 0 0.75rem' }}>
          {current.message}
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.6rem', fontSize: '0.82rem', fontFamily: 'monospace' }}>
          <div style={{ background: 'var(--bg-code)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Source IP: </span>
            <strong style={{ color: 'var(--state-info)' }}>{current.srcIp}</strong>
          </div>
          <div style={{ background: 'var(--bg-code)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Dest IP: </span>
            <strong style={{ color: 'var(--state-danger)' }}>{current.dstIp}</strong>
          </div>
          <div style={{ background: 'var(--bg-code)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Source MAC: </span>
            <strong style={{ color: 'var(--cat-base)' }}>{current.srcMac}</strong>
          </div>
          <div style={{ background: 'var(--bg-code)', padding: '0.5rem', borderRadius: '6px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Dest MAC: </span>
            <strong style={{ color: 'var(--state-warning)' }}>{current.dstMac}</strong>
          </div>
        </div>
      </div>
    </div>
  )
}
