import React, { useState } from 'react'

export default function DbmsVisualizer() {
  const [keys, setKeys] = useState([5, 10, 15, 20, 30, 40, 50])
  const [searchKey, setSearchKey] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [newKey, setNewKey] = useState('')

  // 2PL Locking Simulator State
  const [t1Lock, setT1Lock] = useState('NONE') // NONE, SHARED (S), EXCLUSIVE (X)
  const [t2Lock, setT2Lock] = useState('NONE')
  const [lockLog, setLockLog] = useState([])

  const handleSearch = () => {
    const k = Number(searchKey)
    if (isNaN(k)) return
    const found = keys.includes(k)
    setSearchResult({
      key: k,
      found,
      path: found ? `Root [20] ➔ Node [${k < 20 ? '5,10,15' : '30,40,50'}] ➔ Leaf [Key ${k}]` : 'Key not found in B+ Tree Index'
    })
  }

  const handleInsertKey = (e) => {
    e.preventDefault()
    const k = Number(newKey)
    if (isNaN(k) || keys.includes(k)) return
    const updated = [...keys, k].sort((a, b) => a - b)
    setKeys(updated)
    setNewKey('')
  }

  const handleT1Request = (type) => {
    if (type === 'X' && t2Lock !== 'NONE') {
      setLockLog(prev => [`[T1] BLOCKED: Cannot acquire Exclusive (X) lock. T2 holds ${t2Lock} lock.`, ...prev])
      return
    }
    if (type === 'S' && t2Lock === 'X') {
      setLockLog(prev => [`[T1] BLOCKED: Cannot acquire Shared (S) lock. T2 holds Exclusive (X) lock.`, ...prev])
      return
    }
    setT1Lock(type)
    setLockLog(prev => [`[T1] ACQUIRED ${type} lock on Account #101.`, ...prev])
  }

  const handleT2Request = (type) => {
    if (type === 'X' && t1Lock !== 'NONE') {
      setLockLog(prev => [`[T2] BLOCKED: Cannot acquire Exclusive (X) lock. T1 holds ${t1Lock} lock.`, ...prev])
      return
    }
    if (type === 'S' && t1Lock === 'X') {
      setLockLog(prev => [`[T2] BLOCKED: Cannot acquire Shared (S) lock. T1 holds Exclusive (X) lock.`, ...prev])
      return
    }
    setT2Lock(type)
    setLockLog(prev => [`[T2] ACQUIRED ${type} lock on Account #101.`, ...prev])
  }

  // Partition keys into simulated B+ Tree nodes
  const rootKeys = keys.length > 3 ? [keys[Math.floor(keys.length / 2)]] : []
  const midIdx = Math.floor(keys.length / 2)
  const leftLeaf = keys.slice(0, midIdx)
  const rightLeaf = keys.slice(midIdx)

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🗄 DBMS Indexing & Transaction Locking Simulator</h2>
          <p>Interactive B+ Tree Indexing lookup/insertion and 2-Phase Locking (2PL) ACID concurrency control.</p>
        </div>
      </div>

      <div className="metrics-grid">
        {/* B+ Tree Visualizer */}
        <div className="viz-card">
          <h3>🌳 B+ Tree Index Inspector</h3>

          <div className="btree-container">
            {/* Root Node */}
            <div className="btree-level">
              <div className="btree-node root-node">
                <span className="node-title">Root Node</span>
                <div className="keys-row">
                  {rootKeys.map(k => <span key={k} className="key-badge">{k}</span>)}
                </div>
              </div>
            </div>

            {/* Leaf Nodes */}
            <div className="btree-level leaf-level">
              <div className="btree-node leaf-node">
                <span className="node-title">Leaf Node #1</span>
                <div className="keys-row">
                  {leftLeaf.map(k => <span key={k} className="key-badge leaf-key">{k}</span>)}
                </div>
              </div>

              <div className="leaf-pointer">➔</div>

              <div className="btree-node leaf-node">
                <span className="node-title">Leaf Node #2</span>
                <div className="keys-row">
                  {rightLeaf.map(k => <span key={k} className="key-badge leaf-key">{k}</span>)}
                </div>
              </div>
            </div>
          </div>

          <div className="btree-controls" style={{ marginTop: '1.5rem' }}>
            <form onSubmit={handleInsertKey} className="form-row">
              <input
                type="number"
                placeholder="New Key to Insert"
                value={newKey}
                onChange={e => setNewKey(e.target.value)}
                className="num-input"
              />
              <button type="submit" className="btn btn-primary">+ Insert Key</button>
            </form>

            <div className="form-row" style={{ marginTop: '0.75rem' }}>
              <input
                type="number"
                placeholder="Search Key"
                value={searchKey}
                onChange={e => setSearchKey(e.target.value)}
                className="num-input"
              />
              <button onClick={handleSearch} className="btn btn-action">🔍 B+ Tree Search</button>
            </div>

            {searchResult && (
              <div className={`result-banner ${searchResult.found ? 'banner-safe' : 'banner-unsafe'}`} style={{ marginTop: '1rem' }}>
                <strong>{searchResult.found ? '✅ Key Found!' : '❌ Key Not Found'}</strong>
                <p style={{ fontSize: '0.85rem' }}>{searchResult.path}</p>
              </div>
            )}
          </div>
        </div>

        {/* 2PL Transaction Lock Simulator */}
        <div className="viz-card">
          <h3>🔒 2-Phase Locking (Strict 2PL)</h3>
          <div className="transaction-boxes">
            <div className="tx-box">
              <h4>Transaction T1</h4>
              <div className="tx-state">Lock Held: <strong>{t1Lock}</strong></div>
              <div className="action-buttons-group" style={{ marginTop: '0.5rem' }}>
                <button onClick={() => handleT1Request('S')} className="btn btn-secondary">Request S Lock</button>
                <button onClick={() => handleT1Request('X')} className="btn btn-secondary">Request X Lock</button>
                <button onClick={() => { setT1Lock('NONE'); setLockLog(prev => ['[T1] RELEASED locks at COMMIT.', ...prev]) }} className="btn btn-primary">Commit & Unlock</button>
              </div>
            </div>

            <div className="tx-box" style={{ marginTop: '1rem' }}>
              <h4>Transaction T2</h4>
              <div className="tx-state">Lock Held: <strong>{t2Lock}</strong></div>
              <div className="action-buttons-group" style={{ marginTop: '0.5rem' }}>
                <button onClick={() => handleT2Request('S')} className="btn btn-secondary">Request S Lock</button>
                <button onClick={() => handleT2Request('X')} className="btn btn-secondary">Request X Lock</button>
                <button onClick={() => { setT2Lock('NONE'); setLockLog(prev => ['[T2] RELEASED locks at COMMIT.', ...prev]) }} className="btn btn-primary">Commit & Unlock</button>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '1.25rem' }}>
            <h4>Lock Matrix Audit Log</h4>
            <div className="event-log-container" style={{ maxHeight: '160px' }}>
              {lockLog.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-text">{log}</span>
                </div>
              ))}
              {lockLog.length === 0 && <span className="empty-text">No lock requests executed yet.</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
