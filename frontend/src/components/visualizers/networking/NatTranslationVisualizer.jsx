import React, { useState } from 'react'

export default function NatTranslationVisualizer() {
  const [natTable, setNatTable] = useState([
    { id: 1, internal: '192.168.1.10:5000', translated: '203.0.113.1:61001', external: '142.250.190.46:443', proto: 'TCP', state: 'ESTABLISHED' }
  ])
  const [lastAction, setLastAction] = useState('NAT router active with 1 existing outbound translation mapping.')
  const [packetVisual, setPacketVisual] = useState(null)

  const handleSendFromHostA = () => {
    const existing = natTable.find(e => e.internal === '192.168.1.10:5000')
    if (!existing) {
      const newEntry = {
        id: Date.now(),
        internal: '192.168.1.10:5000',
        translated: '203.0.113.1:61001',
        external: '142.250.190.46:443',
        proto: 'TCP',
        state: 'ESTABLISHED'
      }
      setNatTable(prev => [...prev, newEntry])
    }

    setPacketVisual({
      direction: 'outbound',
      before: { src: '192.168.1.10:5000', dst: '142.250.190.46:443' },
      after: { src: '203.0.113.1:61001', dst: '142.250.190.46:443' },
      info: 'Outbound: NAT rewrote Source IP from private 192.168.1.10:5000 to public 203.0.113.1:61001 (SNAT/NAPT).'
    })

    setLastAction('Host A sent packet: NAT translated private 192.168.1.10:5000 ➔ 203.0.113.1:61001')
  }

  const handleSendFromHostB = () => {
    const existing = natTable.find(e => e.internal === '192.168.1.20:6000')
    if (!existing) {
      const newEntry = {
        id: Date.now(),
        internal: '192.168.1.20:6000',
        translated: '203.0.113.1:61002',
        external: '142.250.190.46:443',
        proto: 'TCP',
        state: 'ESTABLISHED'
      }
      setNatTable(prev => [...prev, newEntry])
    }

    setPacketVisual({
      direction: 'outbound',
      before: { src: '192.168.1.20:6000', dst: '142.250.190.46:443' },
      after: { src: '203.0.113.1:61002', dst: '142.250.190.46:443' },
      info: 'Outbound: NAT rewrote Source IP from private 192.168.1.20:6000 to public 203.0.113.1:61002.'
    })

    setLastAction('Host B sent packet: NAT allocated port 61002 and translated 192.168.1.20:6000 ➔ 203.0.113.1:61002')
  }

  const handleServerReply = () => {
    if (natTable.length === 0) {
      setLastAction('⚠️ Inbound packet dropped! No active NAT mapping exists for incoming WAN traffic (Unsolicited Inbound Blocked).')
      setPacketVisual(null)
      return
    }

    const target = natTable[0]
    setPacketVisual({
      direction: 'inbound',
      before: { src: '142.250.190.46:443', dst: target.translated },
      after: { src: '142.250.190.46:443', dst: target.internal },
      info: `Inbound: NAT matched Destination Port ${target.translated.split(':')[1]} and rewrote Destination IP ➔ ${target.internal} (DNAT).`
    })

    setLastAction(`Server replied: NAT matched entry and restored Destination to ${target.internal}`)
  }

  const handleReset = () => {
    setNatTable([])
    setPacketVisual(null)
    setLastAction('NAT Translation Table cleared.')
  }

  return (
    <div className="viz-card" style={{ border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--accent-purple)' }}>
          🔄 NAT (Network Address Translation / NAPT) Simulator
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Observe how multiple private RFC 1918 LAN hosts share a single public IPv4 address via Port Address Translation.
        </p>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={handleSendFromHostA} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #6366f1, #3b82f6)' }}>
          Host A ➔ Send Outbound GET (Port 5000) 🚀
        </button>
        <button onClick={handleSendFromHostB} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}>
          Host B ➔ Send Outbound GET (Port 6000) 🚀
        </button>
        <button onClick={handleServerReply} className="btn btn-secondary">
          Server ➔ Send Inbound Reply 📩
        </button>
        <button onClick={handleReset} className="btn btn-secondary">
          🧹 Clear NAT Table
        </button>
      </div>

      {/* THREE-STAGE TOPOLOGY ARCHITECTURE */}
      <div style={{ background: '#020617', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid rgba(59,130,246,0.15)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* PRIVATE LAN */}
          <div style={{ background: 'rgba(30,41,59,0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              🏠 Private LAN (192.168.1.0/24)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                💻 Host A: <strong style={{ color: '#818cf8' }}>192.168.1.10:5000</strong>
              </div>
              <div style={{ background: '#0f172a', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                💻 Host B: <strong style={{ color: '#34d399' }}>192.168.1.20:6000</strong>
              </div>
            </div>
          </div>

          {/* NAT ROUTER GATEWAY */}
          <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1rem', borderRadius: '10px', border: '2px solid #8b5cf6', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🌐</div>
            <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>NAT Gateway Router</div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', fontFamily: 'monospace', marginTop: '0.2rem' }}>
              LAN IP: 192.168.1.1
            </div>
            <div style={{ fontSize: '0.75rem', color: '#4ade80', fontFamily: 'monospace', fontWeight: 600 }}>
              WAN IP: 203.0.113.1
            </div>
          </div>

          {/* PUBLIC INTERNET / SERVER */}
          <div style={{ background: 'rgba(30,41,59,0.7)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '0.75rem', color: '#f59e0b', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ☁️ Public Internet / WAN
            </div>
            <div style={{ background: '#0f172a', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              🖥️ Cloud Web Server:<br />
              <strong style={{ color: '#fbbf24' }}>142.250.190.46:443</strong> (HTTPS)
            </div>
          </div>
        </div>
      </div>

      {/* PACKET REWRITE INSPECTOR */}
      {packetVisual && (
        <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid #38bdf8', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.88rem', color: '#f8fafc', fontWeight: 600, marginBottom: '0.3rem' }}>
            📦 Packet Translation In Flight ({packetVisual.direction.toUpperCase()})
          </div>
          <p style={{ color: '#cbd5e1', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
            {packetVisual.info}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            <div style={{ background: '#020617', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Pre-NAT: </span>
              <span style={{ color: '#38bdf8' }}>{packetVisual.before.src} ➔ {packetVisual.before.dst}</span>
            </div>
            <div style={{ color: '#8b5cf6', fontWeight: 700 }}>➔ NAT ➔</div>
            <div style={{ background: '#020617', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ color: '#94a3b8' }}>Post-NAT: </span>
              <span style={{ color: '#4ade80' }}>{packetVisual.after.src} ➔ {packetVisual.after.dst}</span>
            </div>
          </div>
        </div>
      )}

      {/* LIVE NAT TRANSLATION TABLE */}
      <div style={{ background: 'rgba(15,23,42,0.9)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.08)' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>📋 NAT Translation State Table (NAPT)</span>
          <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Entries: {natTable.length}</span>
        </h4>

        {natTable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: '#64748b', fontSize: '0.82rem', background: '#020617', borderRadius: '6px' }}>
            NAT Translation Table is Empty (No active NAT sessions).
          </div>
        ) : (
          <div style={{ background: '#020617', borderRadius: '6px', overflow: 'hidden', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'rgba(30,41,59,0.8)', color: '#94a3b8' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Proto</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Internal (Private) Socket</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>NAT Public Socket (SNAT)</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Destination Socket</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {natTable.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', color: '#cbd5e1' }}>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#38bdf8' }}>{entry.proto}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#818cf8' }}>{entry.internal}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#4ade80' }}>{entry.translated}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#fbbf24' }}>{entry.external}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: '#34d399' }}>{entry.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: '#94a3b8' }}>
          Status: <em>{lastAction}</em>
        </div>
      </div>
    </div>
  )
}
