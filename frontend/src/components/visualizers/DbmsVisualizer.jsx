import React, { useState } from 'react'
import BPlusTreeVisualizer from './dbms/BPlusTreeVisualizer'

export default function DbmsVisualizer({ defaultTopicId }) {
  // Determine initial sub-tab mode based on defaultTopicId prop
  const getInitialTab = () => {
    switch (defaultTopicId) {
      case 'dbms-architecture': return 'architecture'
      case 'er-model': return 'closure'
      case 'normalization': return 'normalization'
      case 'dbms-indexing': return 'btree'
      case 'transactions-acid':
      case 'concurrency-control': return 'concurrency'
      case 'query-optimization': return 'query'
      default: return 'btree'
    }
  }

  const [activeTab, setActiveTab] = useState(getInitialTab())

  // ==========================================
  // MODE 1: 3-TIER ARCHITECTURE & DATA INDEPENDENCE
  // ==========================================
  const [dataIndepLog, setDataIndepLog] = useState([])
  const [diskEngine, setDiskEngine] = useState('Standard HDD Block Allocation')
  const [conceptualColumns, setConceptualColumns] = useState(['Student_ID', 'Name', 'Major', 'GPA'])

  const triggerPhysicalChange = () => {
    const engines = [
      'NVMe SSD B+ Tree Clustered Storage',
      'Columnar Parquet Compressed File Index',
      'LSM-Tree Key-Value Disk Engine',
      'Standard HDD Block Allocation'
    ]
    const nextEngine = engines[(engines.indexOf(diskEngine) + 1) % engines.length]
    setDiskEngine(nextEngine)
    setDataIndepLog(prev => [
      `[PHYSICAL CHANGE] Changed Internal Storage Engine to: "${nextEngine}".`,
      `✅ PHYSICAL DATA INDEPENDENCE: Conceptual Schema & External User Views REMAIN UNCHANGED (0 SQL queries broken).`,
      ...prev
    ])
  }

  const triggerLogicalChange = () => {
    const newCol = `Extra_Attr_${conceptualColumns.length + 1}`
    setConceptualColumns(prev => [...prev, newCol])
    setDataIndepLog(prev => [
      `[LOGICAL CHANGE] Added Column "${newCol}" to Conceptual Schema.`,
      `✅ LOGICAL DATA INDEPENDENCE: External User Views & Legacy queries run without modification.`,
      ...prev
    ])
  }

  // ==========================================
  // MODE 2: ATTRIBUTE CLOSURE & CANDIDATE KEY SOLVER
  // ==========================================
  const [attributesInput, setAttributesInput] = useState('A, B, C, D')
  const [fdsInput, setFdsInput] = useState('A->B, B->C, C->D')
  const [closureTarget, setClosureTarget] = useState('A')
  const [closureResult, setClosureResult] = useState(null)
  const [candidateKeyResult, setCandidateKeyResult] = useState(null)

  // Compute closure of X given FDs
  const computeClosure = (targetStr, attrsList, fdsList) => {
    const targetSet = new Set(targetStr.split(',').map(s => s.trim().toUpperCase()).filter(Boolean))
    let changed = true
    const steps = [`Initial Closure X+ = { ${Array.from(targetSet).join(', ')} }`]

    while (changed) {
      changed = false
      for (const fd of fdsList) {
        const [lhsStr, rhsStr] = fd.split('->').map(s => s.trim().toUpperCase())
        if (!lhsStr || !rhsStr) continue
        const lhsAttrs = lhsStr.split('').filter(c => c >= 'A' && c <= 'Z')
        const rhsAttrs = rhsStr.split('').filter(c => c >= 'A' && c <= 'Z')

        const lhsInClosure = lhsAttrs.every(a => targetSet.has(a))
        if (lhsInClosure) {
          for (const r of rhsAttrs) {
            if (!targetSet.has(r)) {
              targetSet.add(r)
              steps.push(`Applied FD ${lhsStr} ➔ ${rhsStr}: Added '${r}' to closure. Current X+ = { ${Array.from(targetSet).join(', ')} }`)
              changed = true
            }
          }
        }
      }
    }
    return { closureSet: Array.from(targetSet), steps }
  }

  const parseFDs = (str) => {
    return str.split(',').map(s => s.trim()).filter(Boolean)
  }

  const handleSolveClosure = () => {
    const attrs = attributesInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const fds = parseFDs(fdsInput)
    const res = computeClosure(closureTarget, attrs, fds)
    const isSuperKey = res.closureSet.length === attrs.length && attrs.every(a => res.closureSet.includes(a))
    setClosureResult({
      target: closureTarget,
      closure: res.closureSet.join(', '),
      steps: res.steps,
      isSuperKey
    })
  }

  const handleFindCandidateKeys = () => {
    const attrs = attributesInput.split(',').map(s => s.trim().toUpperCase()).filter(Boolean)
    const fds = parseFDs(fdsInput)
    if (attrs.length === 0 || attrs.length > 5) {
      alert('Please enter between 1 and 5 attributes (e.g. A, B, C, D) for fast combinatorial key search.')
      return
    }

    // Power set of attributes
    const getAllSubsets = (arr) => {
      return arr.reduce((subsets, value) => subsets.concat(subsets.map(set => [value, ...set])), [[]])
    }

    const allSubsets = getAllSubsets(attrs).filter(s => s.length > 0)
    allSubsets.sort((a, b) => a.length - b.length)

    const candidateKeys = []
    const superKeys = []

    for (const subset of allSubsets) {
      const targetStr = subset.join(',')
      const res = computeClosure(targetStr, attrs, fds)
      const isSuper = attrs.every(a => res.closureSet.includes(a))
      if (isSuper) {
        const subName = subset.sort().join('')
        superKeys.push(subName)
        const isMinimal = !candidateKeys.some(ck => ck.split('').every(char => subset.includes(char)))
        if (isMinimal) {
          candidateKeys.push(subName)
        }
      }
    }

    const primeAttrs = Array.from(new Set(candidateKeys.flatMap(k => k.split(''))))
    const nonPrimeAttrs = attrs.filter(a => !primeAttrs.includes(a))

    setCandidateKeyResult({
      candidateKeys,
      superKeys,
      primeAttrs,
      nonPrimeAttrs
    })
  }

  // ==========================================
  // MODE 3: NORMALIZATION & ANOMALY SIMULATOR
  // ==========================================
  const [normalStage, setNormalStage] = useState('0nf') // '0nf', '1nf', '2nf', '3nf', 'bcnf'

  // ==========================================
  // MODE 4: B+ TREE INDEX SIMULATOR
  // ==========================================
  const [keys, setKeys] = useState([5, 10, 15, 20, 30, 40, 50])
  const [searchKey, setSearchKey] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [newKey, setNewKey] = useState('')
  const [rangeStart, setRangeStart] = useState('10')
  const [rangeEnd, setRangeEnd] = useState('40')
  const [rangeResult, setRangeResult] = useState(null)

  const handleSearchKey = () => {
    const k = Number(searchKey)
    if (isNaN(k)) return
    const found = keys.includes(k)
    const midIdx = Math.floor(keys.length / 2)
    const rootK = keys[midIdx]
    const pathStr = found
      ? `Root Node [${rootK}] ➔ ${k < rootK ? 'Leaf #1' : 'Leaf #2'} ➔ Found Key ${k} at Leaf Linked List offset`
      : `Root Node [${rootK}] ➔ Key ${k} not present in Index tree`

    setSearchResult({ key: k, found, path: pathStr })
  }

  const handleInsertKey = (e) => {
    e.preventDefault()
    const k = Number(newKey)
    if (isNaN(k) || keys.includes(k)) return
    const updated = [...keys, k].sort((a, b) => a - b)
    setKeys(updated)
    setNewKey('')
  }

  const handleRangeSearch = () => {
    const start = Number(rangeStart)
    const end = Number(rangeEnd)
    if (isNaN(start) || isNaN(end)) return
    const matched = keys.filter(k => k >= start && k <= end)
    setRangeResult({ start, end, matched })
  }

  const midIdx = Math.floor(keys.length / 2)
  const rootKeys = keys.length > 3 ? [keys[midIdx]] : []
  const leftLeaf = keys.slice(0, midIdx)
  const rightLeaf = keys.slice(midIdx)

  // ==========================================
  // MODE 5: CONCURRENCY CONTROL & PRECEDENCE GRAPH
  // ==========================================
  const [scheduleInput, setScheduleInput] = useState('W1(A), R2(A), W1(B), W2(B)')
  const [serializabilityResult, setSerializabilityResult] = useState(null)

  // 2PL Locking state
  const [t1Lock, setT1Lock] = useState('NONE')
  const [t2Lock, setT2Lock] = useState('NONE')
  const [lockLog, setLockLog] = useState([])

  const handleTestSerializability = () => {
    const opsRaw = scheduleInput.split(',').map(s => s.trim()).filter(Boolean)
    const parsedOps = []

    // Parse e.g. R1(A), W2(A)
    for (const op of opsRaw) {
      const match = op.match(/([RW])(\d+)\(([A-Z])\)/i)
      if (match) {
        parsedOps.push({
          type: match[1].toUpperCase(),
          tx: Number(match[2]),
          item: match[3].toUpperCase()
        })
      }
    }

    if (parsedOps.length === 0) {
      alert('Invalid schedule format! Use format: W1(A), R2(A), W1(B), W2(B)')
      return
    }

    const transactions = Array.from(new Set(parsedOps.map(o => o.tx))).sort()
    const edges = []

    for (let i = 0; i < parsedOps.length; i++) {
      for (let j = i + 1; j < parsedOps.length; j++) {
        const op1 = parsedOps[i]
        const op2 = parsedOps[j]
        if (op1.tx !== op2.tx && op1.item === op2.item) {
          if (op1.type === 'W' || op2.type === 'W') {
            edges.push({
              from: op1.tx,
              to: op2.tx,
              item: op1.item,
              conflict: `${op1.type}${op1.tx}(${op1.item}) ➔ ${op2.type}${op2.tx}(${op2.item})`
            })
          }
        }
      }
    }

    // Cycle detection in directed graph
    const adj = {}
    transactions.forEach(t => { adj[t] = [] })
    edges.forEach(e => {
      if (!adj[e.from].includes(e.to)) adj[e.from].push(e.to)
    })

    let hasCycle = false
    const visited = {}
    const recStack = {}

    const isCyclicUtil = (node) => {
      if (!visited[node]) {
        visited[node] = true
        recStack[node] = true
        for (const neighbor of adj[node]) {
          if (!visited[neighbor] && isCyclicUtil(neighbor)) return true
          else if (recStack[neighbor]) return true
        }
      }
      recStack[node] = false
      return false
    }

    for (const t of transactions) {
      if (isCyclicUtil(t)) {
        hasCycle = true
        break
      }
    }

    setSerializabilityResult({
      parsedOps,
      transactions,
      edges,
      hasCycle,
      isConflictSerializable: !hasCycle
    })
  }

  const handleT1Request = (type) => {
    if (type === 'X' && t2Lock !== 'NONE') {
      setLockLog(prev => [`[T1] ❌ BLOCKED: Cannot acquire Exclusive (X) lock. T2 holds ${t2Lock} lock on Account #101.`, ...prev])
      return
    }
    if (type === 'S' && t2Lock === 'X') {
      setLockLog(prev => [`[T1] ❌ BLOCKED: Cannot acquire Shared (S) lock. T2 holds Exclusive (X) lock on Account #101.`, ...prev])
      return
    }
    setT1Lock(type)
    setLockLog(prev => [`[T1] ✅ ACQUIRED ${type} lock on Account #101.`, ...prev])
  }

  const handleT2Request = (type) => {
    if (type === 'X' && t1Lock !== 'NONE') {
      setLockLog(prev => [`[T2] ❌ BLOCKED: Cannot acquire Exclusive (X) lock. T1 holds ${t1Lock} lock on Account #101.`, ...prev])
      return
    }
    if (type === 'S' && t1Lock === 'X') {
      setLockLog(prev => [`[T2] ❌ BLOCKED: Cannot acquire Shared (S) lock. T1 holds Exclusive (X) lock on Account #101.`, ...prev])
      return
    }
    setT2Lock(type)
    setLockLog(prev => [`[T2] ✅ ACQUIRED ${type} lock on Account #101.`, ...prev])
  }

  // ==========================================
  // MODE 6: QUERY OPTIMIZER EVALUATOR
  // ==========================================
  const [rowCount, setRowCount] = useState(500000)
  const [hasIndex, setHasIndex] = useState(true)
  const [joinStrategy, setJoinStrategy] = useState('hash') // 'nested', 'hash', 'merge'

  const computeQueryCost = () => {
    const tablePages = Math.ceil(rowCount / 100) // 100 rows per page
    const scanCost = hasIndex ? Math.ceil(Math.log2(tablePages)) + 5 : tablePages
    
    let joinCost = 0
    if (joinStrategy === 'nested') joinCost = tablePages * 100
    else if (joinStrategy === 'hash') joinCost = tablePages * 1.5
    else if (joinStrategy === 'merge') joinCost = tablePages * Math.log2(tablePages)

    return {
      tablePages,
      scanCost: Math.round(scanCost),
      joinCost: Math.round(joinCost),
      totalCost: Math.round(scanCost + joinCost)
    }
  }

  const queryMetrics = computeQueryCost()

  return (
    <div className="visualizer-container">
      {/* HEADER & SUB-NAVIGATION */}
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🗄 Interactive DBMS Concept Visualizer Suite</h2>
          <p>Explore Database Architecture, ER Closures, Normalization, B+ Trees, 2PL Concurrency & Query Optimization.</p>
        </div>

        {/* SUB-TABS NAVIGATION */}
        <div className="main-tab-switcher" style={{ marginTop: '1rem' }}>
          <button
            onClick={() => setActiveTab('architecture')}
            className={`main-tab-btn ${activeTab === 'architecture' ? 'active-tab' : ''}`}
          >
            🏗 Architecture & 3-Schema
          </button>
          <button
            onClick={() => setActiveTab('closure')}
            className={`main-tab-btn ${activeTab === 'closure' ? 'active-tab' : ''}`}
          >
            🗝 Closures & Candidate Keys
          </button>
          <button
            onClick={() => setActiveTab('normalization')}
            className={`main-tab-btn ${activeTab === 'normalization' ? 'active-tab' : ''}`}
          >
            📊 Normalization (1NF-BCNF)
          </button>
          <button
            onClick={() => setActiveTab('btree')}
            className={`main-tab-btn ${activeTab === 'btree' ? 'active-tab' : ''}`}
          >
            🌳 B+ Tree Indexing
          </button>
          <button
            onClick={() => setActiveTab('concurrency')}
            className={`main-tab-btn ${activeTab === 'concurrency' ? 'active-tab' : ''}`}
          >
            🔒 Concurrency & 2PL Locks
          </button>
          <button
            onClick={() => setActiveTab('query')}
            className={`main-tab-btn ${activeTab === 'query' ? 'active-tab' : ''}`}
          >
            ⚡ Query Optimizer (CBO)
          </button>
        </div>
      </div>

      {/* SUB-TAB CONTENT 1: ARCHITECTURE & DATA INDEPENDENCE */}
      {activeTab === 'architecture' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🏛 ANSI-SPARC 3-Schema Architecture Diagram</h3>
            
            <div className="encap-layers-container">
              {/* External Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-purple)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-purple)' }}>1. External Level (User Views)</span>
                <span className="header-pill" style={{ background: '#7c3aed' }}>View A: Student GPA | View B: Admin Billing</span>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ↕ Logical Data Independence Mapping Layer
              </div>

              {/* Conceptual Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-blue)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-blue)' }}>2. Conceptual Schema</span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {conceptualColumns.map((col, idx) => (
                    <span key={idx} className="header-pill" style={{ background: '#1d4ed8' }}>{col}</span>
                  ))}
                </div>
              </div>

              <div style={{ textAlign: 'center', color: 'var(--accent-amber)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                ↕ Physical Data Independence Mapping Layer
              </div>

              {/* Internal Level */}
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--accent-green)' }}>
                <span className="layer-title" style={{ color: 'var(--accent-green)' }}>3. Internal Schema (Physical Storage)</span>
                <span className="header-pill" style={{ background: '#047857' }}>{diskEngine}</span>
              </div>
            </div>

            <div className="action-buttons-group" style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
              <button onClick={triggerPhysicalChange} className="btn btn-primary">
                ⚡ Modify Physical Storage (Test Physical Independence)
              </button>
              <button onClick={triggerLogicalChange} className="btn btn-secondary">
                ➕ Add Conceptual Attribute (Test Logical Independence)
              </button>
            </div>
          </div>

          <div className="viz-card">
            <h3>📜 Data Independence Audit Log</h3>
            <div className="event-log-container" style={{ maxHeight: '250px' }}>
              {dataIndepLog.map((log, idx) => (
                <div key={idx} className="log-entry">
                  <span className="log-text">{log}</span>
                </div>
              ))}
              {dataIndepLog.length === 0 && (
                <span className="empty-text">Click the buttons on the left to simulate physical disk changes or logical schema alterations!</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 2: ATTRIBUTE CLOSURE & CANDIDATE KEYS */}
      {activeTab === 'closure' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>🗝 Functional Dependency & Closure Calculator</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Relation Attributes (comma separated):
                </label>
                <input
                  type="text"
                  value={attributesInput}
                  onChange={e => setAttributesInput(e.target.value)}
                  className="num-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                  Functional Dependencies (FDs):
                </label>
                <input
                  type="text"
                  value={fdsInput}
                  onChange={e => setFdsInput(e.target.value)}
                  placeholder="e.g. A->B, B->C, C->D"
                  className="num-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 'bold', marginBottom: '0.3rem' }}>
                    Target Attribute(s) for Closure X+:
                  </label>
                  <input
                    type="text"
                    value={closureTarget}
                    onChange={e => setClosureTarget(e.target.value)}
                    className="num-input"
                    style={{ width: '100%' }}
                  />
                </div>
                <button onClick={handleSolveClosure} className="btn btn-primary" style={{ marginTop: '1.2rem' }}>
                  🧮 Compute ({closureTarget})+
                </button>
              </div>

              <button onClick={handleFindCandidateKeys} className="btn btn-action" style={{ width: '100%' }}>
                🔍 Find All Candidate Keys & Prime Attributes
              </button>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Closure & Candidate Key Solver Results</h3>

            {closureResult && (
              <div style={{ marginBottom: '1.5rem', background: '#0f172a', padding: '1rem', borderRadius: '10px' }}>
                <h4>Attribute Closure ({closureResult.target})⁺</h4>
                <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: 'var(--accent-purple)', margin: '0.5rem 0' }}>
                  ({closureResult.target})⁺ = &#123; {closureResult.closure} &#125;
                </div>
                <p style={{ fontSize: '0.85rem' }}>
                  Is Super Key? <strong>{closureResult.isSuperKey ? '✅ YES (Determines all attributes!)' : '❌ NO'}</strong>
                </p>
                <div className="event-log-container" style={{ maxHeight: '100px', marginTop: '0.5rem' }}>
                  {closureResult.steps.map((step, idx) => (
                    <div key={idx} className="log-entry"><span className="log-text">{step}</span></div>
                  ))}
                </div>
              </div>
            )}

            {candidateKeyResult && (
              <div style={{ background: '#0f172a', padding: '1rem', borderRadius: '10px' }}>
                <h4>🔑 Candidate Keys Detected</h4>
                <div style={{ display: 'flex', gap: '0.5rem', margin: '0.5rem 0' }}>
                  {candidateKeyResult.candidateKeys.map((ck, idx) => (
                    <span key={idx} className="header-pill" style={{ background: '#059669', fontSize: '1rem' }}>
                      🔑 Key #{idx + 1}: {ck}
                    </span>
                  ))}
                </div>
                <div style={{ fontSize: '0.85rem', marginTop: '0.5rem' }}>
                  <p><strong>Prime Attributes:</strong> &#123; {candidateKeyResult.primeAttrs.join(', ')} &#125;</p>
                  <p><strong>Non-Prime Attributes:</strong> &#123; {candidateKeyResult.nonPrimeAttrs.join(', ') || 'None'} &#125;</p>
                </div>
              </div>
            )}

            {!closureResult && !candidateKeyResult && (
              <span className="empty-text">Enter your functional dependencies and click compute to see closure expansions and key identification!</span>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 3: NORMALIZATION SIMULATOR */}
      {activeTab === 'normalization' && (
        <div className="metrics-grid">
          <div className="viz-card" style={{ gridColumn: 'span 2' }}>
            <h3>📊 Database Normalization Anomaly & Table Decomposition Inspector</h3>
            
            <div className="main-tab-switcher" style={{ margin: '1rem 0' }}>
              <button onClick={() => setNormalStage('0nf')} className={`main-tab-btn ${normalStage === '0nf' ? 'active-tab' : ''}`}>0NF (Unnormalized)</button>
              <button onClick={() => setNormalStage('1nf')} className={`main-tab-btn ${normalStage === '1nf' ? 'active-tab' : ''}`}>1NF (Atomic Values)</button>
              <button onClick={() => setNormalStage('2nf')} className={`main-tab-btn ${normalStage === '2nf' ? 'active-tab' : ''}`}>2NF (No Partial FDs)</button>
              <button onClick={() => setNormalStage('3nf')} className={`main-tab-btn ${normalStage === '3nf' ? 'active-tab' : ''}`}>3NF (No Transitive FDs)</button>
              <button onClick={() => setNormalStage('bcnf')} className={`main-tab-btn ${normalStage === 'bcnf' ? 'active-tab' : ''}`}>BCNF (Strict Super Key)</button>
            </div>

            {normalStage === '0nf' && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-red)' }}>⚠️ 0NF (Unnormalized Table) — Data Anomalies Present!</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Contains non-atomic multivalued attributes (`Courses`) and transitive redundancy.</p>
                <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      <th>StudentID</th><th>StudentName</th><th>Courses (Multivalued)</th><th>DeptName</th><th>DeptHead</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>101</td><td>Alice</td><td>CS101, CS102</td><td>CompSci</td><td>Dr. Smith</td></tr>
                    <tr><td>102</td><td>Bob</td><td>EE201</td><td>Electrical</td><td>Dr. Johnson</td></tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '1rem', background: '#3f1212', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--accent-red)', fontSize: '0.85rem' }}>
                  🚨 <strong>Anomalies Alert:</strong> Updating Dr. Smith requires updating multiple student rows. Deleting Bob deletes Electrical Dept record completely!
                </div>
              </div>
            )}

            {normalStage === '1nf' && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-amber)' }}>🟢 1NF (First Normal Form) — Atomicity Achieved</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>Multivalued attributes converted to individual atomic rows. Composite PK: <u>(StudentID, CourseID)</u>.</p>
                <table style={{ width: '100%', marginTop: '1rem', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#1e293b' }}>
                      <th>StudentID (PK)</th><th>StudentName</th><th>CourseID (PK)</th><th>DeptName</th><th>DeptHead</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr><td>101</td><td>Alice</td><td>CS101</td><td>CompSci</td><td>Dr. Smith</td></tr>
                    <tr><td>101</td><td>Alice</td><td>CS102</td><td>CompSci</td><td>Dr. Smith</td></tr>
                    <tr><td>102</td><td>Bob</td><td>EE201</td><td>Electrical</td><td>Dr. Johnson</td></tr>
                  </tbody>
                </table>
              </div>
            )}

            {normalStage === '2nf' && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-blue)' }}>🟡 2NF (Second Normal Form) — Partial Dependency Removed</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>`StudentName` depended on part of PK (`StudentID`). Decomposed into 2 tables:</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <h5>Table 1: Student (StudentID ➔ StudentName, DeptName, DeptHead)</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#1e293b' }}><th>StudentID (PK)</th><th>StudentName</th><th>DeptName</th></tr></thead>
                      <tbody>
                        <tr><td>101</td><td>Alice</td><td>CompSci</td></tr>
                        <tr><td>102</td><td>Bob</td><td>Electrical</td></tr>
                      </tbody>
                    </table>
                  </div>
                  <div>
                    <h5>Table 2: Enrollment (StudentID, CourseID)</h5>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead><tr style={{ background: '#1e293b' }}><th>StudentID (FK)</th><th>CourseID (PK)</th></tr></thead>
                      <tbody>
                        <tr><td>101</td><td>CS101</td></tr>
                        <tr><td>101</td><td>CS102</td></tr>
                        <tr><td>102</td><td>EE201</td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {normalStage === '3nf' && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-purple)' }}>🔴 3NF (Third Normal Form) — Transitive Dependency Removed</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>`DeptHead` depended transitively on `DeptName` (`StudentID ➔ DeptName ➔ DeptHead`). Decomposed Department table!</p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div>
                    <h5>Student Table</h5>
                    <table style={{ width: '100%' }}><thead><tr><th>StudentID</th><th>DeptID (FK)</th></tr></thead><tbody><tr><td>101</td><td>D01</td></tr></tbody></table>
                  </div>
                  <div>
                    <h5>Department Table</h5>
                    <table style={{ width: '100%' }}><thead><tr><th>DeptID (PK)</th><th>DeptHead</th></tr></thead><tbody><tr><td>D01</td><td>Dr. Smith</td></tr></tbody></table>
                  </div>
                  <div>
                    <h5>Enrollment Table</h5>
                    <table style={{ width: '100%' }}><thead><tr><th>StudentID</th><th>CourseID</th></tr></thead><tbody><tr><td>101</td><td>CS101</td></tr></tbody></table>
                  </div>
                </div>
              </div>
            )}

            {normalStage === 'bcnf' && (
              <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
                <h4 style={{ color: 'var(--accent-green)' }}>✨ BCNF (Boyce-Codd Normal Form) — Perfect Functional Isolation</h4>
                <p style={{ fontSize: '0.9rem', margin: '0.5rem 0' }}>For every functional dependency $X \rightarrow Y$, $X$ is strictly a Super Key. Zero redundancy!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 4: B+ TREE INDEX SIMULATOR */}
      {activeTab === 'btree' && (
        <BPlusTreeVisualizer />
      )}

      {/* SUB-TAB CONTENT 5: CONCURRENCY CONTROL & 2PL */}
      {activeTab === 'concurrency' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>📈 Precedence Graph & Conflict Serializability Test</h3>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Input Schedule Operations:</label>
              <input
                type="text"
                value={scheduleInput}
                onChange={e => setScheduleInput(e.target.value)}
                className="num-input"
                style={{ width: '100%', marginTop: '0.3rem' }}
              />
              <button onClick={handleTestSerializability} className="btn btn-action" style={{ width: '100%', marginTop: '0.75rem' }}>
                ⚡ Test Conflict Serializability & Cycles
              </button>
            </div>

            {serializabilityResult && (
              <div style={{ marginTop: '1.25rem', background: '#0f172a', padding: '1rem', borderRadius: '10px' }}>
                <h4>Graph Analysis Results</h4>
                <div className={`result-banner ${serializabilityResult.isConflictSerializable ? 'banner-safe' : 'banner-unsafe'}`}>
                  <strong>{serializabilityResult.isConflictSerializable ? '✅ CONFLICT SERIALIZABLE (No Cycles!)' : '🚨 NOT SERIALIZABLE (Cycle Detected!)'}</strong>
                </div>

                <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>
                  <strong>Detected Conflict Edges:</strong>
                  <ul>
                    {serializabilityResult.edges.map((e, idx) => (
                      <li key={idx}>T{e.from} ➔ T{e.to} (Conflict on item '{e.item}': {e.conflict})</li>
                    ))}
                    {serializabilityResult.edges.length === 0 && <li>No conflicting operations found.</li>}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <div className="viz-card">
            <h3>🔒 Strict 2-Phase Locking (2PL) Matrix</h3>
            
            <div className="transaction-boxes">
              <div className="tx-box">
                <h4>Transaction T1</h4>
                <div className="tx-state">Lock Held: <strong>{t1Lock}</strong></div>
                <div className="action-buttons-group" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleT1Request('S')} className="btn btn-secondary">Request S Lock</button>
                  <button onClick={() => handleT1Request('X')} className="btn btn-secondary">Request X Lock</button>
                  <button onClick={() => { setT1Lock('NONE'); setLockLog(prev => ['[T1] RELEASED locks at COMMIT.', ...prev]) }} className="btn btn-primary">Commit & Unlock</button>
                </div>
              </div>

              <div className="tx-box">
                <h4>Transaction T2</h4>
                <div className="tx-state">Lock Held: <strong>{t2Lock}</strong></div>
                <div className="action-buttons-group" style={{ marginTop: '0.5rem', display: 'flex', gap: '0.5rem' }}>
                  <button onClick={() => handleT2Request('S')} className="btn btn-secondary">Request S Lock</button>
                  <button onClick={() => handleT2Request('X')} className="btn btn-secondary">Request X Lock</button>
                  <button onClick={() => { setT2Lock('NONE'); setLockLog(prev => ['[T2] RELEASED locks at COMMIT.', ...prev]) }} className="btn btn-primary">Commit & Unlock</button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <h4>Lock Audit Log</h4>
              <div className="event-log-container" style={{ maxHeight: '120px' }}>
                {lockLog.map((l, idx) => <div key={idx} className="log-entry"><span className="log-text">{l}</span></div>)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB CONTENT 6: QUERY OPTIMIZER & CBO EVALUATOR */}
      {activeTab === 'query' && (
        <div className="metrics-grid">
          <div className="viz-card">
            <h3>⚡ Cost-Based Query Optimizer (CBO) Evaluator</h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>Table Row Count (N): {rowCount.toLocaleString()} rows</label>
                <input
                  type="range"
                  min="1000"
                  max="2000000"
                  step="50000"
                  value={rowCount}
                  onChange={e => setRowCount(Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="checkbox"
                  id="chkIdx"
                  checked={hasIndex}
                  onChange={e => setHasIndex(e.target.checked)}
                />
                <label htmlFor="chkIdx" style={{ fontSize: '0.9rem', fontWeight: 'bold' }}>Use B+ Tree Secondary Index Scan</label>
              </div>

              <div>
                <label style={{ fontSize: '0.85rem', fontWeight: 'bold', display: 'block', marginBottom: '0.3rem' }}>Select Physical Join Strategy:</label>
                <select
                  value={joinStrategy}
                  onChange={e => setJoinStrategy(e.target.value)}
                  className="num-input"
                  style={{ width: '100%' }}
                >
                  <option value="nested">Nested-Loop Join O(N × M)</option>
                  <option value="hash">Hash Join O(N + M) [Recommended]</option>
                  <option value="merge">Sort-Merge Join O(N log N)</option>
                </select>
              </div>
            </div>
          </div>

          <div className="viz-card">
            <h3>📊 Physical Execution Plan Cost Summary</h3>

            <div style={{ background: '#0f172a', padding: '1.25rem', borderRadius: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Disk Pages (100 rows/page):</span>
                <strong>{queryMetrics.tablePages.toLocaleString()} pages</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Access Scan Cost:</span>
                <strong style={{ color: hasIndex ? 'var(--accent-green)' : 'var(--accent-amber)' }}>
                  {queryMetrics.scanCost} I/O units ({hasIndex ? 'Index Scan' : 'Full Table Scan'})
                </strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <span>Join Execution Cost:</span>
                <strong>{queryMetrics.joinCost} CPU/IO units</strong>
              </div>

              <hr style={{ borderColor: 'var(--border-color)', margin: '1rem 0' }} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 'bold' }}>
                <span>Total Optimizer Cost:</span>
                <span style={{ color: 'var(--accent-purple)' }}>{queryMetrics.totalCost} units</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
