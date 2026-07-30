import React, { useState, useEffect } from 'react'

export default function SynchronizationVisualizer() {
  const [mutexLocked, setMutexLocked] = useState(false)
  const [mutexHolder, setMutexHolder] = useState(null)
  const [waitingQueue, setWaitingQueue] = useState([])
  const [logs, setLogs] = useState([])

  // Producer-Consumer Bounded Buffer State
  const [bufferSize, setBufferSize] = useState(5)
  const [buffer, setBuffer] = useState([])
  const [mutexVal, setMutexVal] = useState(1)
  const [emptyCount, setEmptyCount] = useState(5)
  const [fullCount, setFullCount] = useState(0)

  const logEvent = (msg) => {
    setLogs(prev => [{ id: Date.now(), msg, time: new Date().toLocaleTimeString() }, ...prev.slice(0, 5)])
  }

  const handleThreadRequest = (threadId) => {
    if (!mutexLocked) {
      setMutexLocked(true)
      setMutexHolder(threadId)
      logEvent(`Thread ${threadId} ACQUIRED Mutex lock and entered Critical Section.`)
    } else {
      if (!waitingQueue.includes(threadId)) {
        setWaitingQueue(prev => [...prev, threadId])
        logEvent(`Thread ${threadId} BLOCKED on Mutex lock. Added to Waiting Queue.`)
      }
    }
  }

  const handleReleaseMutex = () => {
    if (!mutexLocked) return
    const prevHolder = mutexHolder
    if (waitingQueue.length > 0) {
      const nextThread = waitingQueue[0]
      setWaitingQueue(prev => prev.slice(1))
      setMutexHolder(nextThread)
      logEvent(`Thread ${prevHolder} RELEASED Mutex. Thread ${nextThread} ACQUIRED Mutex!`)
    } else {
      setMutexLocked(false)
      setMutexHolder(null)
      logEvent(`Thread ${prevHolder} RELEASED Mutex lock. Critical Section is IDLE.`)
    }
  }

  // Producer Consumer
  const handleProduce = () => {
    if (buffer.length >= bufferSize) {
      logEvent('PRODUCER BLOCKED: Buffer is FULL (empty = 0).')
      return
    }
    const newItem = `Item #${Math.floor(100 + Math.random() * 900)}`
    setBuffer(prev => [...prev, newItem])
    setEmptyCount(prev => prev - 1)
    setFullCount(prev => prev + 1)
    logEvent(`PRODUCER produced ${newItem}. (full = ${fullCount + 1}, empty = ${emptyCount - 1})`)
  }

  const handleConsume = () => {
    if (buffer.length === 0) {
      logEvent('CONSUMER BLOCKED: Buffer is EMPTY (full = 0).')
      return
    }
    const item = buffer[0]
    setBuffer(prev => prev.slice(1))
    setEmptyCount(prev => prev + 1)
    setFullCount(prev => prev - 1)
    logEvent(`CONSUMER consumed ${item}. (full = ${fullCount - 1}, empty = ${emptyCount + 1})`)
  }

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🔒 Process Synchronization & Semaphores Simulator</h2>
          <p>Interactive Critical Section Mutex locking and Producer-Consumer Bounded Buffer model.</p>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Mutex & Critical Section Simulator */}
        <div className="viz-card">
          <h3>🔐 Mutex Lock & Critical Section</h3>
          <div className="cs-diagram">
            {/* Thread Queue */}
            <div className="queue-box">
              <h4>Waiting Queue</h4>
              <div className="queue-items">
                {waitingQueue.map(t => (
                  <span key={t} className="thread-pill pill-blocked">{t}</span>
                ))}
                {waitingQueue.length === 0 && <span className="empty-text">No waiting threads</span>}
              </div>
            </div>

            {/* Critical Section Box */}
            <div className={`critical-section-box ${mutexLocked ? 'cs-locked' : 'cs-idle'}`}>
              <div className="cs-title">CRITICAL SECTION</div>
              {mutexLocked ? (
                <div className="cs-occupant">
                  <span className="lock-icon">🔒</span>
                  <span>Executing: <strong>{mutexHolder}</strong></span>
                </div>
              ) : (
                <div className="cs-occupant">
                  <span className="lock-icon">🔓</span>
                  <span>UNLOCKED (IDLE)</span>
                </div>
              )}
            </div>
          </div>

          <div className="action-buttons-group">
            <button onClick={() => handleThreadRequest('T1')} className="btn btn-secondary">Request T1</button>
            <button onClick={() => handleThreadRequest('T2')} className="btn btn-secondary">Request T2</button>
            <button onClick={() => handleThreadRequest('T3')} className="btn btn-secondary">Request T3</button>
            <button onClick={handleReleaseMutex} disabled={!mutexLocked} className="btn btn-primary">
              🔓 Release Lock
            </button>
          </div>
        </div>

        {/* Bounded Buffer Producer-Consumer */}
        <div className="viz-card">
          <h3>📦 Producer-Consumer (Bounded Buffer)</h3>
          <div className="semaphore-counters">
            <div className="sem-pill"><span>Mutex:</span> <strong>1</strong></div>
            <div className="sem-pill"><span>Empty:</span> <strong>{emptyCount}</strong></div>
            <div className="sem-pill"><span>Full:</span> <strong>{fullCount}</strong></div>
          </div>

          <div className="buffer-slots">
            {Array.from({ length: bufferSize }).map((_, idx) => {
              const item = buffer[idx]
              return (
                <div key={idx} className={`buffer-slot ${item ? 'slot-filled' : 'slot-empty'}`}>
                  <span className="slot-idx">[{idx}]</span>
                  <span className="slot-val">{item || 'Empty'}</span>
                </div>
              )
            })}
          </div>

          <div className="action-buttons-group">
            <button onClick={handleProduce} disabled={buffer.length >= bufferSize} className="btn btn-primary">
              ➕ Produce Item
            </button>
            <button onClick={handleConsume} disabled={buffer.length === 0} className="btn btn-action">
              ➖ Consume Item
            </button>
          </div>
        </div>
      </div>

      {/* Sync Log Stream */}
      <div className="viz-card">
        <h3>📜 Synchronization Log</h3>
        <div className="event-log-container">
          {logs.map(l => (
            <div key={l.id} className="log-entry">
              <span className="log-time">[{l.time}]</span>
              <span className="log-text">{l.msg}</span>
            </div>
          ))}
          {logs.length === 0 && <span className="empty-text">No sync events logged yet.</span>}
        </div>
      </div>
    </div>
  )
}
