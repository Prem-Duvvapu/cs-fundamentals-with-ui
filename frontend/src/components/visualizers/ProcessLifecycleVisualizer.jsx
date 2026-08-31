import React, { useState, useEffect } from 'react'

export default function ProcessLifecycleVisualizer() {
  const [activeState, setActiveState] = useState('READY')
  const [pcb, setPcb] = useState({
    pid: 1042,
    ppid: 1,
    state: 'READY',
    programCounter: '0x004011A2',
    eax: '0x00000005',
    ebx: '0x000000A2',
    esp: '0x7FFF0040',
    priority: 2,
    memoryLimit: '64 MB',
    openFiles: ['stdin', 'stdout', '/var/log/app.log']
  })
  const [logs, setLogs] = useState([
    { id: 1, text: 'Process 1042 created in NEW state.', time: '0.00s' },
    { id: 2, text: 'Admitted to READY queue by OS Long-Term Scheduler.', time: '0.02s' }
  ])
  const [mode, setMode] = useState('lifecycle') // 'lifecycle' or 'context-switch'
  const [isSwitching, setIsSwitching] = useState(false)
  const [contextProcess, setContextProcess] = useState('P1')

  const triggerStateChange = (nextState, logText) => {
    setActiveState(nextState)
    setPcb(prev => ({
      ...prev,
      state: nextState,
      programCounter: `0x0040${Math.floor(1000 + Math.random() * 9000).toString(16).toUpperCase()}`,
      eax: `0x0000${Math.floor(10 + Math.random() * 90).toString(16).toUpperCase()}`
    }))
    setLogs(prev => [
      { id: Date.now(), text: logText, time: `${(prev.length * 0.4 + 0.1).toFixed(2)}s` },
      ...prev.slice(0, 7)
    ])
  }

  const handleContextSwitch = () => {
    setIsSwitching(true)
    setTimeout(() => {
      setContextProcess(prev => prev === 'P1' ? 'P2' : 'P1')
      setIsSwitching(false)
    }, 1200)
  }

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🔄 Process Lifecycle & Context Switch Visualizer</h2>
          <p>Interactive state machine transitions, Process Control Block (PCB) inspector, and context switch mechanics.</p>
        </div>

        <div className="tab-buttons">
          <button
            onClick={() => setMode('lifecycle')}
            className={`btn ${mode === 'lifecycle' ? 'btn-primary' : 'btn-secondary'}`}
          >
            State Machine & PCB
          </button>
          <button
            onClick={() => setMode('context-switch')}
            className={`btn ${mode === 'context-switch' ? 'btn-primary' : 'btn-secondary'}`}
          >
            Context Switch Engine
          </button>
        </div>
      </div>

      {mode === 'lifecycle' ? (
        <div className="lifecycle-wrapper">
          {/* Interactive State Machine Diagram */}
          <div className="viz-card state-machine-card">
            <h3>📍 Interactive State Diagram</h3>

            <div className="state-nodes-container">
              {['NEW', 'READY', 'RUNNING', 'WAITING', 'TERMINATED'].map(state => {
                const isActive = activeState === state
                return (
                  <div
                    key={state}
                    className={`state-node ${state.toLowerCase()} ${isActive ? 'state-active' : ''}`}
                    onClick={() => triggerStateChange(state, `Manual override: State changed to ${state}.`)}
                  >
                    <div className="state-pulse" />
                    <span className="state-name">{state}</span>
                    {isActive && <span className="active-badge">Active</span>}
                  </div>
                )
              })}
            </div>

            {/* Event Action Buttons */}
            <div className="action-buttons-grid">
              <button
                onClick={() => triggerStateChange('READY', 'Long-term scheduler admitted process into RAM.')}
                className="btn btn-action"
                disabled={activeState === 'READY'}
              >
                1. Admit (NEW → READY)
              </button>
              <button
                onClick={() => triggerStateChange('RUNNING', 'Short-term scheduler dispatched process to CPU.')}
                className="btn btn-action"
                disabled={activeState !== 'READY'}
              >
                2. Dispatch (READY → RUNNING)
              </button>
              <button
                onClick={() => triggerStateChange('WAITING', 'Process requested I/O read (Blocked).')}
                className="btn btn-action"
                disabled={activeState !== 'RUNNING'}
              >
                3. I/O Wait (RUNNING → WAITING)
              </button>
              <button
                onClick={() => triggerStateChange('READY', 'Hardware interrupt: I/O completed.')}
                className="btn btn-action"
                disabled={activeState !== 'WAITING'}
              >
                4. I/O Complete (WAITING → READY)
              </button>
              <button
                onClick={() => triggerStateChange('READY', 'Timer interrupt: Time quantum expired.')}
                className="btn btn-action"
                disabled={activeState !== 'RUNNING'}
              >
                5. Preempt (RUNNING → READY)
              </button>
              <button
                onClick={() => triggerStateChange('TERMINATED', 'Process execution completed / exit() called.')}
                className="btn btn-action btn-danger"
                disabled={activeState !== 'RUNNING'}
              >
                6. Terminate (RUNNING → EXIT)
              </button>
            </div>
          </div>

          <div className="metrics-grid">
            {/* Live PCB Inspector */}
            <div className="viz-card">
              <h3>📋 Process Control Block (PCB #1042)</h3>
              <div className="pcb-grid">
                <div className="pcb-item">
                  <span className="pcb-key">PID</span>
                  <span className="pcb-val">{pcb.pid}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Parent PID</span>
                  <span className="pcb-val">{pcb.ppid}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Current State</span>
                  <span className={`pcb-val badge-state ${pcb.state.toLowerCase()}`}>{pcb.state}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Program Counter (PC)</span>
                  <span className="pcb-val hex-val">{pcb.programCounter}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Accumulator (EAX)</span>
                  <span className="pcb-val hex-val">{pcb.eax}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Stack Pointer (ESP)</span>
                  <span className="pcb-val hex-val">{pcb.esp}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Memory Limit</span>
                  <span className="pcb-val">{pcb.memoryLimit}</span>
                </div>
                <div className="pcb-item">
                  <span className="pcb-key">Open File Descriptors</span>
                  <span className="pcb-val">{pcb.openFiles.join(', ')}</span>
                </div>
              </div>
            </div>

            {/* Kernel Event Log */}
            <div className="viz-card">
              <h3>📜 Kernel Event Stream</h3>
              <div className="event-log-container">
                {logs.map(log => (
                  <div key={log.id} className="log-entry">
                    <span className="log-time">[{log.time}]</span>
                    <span className="log-text">{log.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Context Switch Simulator */
        <div className="context-switch-wrapper">
          <div className="viz-card">
            <h3>⚡ Process Context Switch vs Thread Context Switch</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Observe how the CPU context is saved to PCB #1 and restored from PCB #2 during a context switch.
            </p>

            <div className="switch-animation-container">
              {/* Process 1 */}
              <div className={`process-box ${contextProcess === 'P1' && !isSwitching ? 'box-active' : ''}`}>
                <h4>Process P1 (PID 101)</h4>
                <div className="mini-pcb">
                  <div>PC: 0x0040F110</div>
                  <div>Registers: EAX=0x5, EBX=0x2</div>
                  <div>Page Table: 0x7FA000 (P1 Address Space)</div>
                </div>
              </div>

              {/* CPU Core in Middle */}
              <div className="cpu-switch-core">
                <div className="cpu-core-title">CPU CORE</div>
                <div className={`cpu-core-status ${isSwitching ? 'status-switching' : ''}`}>
                  {isSwitching ? '🔄 SWITCHING CONTEXT...' : `RUNNING: ${contextProcess}`}
                </div>
                <button
                  onClick={handleContextSwitch}
                  disabled={isSwitching}
                  className="btn btn-primary"
                  style={{ marginTop: '1rem' }}
                >
                  Trigger Context Switch
                </button>
              </div>

              {/* Process 2 */}
              <div className={`process-box ${contextProcess === 'P2' && !isSwitching ? 'box-active' : ''}`}>
                <h4>Process P2 (PID 204)</h4>
                <div className="mini-pcb">
                  <div>PC: 0x0040A3C9</div>
                  <div>Registers: EAX=0x99, EBX=0x0</div>
                  <div>Page Table: 0x8BB000 (P2 Address Space)</div>
                </div>
              </div>
            </div>

            <div className="cs-comparison-table">
              <h4>Key Architectural Distinctions</h4>
              <table>
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Process Context Switch</th>
                    <th>Thread Context Switch</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Address Space</strong></td>
                    <td><span className="badge-danger">Switches Page Tables (CR3 register)</span></td>
                    <td><span className="badge-success">Shared Address Space (No swap)</span></td>
                  </tr>
                  <tr>
                    <td><strong>CPU Cache / TLB</strong></td>
                    <td><span className="badge-danger">TLB Flush required (Cache Misses)</span></td>
                    <td><span className="badge-success">TLB & Caches Preserved</span></td>
                  </tr>
                  <tr>
                    <td><strong>Time Overhead</strong></td>
                    <td>High (~1,000 to 10,000 ns)</td>
                    <td>Ultra Low (~100 to 500 ns)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
