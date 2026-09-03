import React, { useState } from 'react'

export default function ArpResolutionVisualizer() {
  const [step, setStep] = useState(0)

  const steps = [
    {
      title: 'Step 1: ARP Cache Lookup (Cache Miss)',
      desc: 'Host A (192.168.1.2) wants to transmit an IP packet to Host B (192.168.1.5). Host A inspects its local OS kernel ARP cache table. The mapping for 192.168.1.5 is NOT found (Cache Miss).',
      activeNode: 'Host A',
      frameType: 'Internal Cache Lookup',
      frameSrc: '192.168.1.2 (Host A)',
      frameDst: 'ARP Cache Table',
      broadcast: false,
      cacheEntries: []
    },
    {
      title: 'Step 2: Layer 2 Broadcast ARP Request',
      desc: 'Host A constructs an ARP Request Ethernet frame. Destination MAC is set to FF:FF:FF:FF:FF:FF (Broadcast). The switch floods the frame out of all ports to all LAN nodes.',
      activeNode: 'Switch Broadcast',
      frameType: 'ARP Request ("Who has 192.168.1.5? Tell 192.168.1.2")',
      frameSrc: 'MAC: AA:00:11:22:33:01',
      frameDst: 'MAC: FF:FF:FF:FF:FF:FF (Broadcast)',
      broadcast: true,
      cacheEntries: []
    },
    {
      title: 'Step 3: Host Filtering & Target Processing',
      desc: 'Host C (192.168.1.3) and Host D (192.168.1.4) inspect the target IP in the ARP frame, realize it is not their IP, and silently drop the frame. Host B (192.168.1.5) identifies itself as the designated target.',
      activeNode: 'Host B (Target)',
      frameType: 'Target Matched (192.168.1.5)',
      frameSrc: 'Host B Evaluates Request',
      frameDst: 'Prepares Unicast Reply',
      broadcast: false,
      cacheEntries: []
    },
    {
      title: 'Step 4: Unicast ARP Reply',
      desc: 'Host B sends a direct unicast ARP Reply to Host A: "192.168.1.5 is at MAC BB:00:55:66:77:02". The switch forwards it directly to Host A without flooding.',
      activeNode: 'Host B ➔ Host A',
      frameType: 'ARP Reply ("192.168.1.5 is at BB:00:55:66:77:02")',
      frameSrc: 'MAC: BB:00:55:66:77:02 (Host B)',
      frameDst: 'MAC: AA:00:11:22:33:01 (Host A)',
      broadcast: false,
      cacheEntries: []
    },
    {
      title: 'Step 5: ARP Cache Population & Packet Transmission',
      desc: 'Host A updates its kernel ARP table with the newly resolved MAC address (TTL: 1200s). Host A can now encapsulate the IP packet into an Ethernet Frame and transmit at wire speed.',
      activeNode: 'Host A (Resolved)',
      frameType: 'Ethernet Frame (IP Payload)',
      frameSrc: 'AA:00:11:22:33:01',
      frameDst: 'BB:00:55:66:77:02',
      broadcast: false,
      cacheEntries: [
        { ip: '192.168.1.5', mac: 'BB:00:55:66:77:02', type: 'Dynamic', ttl: '1198s' }
      ]
    }
  ]

  const current = steps[step]

  return (
    <div className="viz-card" style={{ border: '1px solid var(--border-subtle)' }}>
      <div style={{ marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, color: 'var(--cat-os-base)' }}>
          🔍 ARP (Address Resolution Protocol) Simulation
        </h3>
        <p style={{ margin: '0.35rem 0 0', color: 'var(--text-secondary)', fontSize: '0.88rem' }}>
          Discover how IP addresses at Layer 3 are resolved into physical Ethernet MAC addresses at Layer 2.
        </p>
      </div>

      {/* CONTROLS */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <button onClick={() => setStep(0)} className="btn btn-secondary">
          ⏮ Reset
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

      {/* LAN TOPOLOGY VISUALIZATION */}
      <div style={{ background: 'var(--bg-code)', padding: '1.25rem', borderRadius: '12px', marginBottom: '1.25rem', border: '1px solid var(--state-info-border)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '0.75rem', textAlign: 'center' }}>
          {/* HOST A */}
          <div style={{ background: step === 0 || step === 4 ? 'var(--cat-tint)' : 'var(--bg-raised)', border: step === 0 || step === 4 ? '2px solid var(--cat-base)' : '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem' }}>💻</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>Host A (Sender)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--state-info)', fontFamily: 'monospace' }}>192.168.1.2</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>AA:00:11:22:33:01</div>
          </div>

          {/* HOST B */}
          <div style={{ background: step === 2 || step === 3 ? 'var(--state-success-tint)' : 'var(--bg-raised)', border: step === 2 || step === 3 ? '2px solid var(--state-success)' : '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem' }}>🖥️</div>
            <div style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '0.85rem' }}>Host B (Target)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--state-info)', fontFamily: 'monospace' }}>192.168.1.5</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontFamily: 'monospace' }}>BB:00:55:66:77:02</div>
          </div>

          {/* HOST C */}
          <div style={{ background: step === 2 ? 'var(--state-danger-tint)' : 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem' }}>💻</div>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Host C (Drop)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>192.168.1.3</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>CC:00:33:44:55:03</div>
          </div>

          {/* HOST D */}
          <div style={{ background: step === 2 ? 'var(--state-danger-tint)' : 'var(--bg-raised)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '0.75rem' }}>
            <div style={{ fontSize: '1.5rem' }}>💻</div>
            <div style={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Host D (Drop)</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>192.168.1.4</div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>DD:00:77:88:99:04</div>
          </div>
        </div>
      </div>

      {/* STEP INFO & HOST A ARP CACHE TABLE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
        {/* CURRENT STEP CARD */}
        <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1rem', borderRadius: '10px', borderLeft: '4px solid var(--cat-base)' }}>
          <h4 style={{ margin: '0 0 0.4rem', color: 'var(--cat-base)', fontSize: '0.95rem' }}>{current.title}</h4>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.88rem', lineHeight: '1.5', margin: '0 0 0.5rem' }}>
            {current.desc}
          </p>
          <div style={{ fontSize: '0.8rem', color: 'var(--state-info)', fontFamily: 'monospace', background: 'var(--bg-code)', padding: '0.4rem 0.6rem', borderRadius: '4px' }}>
            {current.frameType}
          </div>
        </div>

        {/* HOST A ARP CACHE TABLE */}
        <div style={{ background: 'color-mix(in srgb, var(--bg-page) 88%, transparent)', padding: '1rem', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
          <h4 style={{ margin: '0 0 0.5rem', color: 'var(--text-primary)', fontSize: '0.95rem', display: 'flex', justifyContent: 'space-between' }}>
            <span>📋 Host A Kernel ARP Cache</span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>arp -a</span>
          </h4>

          {current.cacheEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-muted)', fontSize: '0.82rem', background: 'var(--bg-code)', borderRadius: '6px' }}>
              No cached ARP entries (Cache Empty)
            </div>
          ) : (
            <div style={{ background: 'var(--bg-code)', borderRadius: '6px', overflow: 'hidden', fontSize: '0.8rem', fontFamily: 'monospace' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: 'var(--bg-raised)', color: 'var(--text-secondary)' }}>
                    <th style={{ padding: '0.4rem 0.6rem' }}>IP Address</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>MAC Address</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>Type</th>
                    <th style={{ padding: '0.4rem 0.6rem' }}>TTL</th>
                  </tr>
                </thead>
                <tbody>
                  {current.cacheEntries.map((e, idx) => (
                    <tr key={idx} style={{ borderTop: '1px solid var(--border-subtle)', color: 'var(--state-success)' }}>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{e.ip}</td>
                      <td style={{ padding: '0.4rem 0.6rem' }}>{e.mac}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-info)' }}>{e.type}</td>
                      <td style={{ padding: '0.4rem 0.6rem', color: 'var(--state-warning)' }}>{e.ttl}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
