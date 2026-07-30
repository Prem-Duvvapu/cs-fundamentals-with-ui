import React, { useState } from 'react'

export default function NetworkingVisualizer() {
  const [activeTab, setActiveTab] = useState('encapsulation') // 'encapsulation', 'handshake', 'subnet'
  const [encapStep, setEncapStep] = useState(0)

  // Handshake state
  const [handshakeStep, setHandshakeStep] = useState(0)

  // Subnet state
  const [ipAddress, setIpAddress] = useState('192.168.1.50')
  const [cidr, setCidr] = useState(24)

  const handleEncapStep = (step) => {
    if (step < 0 || step > 5) return
    setEncapStep(step)
  }

  const layers = [
    { name: '7. Application', header: 'HTTP Header', color: '#8b5cf6' },
    { name: '6. Presentation', header: 'TLS / SSL Header', color: '#ec4899' },
    { name: '5. Session', header: 'Session ID Header', color: '#06b6d4' },
    { name: '4. Transport', header: 'TCP (SrcPort: 5173, DstPort: 80)', color: '#10b981' },
    { name: '3. Network', header: 'IP (SrcIP: 192.168.1.50, DstIP: 142.250.190.46)', color: '#f59e0b' },
    { name: '2. Data Link', header: 'Ethernet MAC (Src: AA:BB, Dst: CC:DD)', color: '#ef4444' },
  ]

  // Subnet calculation
  const calcSubnet = () => {
    try {
      const parts = ipAddress.split('.').map(Number)
      if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
        return { valid: false }
      }
      const ipNum = (parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]
      const maskNum = cidr === 0 ? 0 : (~0 << (32 - cidr)) >>> 0
      const netNum = (ipNum & maskNum) >>> 0
      const bcastNum = (netNum | (~maskNum >>> 0)) >>> 0

      const numToIp = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].join('.')

      const totalHosts = Math.pow(2, 32 - cidr)
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

  const sub = calcSubnet()

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🌐 Computer Networks Simulator</h2>
          <p>Interactive OSI Encapsulation, TCP 3-Way Handshake, and IP Subnetting Calculator.</p>
        </div>

        <div className="tab-buttons">
          <button
            onClick={() => setActiveTab('encapsulation')}
            className={`btn ${activeTab === 'encapsulation' ? 'btn-primary' : 'btn-secondary'}`}
          >
            OSI Encapsulation
          </button>
          <button
            onClick={() => setActiveTab('handshake')}
            className={`btn ${activeTab === 'handshake' ? 'btn-primary' : 'btn-secondary'}`}
          >
            TCP 3-Way Handshake
          </button>
          <button
            onClick={() => setActiveTab('subnet')}
            className={`btn ${activeTab === 'subnet' ? 'btn-primary' : 'btn-secondary'}`}
          >
            IP Subnet Calculator
          </button>
        </div>
      </div>

      {activeTab === 'encapsulation' && (
        <div className="viz-card">
          <h3>📦 Layered Packet Encapsulation & Decapsulation</h3>

          <div className="control-row" style={{ marginBottom: '1.5rem' }}>
            <button onClick={() => setEncapStep(0)} className="btn btn-secondary">⏮ Reset</button>
            <button onClick={() => handleEncapStep(encapStep - 1)} disabled={encapStep <= 0} className="btn btn-secondary">◀ Step Back</button>
            <button onClick={() => handleEncapStep(encapStep + 1)} disabled={encapStep >= 5} className="btn btn-primary">Step Next Layer ▶</button>
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

            {/* Payload Data at bottom */}
            <div className="encap-payload-box">
              <span className="payload-title">DATA PAYLOAD:</span>
              <code>"GET /api/v1/topics HTTP/1.1"</code>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'handshake' && (
        <div className="viz-card">
          <h3>🤝 TCP 3-Way Connection Handshake</h3>

          <div className="control-row" style={{ marginBottom: '1.5rem' }}>
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
              {handshakeStep >= 1 && (
                <div className="packet-arrow arrow-right">
                  <span>1. SYN (Seq=100)</span>
                </div>
              )}
              {handshakeStep >= 2 && (
                <div className="packet-arrow arrow-left">
                  <span>2. SYN-ACK (Seq=300, Ack=101)</span>
                </div>
              )}
              {handshakeStep >= 3 && (
                <div className="packet-arrow arrow-right">
                  <span>3. ACK (Ack=301)</span>
                </div>
              )}
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
      )}

      {activeTab === 'subnet' && (
        <div className="viz-card">
          <h3>🧮 CIDR IP Subnetting Calculator</h3>
          <div className="mmu-form">
            <div className="form-row">
              <label>IP Address:</label>
              <input
                type="text"
                value={ipAddress}
                onChange={e => setIpAddress(e.target.value)}
                className="text-input"
              />
            </div>
            <div className="form-row">
              <label>CIDR Prefix (/{cidr}):</label>
              <input
                type="number"
                min="0"
                max="32"
                value={cidr}
                onChange={e => setCidr(Number(e.target.value))}
                className="num-input"
              />
            </div>
          </div>

          {sub.valid ? (
            <div className="mmu-results" style={{ marginTop: '1.5rem' }}>
              <div className="mmu-box">
                <span className="mmu-label">Network Address</span>
                <span className="mmu-val highlight-val">{sub.networkIp} /{cidr}</span>
              </div>
              <div className="mmu-box">
                <span className="mmu-label">Subnet Mask</span>
                <span className="mmu-val">{sub.subnetMask}</span>
              </div>
              <div className="mmu-box">
                <span className="mmu-label">Broadcast Address</span>
                <span className="mmu-val">{sub.broadcastIp}</span>
              </div>
              <div className="mmu-box">
                <span className="mmu-label">Usable Host IP Range</span>
                <span className="mmu-val">{sub.firstHost} — {sub.lastHost}</span>
              </div>
              <div className="mmu-box">
                <span className="mmu-label">Total Usable Hosts</span>
                <span className="mmu-val">{sub.usableHosts} hosts</span>
              </div>
            </div>
          ) : (
            <div className="banner-unsafe" style={{ marginTop: '1rem' }}>
              Invalid IP Address format.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
