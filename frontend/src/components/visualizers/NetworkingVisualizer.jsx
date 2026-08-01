import React, { useState, useEffect } from 'react'
import ConsistentHashingVisualizer from './networking/ConsistentHashingVisualizer'

export default function NetworkingVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'osi-model': return 'encapsulation'
      case 'data-link-layer': return 'arq'
      case 'ip-subnetting': return 'subnet'
      case 'routing-algorithms': return 'routing'
      case 'tcp-ip':
      case 'tcp-congestion': return 'handshake'
      case 'application-layer':
      case 'network-security': return 'dns'
      default: return 'encapsulation'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // ==========================================
  // MODE 1: OSI 7-LAYER ENCAPSULATION
  // ==========================================
  const [encapStep, setEncapStep] = useState(0)
  const layers = [
    { name: '7. Application', header: 'HTTP/1.1 GET /api/v1/topics', color: '#8b5cf6' },
    { name: '6. Presentation', header: 'TLS 1.3 Encryption Metadata', color: '#ec4899' },
    { name: '5. Session', header: 'Session Token (ID: 0x9F82)', color: '#06b6d4' },
    { name: '4. Transport', header: 'TCP (SrcPort: 5173, DstPort: 80, Seq: 100)', color: '#10b981' },
    { name: '3. Network', header: 'IP (SrcIP: 192.168.1.50, DstIP: 142.250.190.46, TTL: 64)', color: '#f59e0b' },
    { name: '2. Data Link', header: 'Ethernet MAC (Src: 00:1A:2B, Dst: CC:DD:EE, CRC32)', color: '#ef4444' },
  ]

  // ==========================================
  // MODE 2: ARQ FLOW CONTROL (GBN vs SELECTIVE REPEAT)
  // ==========================================
  const [arqMode, setArqMode] = useState('gbn') // 'gbn', 'sr'
  const [frames, setFrames] = useState([
    { id: 0, status: 'sent', acked: true },
    { id: 1, status: 'lost', acked: false },
    { id: 2, status: 'buffered', acked: false },
    { id: 3, status: 'buffered', acked: false },
    { id: 4, status: 'pending', acked: false },
  ])
  const [arqLog, setArqLog] = useState([])

  const handleSimulateLoss = () => {
    if (arqMode === 'gbn') {
      setArqLog(prev => [
        `[Go-Back-N ARQ] 🚨 Frame #1 LOST! Receiver discards subsequent Frames #2 and #3.`,
        `[Go-Back-N ARQ] 🔄 Retransmitting ALL frames in window starting from Frame #1: (F1, F2, F3)...`,
        ...prev
      ])
    } else {
      setArqLog(prev => [
        `[Selective Repeat ARQ] 🚨 Frame #1 LOST! Receiver BUFFERS Frames #2 and #3 in memory.`,
        `[Selective Repeat ARQ] 🔄 Retransmitting ONLY missing Frame #1. No redundant resends!`,
        ...prev
      ])
    }
  }

  // ==========================================
  // MODE 3: CIDR SUBNET CALCULATOR
  // ==========================================
  const [ipAddress, setIpAddress] = useState('192.168.1.50')
  const [cidr, setCidr] = useState(24)
  const [sub, setSub] = useState({ valid: true })

  useEffect(() => {
    setSub(calcSubnet(ipAddress, cidr))
  }, [ipAddress, cidr])

  const calcSubnet = (ipVal, cidrVal) => {
    try {
      const parts = (ipVal || '').split('.').map(Number)
      if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return { valid: false }
      }
      const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
      const maskNum = cidrVal === 0 ? 0 : (~0 << (32 - cidrVal)) >>> 0
      const netNum = (ipNum & maskNum) >>> 0
      const bcastNum = (netNum | (~maskNum >>> 0)) >>> 0

      const numToIp = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')
      const totalHosts = Math.pow(2, 32 - cidrVal)
      const usableHosts = totalHosts > 2 ? totalHosts - 2 : totalHosts

      return {
        valid: true,
        networkIp: numToIp(netNum),
        broadcastIp: numToIp(bcastNum),
        subnetMask: numToIp(maskNum),
        firstHost: numToIp(netNum + 1),
        lastHost: numToIp(bcastNum - 1),
        totalHosts,
        usableHosts
      }
    } catch (e) {
      return { valid: false }
    }
  }

  // ==========================================
  // MODE 4: ROUTING ALGORITHMS (DIJKSTRA SHORTEST PATH)
  // ==========================================
  const [targetRouter, setTargetRouter] = useState('Router E')
  const routes = {
    'Router B': { cost: 2, path: 'Router A ➔ Router B', hops: 1 },
    'Router C': { cost: 5, path: 'Router A ➔ Router B ➔ Router C', hops: 2 },
    'Router D': { cost: 4, path: 'Router A ➔ Router D', hops: 1 },
    'Router E': { cost: 6, path: 'Router A ➔ Router D ➔ Router E', hops: 2 },
  }

  // ==========================================
  // MODE 5: TCP HANDSHAKE & CONGESTION CONTROL (cwnd)
  // ==========================================
  const [handshakeStep, setHandshakeStep] = useState(0)
  const [cwndPhase, setCwndPhase] = useState('slowstart') // 'slowstart', 'avoidance', 'fastack'
  const [cwndValue, setCwndValue] = useState(1)

  const handleAdvanceCwnd = () => {
    if (cwndPhase === 'slowstart') {
      const nextVal = cwndValue * 2
      if (nextVal >= 16) {
        setCwndPhase('avoidance')
        setCwndValue(16)
      } else {
        setCwndValue(nextVal)
      }
    } else if (cwndPhase === 'avoidance') {
      setCwndValue(prev => prev + 1)
    }
  }

  const triggerFastRetransmit = () => {
    setCwndPhase('fastack')
    setCwndValue(Math.max(1, Math.floor(cwndValue / 2) + 3))
  }

  // ==========================================
  // MODE 6: DNS RESOLUTION & HTTP/3 QUIC
  // ==========================================
  const [dnsStep, setDnsStep] = useState(0)
  const dnsSteps = [
    { title: 'Step 1: Browser ➔ Local Recursive Resolver', desc: 'Checks OS Cache / ISP Resolver for "csfundamentals.com"' },
    { title: 'Step 2: Resolver ➔ Root Nameserver (.)', desc: 'Root Server refers resolver to .COM TLD Server IP' },
    { title: 'Step 3: Resolver ➔ .COM TLD Nameserver', desc: 'TLD Server refers resolver to Authoritative Nameserver IP' },
    { title: 'Step 4: Resolver ➔ Authoritative Nameserver', desc: 'Authoritative server returns A Record: "142.250.190.46"' },
  ]

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🌐 Interactive Computer Networks Visualizer Suite</h2>
          <p>Explore OSI Encapsulation, ARQ Error Control, CIDR Subnetting, Dijkstra Routing, TCP Congestion & DNS/HTTP/3.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher" style={{ marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('encapsulation')}
            className={`main-tab-btn ${activeTab === 'encapsulation' ? 'active-tab' : ''}`}
          >
            📦 OSI 7-Layer Encapsulation
          </button>
          <button
            onClick={() => setActiveTab('arq')}
            className={`main-tab-btn ${activeTab === 'arq' ? 'active-tab' : ''}`}
          >
            🔄 ARQ Error Control (GBN vs SR)
          </button>
          <button
            onClick={() => setActiveTab('subnet')}
            className={`main-tab-btn ${activeTab === 'subnet' ? 'active-tab' : ''}`}
          >
            🧮 CIDR Subnet Calculator
          </button>
          <button
            onClick={() => setActiveTab('routing')}
            className={`main-tab-btn ${activeTab === 'routing' ? 'active-tab' : ''}`}
          >
            🗺️ Routing (Dijkstra)
          </button>
          <button
            onClick={() => setActiveTab('handshake')}
            className={`main-tab-btn ${activeTab === 'handshake' ? 'active-tab' : ''}`}
          >
            🤝 TCP Handshake & cwnd
          </button>
          <button
            onClick={() => setActiveTab('dns')}
            className={`main-tab-btn ${activeTab === 'dns' ? 'active-tab' : ''}`}
          >
            🌐 DNS & HTTP/3 QUIC
          </button>
          <button
            onClick={() => setActiveTab('consistent-hashing')}
            className={`main-tab-btn ${activeTab === 'consistent-hashing' ? 'active-tab' : ''}`}
          >
            ⭕ Consistent Hashing Ring
          </button>
        </div>
      </div>

      {/* MODE 1: OSI ENCAPSULATION */}
      {activeTab === 'encapsulation' && (
        <div className="viz-card">
          <h3>📦 Layered Packet Encapsulation & Header PDU Inspection</h3>

          <div className="action-buttons-group" style={{ marginBottom: '1.5rem', display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => setEncapStep(0)} className="btn btn-secondary">⏮ Reset</button>
            <button onClick={() => setEncapStep(prev => Math.max(0, prev - 1))} disabled={encapStep <= 0} className="btn btn-secondary">◀ Step Back</button>
            <button onClick={() => setEncapStep(prev => Math.min(5, prev + 1))} disabled={encapStep >= 5} className="btn btn-primary">Step Next Layer ▶</button>
          </div>

          <div className="encap-layers-container">
            {layers.map((l, idx) => {
              const isAdded = idx <= encapStep
              return (
                <div
                  key={l.name}
                  className={`encap-layer-row ${isAdded ? 'layer-active' : 'layer-inactive'}`}
                  style={{ borderLeftColor: l.color }}
                >
                  <div className="layer-title" style={{ color: l.color }}>{l.name}</div>
                  <div className="layer-header-box">
                    {isAdded ? (
                      <span className="header-pill" style={{ backgroundColor: l.color }}>
                        [{l.header}]
                      </span>
                    ) : (
                      <span className="header-pending">Header Pending</span>
                    )}
                  </div>
                </div>
              )
            })}

            <div className="encap-payload-box">
              <span className="payload-title">APPLICATION DATA PAYLOAD:</span>
              <code>"GET /api/v1/topics HTTP/1.1"</code>
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: ARQ FLOW CONTROL */}
      {activeTab === 'arq' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🔄 ARQ Error Control Protocol Simulator</h3>

            <div className="main-tab-switcher" style={{ margin: '1rem 0' }}>
              <button onClick={() => setArqMode('gbn')} className={`main-tab-btn ${arqMode === 'gbn' ? 'active-tab' : ''}`}>
                Go-Back-N ARQ (Window N=4)
              </button>
              <button onClick={() => setArqMode('sr')} className={`main-tab-btn ${arqMode === 'sr' ? 'active-tab' : ''}`}>
                Selective Repeat ARQ (Window N=4)
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px', marginTop: '1rem' }}>
              <h4>Sender Window Frames State</h4>
              <div style={{ display: 'flex', gap: '0.75rem', margin: '1rem 0' }}>
                {frames.map(f => (
                  <div
                    key={f.id}
                    style={{
                      background: f.acked ? '#059669' : f.status === 'lost' ? '#dc2626' : f.status === 'buffered' ? '#d97706' : '#1e293b',
                      padding: '1rem',
                      borderRadius: '8px',
                      textAlign: 'center',
                      flex: 1,
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <strong>Frame #{f.id}</strong>
                    <div style={{ fontSize: '0.75rem', marginTop: '0.3rem' }}>
                      {f.acked ? 'ACKed ✅' : f.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>

              <button onClick={handleSimulateLoss} className="btn btn-primary" style={{ width: '100%' }}>
                ⚡ Simulate Frame #1 Packet Loss
              </button>
            </div>
          </div>

          <div className="viz-card">
            <h3>📜 ARQ Retransmission Audit Log</h3>
            <div className="event-log-container" style={{ maxHeight: '220px' }}>
              {arqLog.map((log, idx) => (
                <div key={idx} className="log-entry"><span className="log-text">{log}</span></div>
              ))}
              {arqLog.length === 0 && (
                <span className="empty-text">Click "Simulate Frame #1 Packet Loss" to compare Go-Back-N vs Selective Repeat handling!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 3: CIDR SUBNET CALCULATOR */}
      {activeTab === 'subnet' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🧮 CIDR IPv4 Subnet Mask Solver</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>IP Address:</label>
                <input
                  type="text"
                  value={ipAddress}
                  onChange={e => setIpAddress(e.target.value)}
                  className="num-input"
                  style={{ width: '100%', marginTop: '0.3rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>CIDR Prefix (/{cidr}):</label>
                <input
                  type="range"
                  min="0"
                  max="30"
                  value={cidr}
                  onChange={e => setCidr(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Network Subnet Breakdown</h3>

            {sub.valid ? (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Network Address:</span>
                  <strong style={{ color: 'var(--accent-purple)' }}>{sub.networkIp} /{cidr}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Subnet Mask:</span>
                  <strong>{sub.subnetMask}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Broadcast Address:</span>
                  <strong>{sub.broadcastIp}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span>Usable Host IP Range:</span>
                  <strong style={{ color: 'var(--accent-green)' }}>{sub.firstHost} — {sub.lastHost}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Usable Hosts:</span>
                  <strong>{sub.usableHosts} hosts</strong>
                </div>
              </div>
            ) : (
              <span className="empty-text">Invalid IP Address format.</span>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: ROUTING ALGORITHMS (DIJKSTRA) */}
      {activeTab === 'routing' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🗺️ Link State Dijkstra Shortest Path Engine</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px', marginTop: '1rem' }}>
              <h4>Source Node: Router A</h4>
              <div style={{ margin: '1rem 0' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Select Destination Router:</label>
                <select
                  value={targetRouter}
                  onChange={e => setTargetRouter(e.target.value)}
                  className="num-input"
                  style={{ width: '100%', marginTop: '0.3rem' }}
                >
                  <option value="Router B">Router B (Direct Link)</option>
                  <option value="Router C">Router C (Via B)</option>
                  <option value="Router D">Router D (Direct Link)</option>
                  <option value="Router E">Router E (Via D)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Dijkstra Optimal Routing Table Result</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Shortest Path:</span>
                <strong style={{ color: 'var(--accent-green)' }}>{routes[targetRouter]?.path}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Accumulated Path Metric Cost:</span>
                <strong style={{ color: 'var(--accent-purple)', fontSize: '1.2rem' }}>{routes[targetRouter]?.cost} units</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Total Hop Count:</span>
                <strong>{routes[targetRouter]?.hops} hops</strong>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 5: TCP HANDSHAKE & CONGESTION CONTROL */}
      {activeTab === 'handshake' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🤝 TCP 3-Way Handshake Connection State</h3>

            <div className="action-buttons-group" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setHandshakeStep(0)} className="btn btn-secondary">⏮ Reset</button>
              <button onClick={() => setHandshakeStep(prev => Math.min(3, prev + 1))} disabled={handshakeStep >= 3} className="btn btn-primary">
                Advance Step ▶
              </button>
            </div>

            <div className="handshake-diagram">
              <div className="host-column">
                <h4>Client</h4>
                <div className="host-badge">192.168.1.50:5173</div>
                <div className="host-state">
                  STATE: <strong>{handshakeStep === 0 ? 'CLOSED' : handshakeStep === 1 ? 'SYN_SENT' : 'ESTABLISHED'}</strong>
                </div>
              </div>

              <div className="packets-channel">
                {handshakeStep >= 1 && <div className="packet-arrow">1. SYN (Seq=100)</div>}
                {handshakeStep >= 2 && <div className="packet-arrow">2. SYN-ACK (Seq=300, Ack=101)</div>}
                {handshakeStep >= 3 && <div className="packet-arrow">3. ACK (Ack=301)</div>}
              </div>

              <div className="host-column">
                <h4>Server</h4>
                <div className="host-badge">142.250.190.46:80</div>
                <div className="host-state">
                  STATE: <strong>{handshakeStep < 2 ? 'LISTEN / SYN_RCVD' : 'ESTABLISHED'}</strong>
                </div>
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📈 TCP Congestion Control (`cwnd`) Engine</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Current Phase:</span>
                <strong style={{ color: cwndPhase === 'slowstart' ? 'var(--accent-blue)' : cwndPhase === 'avoidance' ? 'var(--accent-green)' : 'var(--accent-red)' }}>
                  {cwndPhase === 'slowstart' ? '🚀 Slow Start (Exponential)' : cwndPhase === 'avoidance' ? '📈 Congestion Avoidance (AIMD Linear)' : '⚡ Fast Retransmit (3 Dup ACKs)'}
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span>Congestion Window (`cwnd`):</span>
                <strong style={{ fontSize: '1.4rem', color: 'var(--accent-purple)' }}>{cwndValue} MSS</strong>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={handleAdvanceCwnd} className="btn btn-primary" style={{ flex: 1 }}>
                  ▶ Receive ACK (Grow cwnd)
                </button>
                <button onClick={triggerFastRetransmit} className="btn btn-secondary" style={{ flex: 1 }}>
                  🚨 3 Duplicate ACKs (Fast Retransmit)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODE 6: DNS RESOLUTION & HTTP/3 QUIC */}
      {activeTab === 'dns' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🌐 Recursive DNS Lookup Resolution Steps</h3>

            <div className="action-buttons-group" style={{ marginBottom: '1.25rem', display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => setDnsStep(0)} className="btn btn-secondary">⏮ Reset</button>
              <button onClick={() => setDnsStep(prev => Math.min(3, prev + 1))} disabled={dnsStep >= 3} className="btn btn-primary">
                Next Resolution Step ▶
              </button>
            </div>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <h4 style={{ color: 'var(--accent-purple)' }}>{dnsSteps[dnsStep].title}</h4>
              <p style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>{dnsSteps[dnsStep].desc}</p>
            </div>
          </div>

          <div className="viz-card">
            <h3>⚡ HTTP/3 QUIC (UDP) vs HTTP/2 (TCP)</h3>
            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <p style={{ fontSize: '0.85rem' }}>
                HTTP/3 runs over <strong>UDP (QUIC)</strong>, eliminating TCP Head-of-Line Blocking and achieving <strong>0-RTT / 1-RTT connection setup</strong>!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* MODE 7: CONSISTENT HASHING RING */}
      {activeTab === 'consistent-hashing' && (
        <ConsistentHashingVisualizer />
      )}
    </div>
  )
}
