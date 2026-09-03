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
    <div className="viz-card" style={{ border: '1px solid var(--border-subtle)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--cat-os-base)' }}>
          🔄 NAT (Network Address Translation / NAPT) Simulator
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Observe how multiple private RFC 1918 LAN hosts share a single public IPv4 address via Port Address Translation.
        </p>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={handleSendFromHostA} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--cat-base), var(--state-info))' }}>
          Host A ➔ Send Outbound GET (Port 5000) 🚀
        </button>
        <button onClick={handleSendFromHostB} className="btn btn-primary" style={{ background: 'linear-gradient(135deg, var(--state-success), var(--state-success-border))' }}>
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
      <div style={{ background: 'var(--bg-code)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--state-info-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', alignItems: 'center' }}>
          {/* PRIVATE LAN */}
          <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--state-info)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              🏠 Private LAN (192.168.1.0/24)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                💻 Host A: <strong style={{ color: 'var(--cat-base)' }}>192.168.1.10:5000</strong>
              </div>
              <div style={{ background: 'var(--bg-surface)', padding: '0.5rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                💻 Host B: <strong style={{ color: 'var(--state-success)' }}>192.168.1.20:6000</strong>
              </div>
            </div>
          </div>

          {/* NAT ROUTER GATEWAY */}
          <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1rem', borderRadius: '10px', border: '2px solid var(--cat-base)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.2rem' }}>🌐</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.9rem' }}>NAT Gateway Router</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontFamily: 'monospace', marginTop: '0.2rem' }}>
              LAN IP: 192.168.1.1
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--state-success)', fontFamily: 'monospace', fontWeight: 600 }}>
              WAN IP: 203.0.113.1
            </div>
          </div>

          {/* PUBLIC INTERNET / SERVER */}
          <div style={{ background: 'var(--bg-raised)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.75rem', color: 'var(--state-warning)', fontWeight: 700, textTransform: 'uppercase', marginBottom: '0.5rem' }}>
              ☁️ Public Internet / WAN
            </div>
            <div style={{ background: 'var(--bg-surface)', padding: '0.6rem', borderRadius: '6px', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              🖥️ Cloud Web Server:<br />
              <strong style={{ color: 'var(--state-warning)' }}>142.250.190.46:443</strong> (HTTPS)
            </div>
          </div>
        </div>
      </div>

      {/* PACKET REWRITE INSPECTOR */}
      {packetVisual && (
        <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid var(--state-info)', marginBottom: '1.25rem' }}>
          <div style={{ fontSize: '0.88rem', color: 'var(--text-primary)', fontWeight: 600, marginBottom: '0.3rem' }}>
            📦 Packet Translation In Flight ({packetVisual.direction.toUpperCase()})
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: '0 0 0.5rem' }}>
            {packetVisual.info}
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', gap: '0.5rem', fontFamily: 'monospace', fontSize: '0.78rem' }}>
            <div style={{ background: 'var(--bg-code)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Pre-NAT: </span>
              <span style={{ color: 'var(--state-info)' }}>{packetVisual.before.src} ➔ {packetVisual.before.dst}</span>
            </div>
            <div style={{ color: 'var(--cat-base)', fontWeight: 700 }}>➔ NAT ➔</div>
            <div style={{ background: 'var(--bg-code)', padding: '0.4rem 0.6rem', borderRadius: '6px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Post-NAT: </span>
              <span style={{ color: 'var(--state-success)' }}>{packetVisual.after.src} ➔ {packetVisual.after.dst}</span>
            </div>
          </div>
        </div>
      )}

      {/* LIVE NAT TRANSLATION TABLE */}
      <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
        <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '0.92rem', display: 'flex', justifyContent: 'space-between' }}>
          <span>📋 NAT Translation State Table (NAPT)</span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Entries: {natTable.length}</span>
        </h4>

        {natTable.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-code)', borderRadius: '6px' }}>
            NAT Translation Table is Empty (No active NAT sessions).
          </div>
        ) : (
          <div style={{ background: 'var(--bg-code)', borderRadius: '6px', overflow: 'hidden', fontSize: '0.8rem', fontFamily: 'monospace' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Proto</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Internal (Private) Socket</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>NAT Public Socket (SNAT)</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>Destination Socket</th>
                  <th style={{ padding: '0.4rem 0.6rem' }}>State</th>
                </tr>
              </thead>
              <tbody>
                {natTable.map((entry) => (
                  <tr key={entry.id} style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-info)' }}>{entry.proto}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--cat-base)' }}>{entry.internal}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-success)' }}>{entry.translated}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-warning)' }}>{entry.external}</td>
                    <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-success)' }}>{entry.state}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
          Status: <em>{lastAction}</em>
        </div>
      </div>
    </div>
  )
}
