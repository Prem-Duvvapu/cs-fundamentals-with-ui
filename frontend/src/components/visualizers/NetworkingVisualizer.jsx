import React, { useState, useEffect } from 'react'
import ConsistentHashingVisualizer from './networking/ConsistentHashingVisualizer'
import TcpCongestionVisualizer from './networking/TcpCongestionVisualizer'
import TcpSegmentVisualizer from './networking/TcpSegmentVisualizer'
import TrafficShapingVisualizer from './networking/TrafficShapingVisualizer'
import DhcpDoraVisualizer from './networking/DhcpDoraVisualizer'
import ArpResolutionVisualizer from './networking/ArpResolutionVisualizer'
import NatTranslationVisualizer from './networking/NatTranslationVisualizer'
import DistanceVectorVisualizer from './networking/DistanceVectorVisualizer'
import { networkTopologies } from '../../utils/networkTopologyData'
import { computeWaveform } from '../../utils/encodingWaveform'

export default function NetworkingVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'network-fundamentals': return 'topology'
      case 'physical-layer-media': return 'physical'
      case 'osi-model': return 'encapsulation'
      case 'data-link-layer': return 'arq'
      case 'ip-subnetting': return 'subnet'
      case 'routing-algorithms': return 'routing'
      case 'tcp-ip':
      case 'tcp-congestion': return 'handshake'
      case 'transport-layer-protocols': return 'tcp-segment'
      case 'application-layer':
      case 'network-security': return 'dns'
      case 'network-performance-qos': return 'traffic-shaping'
      default: return 'encapsulation'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  useEffect(() => {
    if (defaultTopicId) {
      setActiveTab(getInitialTab())
    }
  }, [defaultTopicId])

  // ==========================================
  // TOPOLOGY EXPLORER STATE
  // ==========================================
  const [selectedTopologyKey, setSelectedTopologyKey] = useState('star')
  const currentTopo = networkTopologies[selectedTopologyKey] || networkTopologies.star

  // ==========================================
  // PHYSICAL LAYER & WAVEFORM ENCODING STATE
  // ==========================================
  const [bitInput, setBitInput] = useState('10110010')
  const [encodingType, setEncodingType] = useState('manchester')
  const waveformData = computeWaveform(bitInput, encodingType)

  // ==========================================
  // MODE 1: OSI 7-LAYER ENCAPSULATION
  // ==========================================
  const [encapStep, setEncapStep] = useState(0)
  const layers = [
    { name: '7. Application', header: 'HTTP/1.1 GET /api/v1/topics', color: 'var(--cat-os-base)' },
    { name: '6. Presentation', header: 'TLS 1.3 Encryption Metadata', color: 'var(--cat-aiml-base)' },
    { name: '5. Session', header: 'Session Token (ID: 0x9F82)', color: 'var(--state-info)' },
    { name: '4. Transport', header: 'TCP (SrcPort: 5173, DstPort: 80, Seq: 100)', color: 'var(--state-success)' },
    { name: '3. Network', header: 'IP (SrcIP: 192.168.1.50, DstIP: 142.250.190.46, TTL: 64)', color: 'var(--state-warning)' },
    { name: '2. Data Link', header: 'Ethernet MAC (Src: 00:1A:2B, Dst: CC:DD:EE, CRC32)', color: 'var(--state-danger)' },
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

  useEffect(() => {
    setSub(calcSubnet(ipAddress, cidr))
  }, [ipAddress, cidr])

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
  // MODE 5: TCP HANDSHAKE & CONGESTION CONTROL
  // ==========================================
  const [handshakeStep, setHandshakeStep] = useState(0)

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
          <p>Explore Topologies, Physical Signals, OSI Encapsulation, ARQ Error Control, Subnetting, Routing, Protocols & QoS.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher hub-subnav">
          <button
            onClick={() => setActiveTab('topology')}
            className={`main-tab-btn ${activeTab === 'topology' ? 'active-tab' : ''}`}
          >
            🔗 Topologies
          </button>
          <button
            onClick={() => setActiveTab('physical')}
            className={`main-tab-btn ${activeTab === 'physical' ? 'active-tab' : ''}`}
          >
            📡 Physical & Signals
          </button>
          <button
            onClick={() => setActiveTab('encapsulation')}
            className={`main-tab-btn ${activeTab === 'encapsulation' ? 'active-tab' : ''}`}
          >
            📦 OSI 7-Layer
          </button>
          <button
            onClick={() => setActiveTab('arq')}
            className={`main-tab-btn ${activeTab === 'arq' ? 'active-tab' : ''}`}
          >
            🔄 ARQ Flow Control
          </button>
          <button
            onClick={() => setActiveTab('subnet')}
            className={`main-tab-btn ${activeTab === 'subnet' ? 'active-tab' : ''}`}
          >
            🧮 CIDR Subnetting
          </button>
          <button
            onClick={() => setActiveTab('dhcp')}
            className={`main-tab-btn ${activeTab === 'dhcp' ? 'active-tab' : ''}`}
          >
            📡 DHCP DORA
          </button>
          <button
            onClick={() => setActiveTab('arp')}
            className={`main-tab-btn ${activeTab === 'arp' ? 'active-tab' : ''}`}
          >
            🔍 ARP Resolution
          </button>
          <button
            onClick={() => setActiveTab('nat')}
            className={`main-tab-btn ${activeTab === 'nat' ? 'active-tab' : ''}`}
          >
            🔄 NAT Table
          </button>
          <button
            onClick={() => setActiveTab('routing')}
            className={`main-tab-btn ${activeTab === 'routing' ? 'active-tab' : ''}`}
          >
            🗺️ Dijkstra Routing
          </button>
          <button
            onClick={() => setActiveTab('distance-vector')}
            className={`main-tab-btn ${activeTab === 'distance-vector' ? 'active-tab' : ''}`}
          >
            📊 Distance Vector
          </button>
          <button
            onClick={() => setActiveTab('handshake')}
            className={`main-tab-btn ${activeTab === 'handshake' ? 'active-tab' : ''}`}
          >
            🤝 TCP Handshake
          </button>
          <button
            onClick={() => setActiveTab('tcp-segment')}
            className={`main-tab-btn ${activeTab === 'tcp-segment' ? 'active-tab' : ''}`}
          >
            📋 TCP/UDP Headers
          </button>
          <button
            onClick={() => setActiveTab('dns')}
            className={`main-tab-btn ${activeTab === 'dns' ? 'active-tab' : ''}`}
          >
            🌐 DNS & QUIC
          </button>
          <button
            onClick={() => setActiveTab('traffic-shaping')}
            className={`main-tab-btn ${activeTab === 'traffic-shaping' ? 'active-tab' : ''}`}
          >
            🪣 Traffic Shaping (QoS)
          </button>
          <button
            onClick={() => setActiveTab('consistent-hashing')}
            className={`main-tab-btn ${activeTab === 'consistent-hashing' ? 'active-tab' : ''}`}
          >
            ⭕ Consistent Hashing
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: TOPOLOGY EXPLORER */}
      {activeTab === 'topology' && (
        <div className="viz-card">
          <div className="viz-section-intro">
            <h3>🔗 Network Topologies & Architectural Fault Tolerance</h3>
            <p>Select a topology to inspect connection geometries, cabling cost formulas, and failure isolation boundaries.</p>
          </div>

          <div className="topo-choice-row">
            {Object.keys(networkTopologies).map(key => (
              <button
                key={key}
                onClick={() => setSelectedTopologyKey(key)}
                className={`btn ${selectedTopologyKey === key ? 'btn-primary' : 'btn-secondary'}`}
              >
                {networkTopologies[key].name}
              </button>
            ))}
          </div>

          {/* TOPOLOGY VISUAL ARCHITECTURE */}
          <div className="topo-diagram">
            <div className="topo-diagram-label">
              <span className="header-pill">
                {currentTopo.name} Architecture
              </span>
            </div>

            <div className="topo-canvas">
              {selectedTopologyKey === 'star' && (
                <div className="topo-star-grid">
                  <div />
                  <div className="topo-node">💻 Node A</div>
                  <div />
                  <div className="topo-node">💻 Node D</div>
                  <div className="topo-switch">🔀 Switch</div>
                  <div className="topo-node">💻 Node B</div>
                  <div />
                  <div className="topo-node">💻 Node C</div>
                  <div />
                </div>
              )}

              {selectedTopologyKey === 'bus' && (
                <div className="topo-bus-wrap">
                  <div className="topo-bus-hosts">
                    <div className="topo-bus-host">💻 Host A</div>
                    <div className="topo-bus-host">💻 Host B</div>
                    <div className="topo-bus-host">💻 Host C</div>
                    <div className="topo-bus-host">💻 Host D</div>
                  </div>
                  <div className="topo-bus-trunk">
                    <div className="topo-bus-terminator is-left">Terminator</div>
                    <div className="topo-bus-terminator is-right">Terminator</div>
                  </div>
                  <div className="topo-bus-caption">
                    Shared Coaxial / Ethernet Backbone Trunk
                  </div>
                </div>
              )}

              {selectedTopologyKey === 'ring' && (
                <div className="topo-ring-grid">
                  <div className="topo-node">💻 Node A ➔</div>
                  <div className="topo-node">💻 Node B ➔</div>
                  <div className="topo-node">▲ 💻 Node D</div>
                  <div className="topo-node">▼ 💻 Node C</div>
                </div>
              )}

              {selectedTopologyKey === 'mesh' && (
                <div className="topo-mesh-grid">
                  {['A', 'B', 'C', 'D'].map(node => (
                    <div key={node} className="topo-mesh-node">
                      <div className="node-name">💻 Node {node}</div>
                      <div className="node-links">3 Dedicated Links</div>
                    </div>
                  ))}
                </div>
              )}

              {selectedTopologyKey === 'hybrid' && (
                <div className="topo-hybrid-wrap">
                  <div className="topo-hybrid-core">
                    🌐 Core Backbone Switch
                  </div>
                  <div className="topo-hybrid-branches">
                    <div className="topo-hybrid-branch">
                      <div className="branch-label is-info">Branch 1 (Star)</div>
                      <div className="branch-hosts">Hosts A1, A2</div>
                    </div>
                    <div className="topo-hybrid-branch">
                      <div className="branch-label is-success">Branch 2 (Star)</div>
                      <div className="branch-hosts">Hosts B1, B2</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* TOPOLOGY ATTRIBUTES BREAKDOWN */}
          <div className="topo-attrs-grid">
            <div className="topo-attr-card attr-fault">
              <div className="attr-label">Fault Tolerance</div>
              <div className="attr-value">{currentTopo.faultTolerance}</div>
            </div>

            <div className="topo-attr-card attr-cable">
              <div className="attr-label">Cabling & Port Count</div>
              <div className="attr-value is-mono">{currentTopo.cableCount}</div>
            </div>

            <div className="topo-attr-card attr-broadcast">
              <div className="attr-label">Broadcast Behavior</div>
              <div className="attr-value">{currentTopo.broadcastBehavior}</div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: PHYSICAL LAYER & SIGNALS */}
      {activeTab === 'physical' && (
        <div className="viz-card">
          <div className="viz-section-intro">
            <h3>📡 Physical Layer Line Encoding & Digital Waveform Generator</h3>
            <p>Enter binary bitstream to visualize real-time clock recovery, voltage transitions, and DC baseline characteristics.</p>
          </div>

          {/* CONTROLS */}
          <div className="phys-controls">
            <div>
              <label>
                Binary Bitstream Input (0s and 1s):
              </label>
              <input
                type="text"
                value={bitInput}
                maxLength={16}
                onChange={(e) => setBitInput(e.target.value.replace(/[^01]/g, ''))}
                className="bitstream-input"
              />
            </div>

            <div>
              <label>
                Line Encoding Scheme:
              </label>
              <div className="phys-encoding-row">
                {[
                  { id: 'manchester', name: 'Manchester (802.3)' },
                  { id: 'nrz-l', name: 'NRZ-L' },
                  { id: 'nrz-i', name: 'NRZ-I' },
                  { id: 'diff-manchester', name: 'Diff Manchester' }
                ].map(enc => (
                  <button
                    key={enc.id}
                    onClick={() => setEncodingType(enc.id)}
                    className={`btn btn-compact ${encodingType === enc.id ? 'btn-primary' : 'btn-secondary'}`}
                  >
                    {enc.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* DIGITAL OSCILLOSCOPE WAVEFORM */}
          <div className="scope-panel">
            <div className="scope-legend">
              <span>+V Level</span>
              <span>Oscilloscope Signal Waveform Time Domain</span>
              <span>0V Level</span>
            </div>

            <div className="scope-track">
              {waveformData.map((item, idx) => (
                <div key={idx} className="scope-bit">
                  <div className="bit-value">
                    Bit '{item.bit}'
                  </div>

                  {/* 2-HALF INTERVAL WAVEFORM BOX */}
                  <div className="scope-wave-box">
                    <div className="scope-wave-half" style={{ justifyContent: item.firstHalf === 'H' ? 'flex-start' : 'flex-end' }}>
                      <div className="scope-wave-bar" />
                    </div>
                    {item.firstHalf !== item.secondHalf && (
                      <div className="scope-wave-edge" />
                    )}
                    <div className="scope-wave-half" style={{ justifyContent: item.secondHalf === 'H' ? 'flex-start' : 'flex-end' }}>
                      <div className="scope-wave-bar" />
                    </div>
                  </div>

                  <div className="bit-label">
                    {item.label}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 3: OSI ENCAPSULATION */}
      {activeTab === 'encapsulation' && (
        <div className="viz-card">
          <h3>📦 Layered Packet Encapsulation & Header PDU Inspection</h3>

          <div className="action-buttons-group">
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

      {/* SUB-TAB 4: ARQ ERROR & FLOW CONTROL */}
      {activeTab === 'arq' && (
        <div className="viz-card">
          <h3>🔄 Sliding Window ARQ Error Control</h3>

          <div className="tab-control-panel">
            <div className="btn-group">
              <button onClick={() => setArqMode('gbn')} className={`btn ${arqMode === 'gbn' ? 'btn-primary' : 'btn-secondary'}`}>
                Go-Back-N (GBN)
              </button>
              <button onClick={() => setArqMode('sr')} className={`btn ${arqMode === 'sr' ? 'btn-primary' : 'btn-secondary'}`}>
                Selective Repeat (SR)
              </button>
            </div>
            <button onClick={handleSimulateLoss} className="btn btn-danger">Simulate Packet Loss 💥</button>
          </div>

          <div className="frames-pipeline">
            {frames.map(f => (
              <div key={f.id} className={`frame-box frame-${f.status}`}>
                <div className="frame-header">Frame #{f.id}</div>
                <div className="frame-status">{f.status.toUpperCase()}</div>
              </div>
            ))}
          </div>

          <div className="arq-console">
            <h4>📋 Protocol Transmission Log:</h4>
            {arqLog.length === 0 ? (
              <p className="empty-log">Click "Simulate Packet Loss" to trigger retransmission flow.</p>
            ) : (
              arqLog.map((log, i) => <div key={i} className="log-line">{log}</div>)
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: CIDR SUBNET CALCULATOR */}
      {activeTab === 'subnet' && (
        <div className="viz-card">
          <h3>🧮 CIDR IPv4 Subnet Calculator & Bitmask Explorer</h3>

          <div className="input-group-inline">
            <div>
              <label>IP Address:</label>
              <input type="text" value={ipAddress} onChange={e => setIpAddress(e.target.value)} className="text-input" />
            </div>
            <div>
              <label>CIDR Prefix (/{cidr}):</label>
              <input type="range" min="8" max="30" value={cidr} onChange={e => setCidr(Number(e.target.value))} />
            </div>
          </div>

          {sub.valid ? (
            <div className="subnet-results-grid">
              <div className="res-card">
                <span className="res-label">Network IP</span>
                <span className="res-val">{sub.networkIp}</span>
              </div>
              <div className="res-card">
                <span className="res-label">Subnet Mask</span>
                <span className="res-val">{sub.subnetMask}</span>
              </div>
              <div className="res-card">
                <span className="res-label">Broadcast IP</span>
                <span className="res-val">{sub.broadcastIp}</span>
              </div>
              <div className="res-card">
                <span className="res-label">Usable Host Range</span>
                <span className="res-val">{sub.firstHost} ➔ {sub.lastHost}</span>
              </div>
              <div className="res-card">
                <span className="res-label">Usable Host Capacity</span>
                <span className="res-val">{sub.usableHosts?.toLocaleString()} hosts</span>
              </div>
            </div>
          ) : (
            <div className="alert-error">Invalid IP address or CIDR mask provided.</div>
          )}
        </div>
      )}

      {/* SUB-TAB 6: DHCP DORA */}
      {activeTab === 'dhcp' && <DhcpDoraVisualizer />}

      {/* SUB-TAB 7: ARP RESOLUTION */}
      {activeTab === 'arp' && <ArpResolutionVisualizer />}

      {/* SUB-TAB 8: NAT TRANSLATION TABLE */}
      {activeTab === 'nat' && <NatTranslationVisualizer />}

      {/* SUB-TAB 9: DIJKSTRA ROUTING */}
      {activeTab === 'routing' && (
        <div className="viz-card">
          <h3>🗺️ Dijkstra Link-State Shortest Path Routing</h3>
          <div className="routing-target-picker">
            <label>Compute Shortest Path from Router A to: </label>
            <select value={targetRouter} onChange={e => setTargetRouter(e.target.value)} className="select-input">
              {Object.keys(routes).map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="route-result-box">
            <h4>Computed Least-Cost Path:</h4>
            <div className="path-display">{routes[targetRouter].path}</div>
            <div className="path-metrics">
              <span>Total Link Metric Cost: <strong>{routes[targetRouter].cost}</strong></span>
              <span>Intermediate Hops: <strong>{routes[targetRouter].hops}</strong></span>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 10: DISTANCE VECTOR */}
      {activeTab === 'distance-vector' && <DistanceVectorVisualizer />}

      {/* SUB-TAB 11: TCP HANDSHAKE & CWND */}
      {activeTab === 'handshake' && (
        <div>
          <div className="viz-card">
            <h3>🤝 TCP 3-Way Handshake & Connection State Machine</h3>
            <div className="action-buttons-group">
              <button onClick={() => setHandshakeStep(0)} className="btn btn-secondary">⏮ Reset</button>
              <button onClick={() => setHandshakeStep(prev => Math.min(2, prev + 1))} disabled={handshakeStep >= 2} className="btn btn-primary">
                Next Handshake Step ▶
              </button>
            </div>

            <div className="handshake-nodes-container">
              <div className="node-box client-node">
                <h4>Client</h4>
                <div className="host-badge">192.168.1.50:5173</div>
                <div className="host-state">
                  STATE: <strong>{handshakeStep === 0 ? 'CLOSED' : handshakeStep === 1 ? 'SYN_SENT' : 'ESTABLISHED'}</strong>
                </div>
              </div>

              <div className="handshake-flow-area">
                <div className={`flow-msg ${handshakeStep >= 0 ? 'active' : ''}`}>1. SYN (seq=100) ➔</div>
                <div className={`flow-msg ${handshakeStep >= 1 ? 'active' : ''}`}>2. ◄ SYN-ACK (seq=300, ack=101)</div>
                <div className={`flow-msg ${handshakeStep >= 2 ? 'active' : ''}`}>3. ACK (ack=301) ➔ [ESTABLISHED]</div>
              </div>

              <div className="node-box server-node">
                <h4>Server</h4>
                <div className="host-badge">142.250.190.46:80</div>
                <div className="host-state">
                  STATE: <strong>{handshakeStep < 2 ? 'LISTEN / SYN_RCVD' : 'ESTABLISHED'}</strong>
                </div>
              </div>
            </div>
          </div>

          <TcpCongestionVisualizer />
        </div>
      )}

      {/* SUB-TAB 12: TCP/UDP HEADERS */}
      {activeTab === 'tcp-segment' && <TcpSegmentVisualizer />}

      {/* SUB-TAB 13: DNS RESOLUTION & HTTP/3 QUIC */}
      {activeTab === 'dns' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🌐 Recursive DNS Lookup Resolution Steps</h3>

            <div className="action-buttons-group">
              <button onClick={() => setDnsStep(0)} className="btn btn-secondary">⏮ Reset</button>
              <button onClick={() => setDnsStep(prev => Math.min(3, prev + 1))} disabled={dnsStep >= 3} className="btn btn-primary">
                Next Resolution Step ▶
              </button>
            </div>

            <div className="dns-step-panel">
              <h4>{dnsSteps[dnsStep].title}</h4>
              <p>{dnsSteps[dnsStep].desc}</p>
            </div>
          </div>

          <div className="viz-card">
            <h3>⚡ HTTP/3 QUIC (UDP) vs HTTP/2 (TCP)</h3>
            <div className="dns-step-panel">
              <p>
                HTTP/3 runs over <strong>UDP (QUIC)</strong>, eliminating TCP Head-of-Line Blocking and achieving <strong>0-RTT / 1-RTT connection setup</strong>!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 14: TRAFFIC SHAPING */}
      {activeTab === 'traffic-shaping' && <TrafficShapingVisualizer />}

      {/* SUB-TAB 15: CONSISTENT HASHING RING */}
      {activeTab === 'consistent-hashing' && (
        <ConsistentHashingVisualizer />
      )}
    </div>
  )
}
