import { useState, useEffect } from 'react'
import { fetchCpuSchedulingSimulation } from '../../utils/api'

const DEFAULT_PROCESSES = [
  { id: 'P1', arrivalTime: 0, burstTime: 5, priority: 2, color: '#3b82f6' },
  { id: 'P2', arrivalTime: 1, burstTime: 3, priority: 1, color: '#10b981' },
  { id: 'P3', arrivalTime: 2, burstTime: 8, priority: 4, color: '#f59e0b' },
  { id: 'P4', arrivalTime: 3, burstTime: 2, priority: 3, color: '#ec4899' },
]

export default function SchedulingVisualizer() {
  const [processes, setProcesses] = useState(DEFAULT_PROCESSES)
  const [algorithm, setAlgorithm] = useState('RR') // FCFS, SJF, SRTF, RR, Priority
  const [timeQuantum, setTimeQuantum] = useState(2)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1000) // ms per tick

  // New process input state
  const [newId, setNewId] = useState('P5')
  const [newArrival, setNewArrival] = useState(0)
  const [newBurst, setNewBurst] = useState(4)
  const [newPriority, setNewPriority] = useState(2)

  // Simulation execution timeline
  const [timeline, setTimeline] = useState([])
  const [metrics, setMetrics] = useState([])

  // Calculate schedule via Backend REST API
  useEffect(() => {
    fetchCpuSchedulingSimulation({ processes, algorithm, timeQuantum })
      .then(res => {
        setTimeline(res.gantt || [])
        setMetrics(res.processMetrics || [])
        setCurrentTime(0)
        setIsPlaying(false)
      })
      .catch(() => {
        const { gantt, processMetrics } = computeSchedule(processes, algorithm, timeQuantum)
        setTimeline(gantt)
        setMetrics(processMetrics)
        setCurrentTime(0)
        setIsPlaying(false)
      })
  }, [processes, algorithm, timeQuantum])

  // Timer for auto-play
  useEffect(() => {
    let timer = null
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= timeline.length) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => clearInterval(timer)
  }, [isPlaying, speed, timeline.length])

  const maxTime = timeline.length

  const handleAddProcess = (e) => {
    e.preventDefault()
    if (!newId || newBurst <= 0) return
    const colors = ['#8b5cf6', '#06b6d4', '#f97316', '#84cc16', '#e11d48']
    const color = colors[processes.length % colors.length]
    setProcesses([
      ...processes,
      {
        id: newId,
        arrivalTime: Number(newArrival),
        burstTime: Number(newBurst),
        priority: Number(newPriority),
        color
      }
    ])
    setNewId(`P${processes.length + 2}`)
  }

  const handleRemoveProcess = (id) => {
    if (processes.length <= 1) return
    setProcesses(processes.filter(p => p.id !== id))
  }

  // Active process at current time
  const currentBlock = timeline[currentTime - 1] || null
  const activeProcessId = currentBlock ? currentBlock.processId : null
  const activeProcess = processes.find(p => p.id === activeProcessId)

  // Averages
  const avgWait = (metrics.reduce((acc, m) => acc + m.waitingTime, 0) / (metrics.length || 1)).toFixed(2)
  const avgTurnaround = (metrics.reduce((acc, m) => acc + m.turnaroundTime, 0) / (metrics.length || 1)).toFixed(2)
  const avgResponse = (metrics.reduce((acc, m) => acc + m.responseTime, 0) / (metrics.length || 1)).toFixed(2)

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>⚡ Interactive CPU Scheduling Simulator</h2>
          <p>Visualize CPU scheduling algorithms, Gantt charts, preemption, and real-time process execution.</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="viz-controls-card">
        <div className="control-row">
          <div className="control-group">
            <label>Algorithm:</label>
            <select value={algorithm} onChange={e => setAlgorithm(e.target.value)} className="select-input">
              <option value="FCFS">First-Come First-Served (FCFS)</option>
              <option value="SJF">Shortest Job First (Non-Preemptive)</option>
              <option value="SRTF">Shortest Remaining Time First (Preemptive)</option>
              <option value="RR">Round Robin (RR)</option>
              <option value="Priority">Priority Scheduling (Non-Preemptive)</option>
            </select>
          </div>

          {algorithm === 'RR' && (
            <div className="control-group">
              <label>Time Quantum:</label>
              <input
                type="number"
                min="1"
                max="10"
                value={timeQuantum}
                onChange={e => setTimeQuantum(Math.max(1, parseInt(e.target.value) || 1))}
                className="num-input"
              />
            </div>
          )}

          <div className="control-group">
            <label>Speed:</label>
            <select value={speed} onChange={e => setSpeed(Number(e.target.value))} className="select-input">
              <option value={1500}>0.5x (Slow)</option>
              <option value={1000}>1.0x (Normal)</option>
              <option value={500}>2.0x (Fast)</option>
              <option value={200}>5.0x (Ultra)</option>
            </select>
          </div>

          <div className="control-group buttons-group">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`btn ${isPlaying ? 'btn-pause' : 'btn-play'}`}
            >
              {isPlaying ? '⏸ Pause' : '▶ Play Simulation'}
            </button>
            <button
              onClick={() => { setCurrentTime(0); setIsPlaying(false); }}
              className="btn btn-secondary"
            >
              ↺ Reset
            </button>
            <button
              onClick={() => setCurrentTime(prev => Math.min(maxTime, prev + 1))}
              disabled={currentTime >= maxTime}
              className="btn btn-secondary"
            >
              Step ⏭
            </button>
          </div>
        </div>

        {/* Timeline Slider */}
        <div className="timeline-slider-container">
          <span className="time-badge">Time: t = {currentTime}s / {maxTime}s</span>
          <input
            type="range"
            min="0"
            max={maxTime}
            value={currentTime}
            onChange={e => { setCurrentTime(Number(e.target.value)); setIsPlaying(false); }}
            className="slider"
          />
        </div>
      </div>

      {/* Live CPU Status Banner */}
      <div className="cpu-status-card">
        <div className="cpu-core-box">
          <div className="cpu-icon">💻</div>
          <div className="cpu-details">
            <div className="cpu-title">CPU CORE #1</div>
            <div className="cpu-state">
              STATUS: {activeProcess ? (
                <span className="status-running" style={{ color: activeProcess.color }}>
                  RUNNING [{activeProcess.id}]
                </span>
              ) : (
                <span className="status-idle">IDLE 💤</span>
              )}
            </div>
          </div>
        </div>

        <div className="live-info-box">
          <div className="info-item">
            <span className="info-label">Active Process</span>
            <span className="info-val" style={{ color: activeProcess?.color || '#a0a0b0' }}>
              {activeProcess ? activeProcess.id : 'None'}
            </span>
          </div>
          <div className="info-item">
            <span className="info-label">Algorithm</span>
            <span className="info-val">{algorithm}</span>
          </div>
          <div className="info-item">
            <span className="info-label">Ready Queue</span>
            <div className="ready-queue-pills">
              {getReadyQueueAtTime(processes, timeline, currentTime).map(p => (
                <span key={p.id} className="queue-pill" style={{ borderColor: p.color }}>
                  {p.id}
                </span>
              ))}
              {getReadyQueueAtTime(processes, timeline, currentTime).length === 0 && (
                <span className="empty-queue-text">Empty</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="viz-card">
        <h3>📊 Real-Time Gantt Chart</h3>
        <div className="gantt-wrapper">
          <div className="gantt-chart">
            {timeline.slice(0, currentTime).map((block, idx) => (
              <div
                key={idx}
                className="gantt-block animated-block"
                style={{
                  backgroundColor: block.processId ? getProcessColor(processes, block.processId) : '#334155',
                  flex: 1
                }}
                title={`t=${block.start}-${block.end}: ${block.processId || 'IDLE'}`}
              >
                <span className="block-label">{block.processId || 'IDLE'}</span>
              </div>
            ))}
            {currentTime < maxTime && (
              <div
                className="gantt-block-placeholder"
                style={{ flex: maxTime - currentTime }}
              >
                Remaining timeline ({maxTime - currentTime}s)
              </div>
            )}
          </div>

          {/* Time ticks */}
          <div className="gantt-ticks">
            {Array.from({ length: maxTime + 1 }).map((_, t) => (
              <span
                key={t}
                className={`tick ${t === currentTime ? 'tick-active' : ''}`}
                style={{ left: `${(t / (maxTime || 1)) * 100}%` }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Metrics & Performance Analytics */}
      <div className="metrics-grid">
        <div className="viz-card">
          <h3>📈 Execution Metrics Table</h3>
          <table className="viz-table">
            <thead>
              <tr>
                <th>Process</th>
                <th>Arrival</th>
                <th>Burst</th>
                <th>Priority</th>
                <th>Completion</th>
                <th>Turnaround ($T_A$)</th>
                <th>Waiting ($W_T$)</th>
                <th>Response ($R_T$)</th>
              </tr>
            </thead>
            <tbody>
              {processes.map(p => {
                const m = metrics.find(item => item.id === p.id) || {}
                const isFinished = currentTime >= (m.completionTime || 999)
                return (
                  <tr key={p.id} className={activeProcessId === p.id ? 'row-active' : ''}>
                    <td style={{ fontWeight: 'bold', color: p.color }}>{p.id}</td>
                    <td>{p.arrivalTime}s</td>
                    <td>{p.burstTime}s</td>
                    <td>{p.priority}</td>
                    <td>{m.completionTime !== undefined ? `${m.completionTime}s` : '-'}</td>
                    <td>{m.turnaroundTime !== undefined ? `${m.turnaroundTime}s` : '-'}</td>
                    <td>{m.waitingTime !== undefined ? `${m.waitingTime}s` : '-'}</td>
                    <td>{m.responseTime !== undefined ? `${m.responseTime}s` : '-'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {/* Averages Banner */}
          <div className="averages-banner">
            <div className="avg-badge">
              <span>Avg Waiting Time ($W_T$):</span>
              <strong>{avgWait}s</strong>
            </div>
            <div className="avg-badge">
              <span>Avg Turnaround ($T_A$):</span>
              <strong>{avgTurnaround}s</strong>
            </div>
            <div className="avg-badge">
              <span>Avg Response Time ($R_T$):</span>
              <strong>{avgResponse}s</strong>
            </div>
          </div>
        </div>

        {/* Process Management Panel */}
        <div className="viz-card">
          <h3>➕ Process Configuration</h3>
          <form onSubmit={handleAddProcess} className="add-process-form">
            <div className="form-row">
              <input
                type="text"
                placeholder="ID (e.g. P5)"
                value={newId}
                onChange={e => setNewId(e.target.value)}
                className="text-input"
                required
              />
              <input
                type="number"
                placeholder="Arrival Time"
                min="0"
                value={newArrival}
                onChange={e => setNewArrival(e.target.value)}
                className="num-input"
                required
              />
            </div>
            <div className="form-row">
              <input
                type="number"
                placeholder="Burst Time"
                min="1"
                value={newBurst}
                onChange={e => setNewBurst(e.target.value)}
                className="num-input"
                required
              />
              <input
                type="number"
                placeholder="Priority (1=High)"
                min="1"
                value={newPriority}
                onChange={e => setNewPriority(e.target.value)}
                className="num-input"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              + Add Process
            </button>
          </form>

          <div className="process-list">
            <h4>Active Process List</h4>
            {processes.map(p => (
              <div key={p.id} className="process-item" style={{ borderLeftColor: p.color }}>
                <span className="p-id" style={{ color: p.color }}>{p.id}</span>
                <span className="p-meta">Arrival: {p.arrivalTime}s | Burst: {p.burstTime}s | Priority: {p.priority}</span>
                <button
                  onClick={() => handleRemoveProcess(p.id)}
                  className="btn-delete"
                  title="Remove process"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// Compute Scheduling logic
function computeSchedule(processesList, algo, timeQuantum) {
  if (!processesList.length) return { gantt: [], processMetrics: [] }

  // Clone processes
  let procs = processesList.map(p => ({
    ...p,
    remainingTime: p.burstTime,
    startTime: -1,
    completionTime: 0,
    waitingTime: 0,
    turnaroundTime: 0,
    responseTime: -1
  }))

  let currentTime = 0
  let completed = 0
  const n = procs.length
  const gantt = []
  let readyQueue = []
  let prevProcess = null

  if (algo === 'FCFS') {
    procs.sort((a, b) => a.arrivalTime - b.arrivalTime)
    procs.forEach(p => {
      if (currentTime < p.arrivalTime) {
        for (let t = currentTime; t < p.arrivalTime; t++) {
          gantt.push({ start: t, end: t + 1, processId: null })
        }
        currentTime = p.arrivalTime
      }
      p.startTime = currentTime
      p.responseTime = p.startTime - p.arrivalTime
      for (let t = 0; t < p.burstTime; t++) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: p.id })
        currentTime++
      }
      p.completionTime = currentTime
      p.turnaroundTime = p.completionTime - p.arrivalTime
      p.waitingTime = p.turnaroundTime - p.burstTime
    })
  } else if (algo === 'SJF') {
    // Non-preemptive Shortest Job First
    let isDone = Array(n).fill(false)
    while (completed < n) {
      let available = procs.filter((p, i) => !isDone[i] && p.arrivalTime <= currentTime)
      if (available.length === 0) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: null })
        currentTime++
        continue
      }
      available.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime)
      let p = available[0]
      let pIdx = procs.findIndex(item => item.id === p.id)

      p.startTime = currentTime
      p.responseTime = p.startTime - p.arrivalTime

      for (let t = 0; t < p.burstTime; t++) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: p.id })
        currentTime++
      }

      p.completionTime = currentTime
      p.turnaroundTime = p.completionTime - p.arrivalTime
      p.waitingTime = p.turnaroundTime - p.burstTime
      isDone[pIdx] = true
      completed++
    }
  } else if (algo === 'SRTF') {
    // Preemptive Shortest Remaining Time First
    while (completed < n) {
      let available = procs.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0)
      if (available.length === 0) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: null })
        currentTime++
        continue
      }
      available.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime)
      let p = available[0]

      if (p.responseTime === -1) p.responseTime = currentTime - p.arrivalTime

      gantt.push({ start: currentTime, end: currentTime + 1, processId: p.id })
      p.remainingTime--
      currentTime++

      if (p.remainingTime === 0) {
        p.completionTime = currentTime
        p.turnaroundTime = p.completionTime - p.arrivalTime
        p.waitingTime = p.turnaroundTime - p.burstTime
        completed++
      }
    }
  } else if (algo === 'Priority') {
    // Non-preemptive Priority (Lower number = Higher priority)
    let isDone = Array(n).fill(false)
    while (completed < n) {
      let available = procs.filter((p, i) => !isDone[i] && p.arrivalTime <= currentTime)
      if (available.length === 0) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: null })
        currentTime++
        continue
      }
      available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime)
      let p = available[0]
      let pIdx = procs.findIndex(item => item.id === p.id)

      p.startTime = currentTime
      p.responseTime = p.startTime - p.arrivalTime

      for (let t = 0; t < p.burstTime; t++) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: p.id })
        currentTime++
      }

      p.completionTime = currentTime
      p.turnaroundTime = p.completionTime - p.arrivalTime
      p.waitingTime = p.turnaroundTime - p.burstTime
      isDone[pIdx] = true
      completed++
    }
  } else if (algo === 'RR') {
    // Round Robin
    let queue = []
    let inQueue = Array(n).fill(false)

    // Push initial arrived
    procs.forEach((p, idx) => {
      if (p.arrivalTime === 0) {
        queue.push(p)
        inQueue[idx] = true
      }
    })

    while (completed < n) {
      if (queue.length === 0) {
        // Check if any process arrives in future
        let unarrived = procs.filter(p => p.remainingTime > 0 && p.arrivalTime > currentTime)
        if (unarrived.length > 0) {
          gantt.push({ start: currentTime, end: currentTime + 1, processId: null })
          currentTime++
          procs.forEach((p, idx) => {
            if (!inQueue[idx] && p.arrivalTime <= currentTime && p.remainingTime > 0) {
              queue.push(p)
              inQueue[idx] = true
            }
          })
          continue
        } else {
          break
        }
      }

      let p = queue.shift()
      if (p.responseTime === -1) p.responseTime = currentTime - p.arrivalTime

      let execTime = Math.min(p.remainingTime, timeQuantum)
      for (let t = 0; t < execTime; t++) {
        gantt.push({ start: currentTime, end: currentTime + 1, processId: p.id })
        currentTime++

        // Check new arrivals during this tick
        procs.forEach((item, idx) => {
          if (!inQueue[idx] && item.arrivalTime <= currentTime && item.remainingTime > 0 && item.id !== p.id) {
            queue.push(item)
            inQueue[idx] = true
          }
        })
      }

      p.remainingTime -= execTime

      if (p.remainingTime === 0) {
        p.completionTime = currentTime
        p.turnaroundTime = p.completionTime - p.arrivalTime
        p.waitingTime = p.turnaroundTime - p.burstTime
        completed++
      } else {
        // Re-add to queue
        queue.push(p)
      }
    }
  }

  const processMetrics = procs.map(p => ({
    id: p.id,
    arrivalTime: p.arrivalTime,
    burstTime: p.burstTime,
    priority: p.priority,
    completionTime: p.completionTime,
    turnaroundTime: p.turnaroundTime,
    waitingTime: p.waitingTime,
    responseTime: p.responseTime
  }))

  return { gantt, processMetrics }
}

function getProcessColor(processes, id) {
  const p = processes.find(item => item.id === id)
  return p ? p.color : '#3b82f6'
}

function getReadyQueueAtTime(processes, timeline, t) {
  if (t <= 0) return []
  // Active process at time t-1
  const activeId = timeline[t - 1]?.processId || null
  return processes.filter(p => p.arrivalTime <= t && p.id !== activeId)
}
