import React, { useState } from 'react'

export default function DeadlockVisualizer() {
  const [allocation, setAllocation] = useState([
    [0, 1, 0],
    [2, 0, 0],
    [3, 0, 2],
    [2, 1, 1],
    [0, 0, 2],
  ])

  const [max, setMax] = useState([
    [7, 5, 3],
    [3, 2, 2],
    [9, 0, 2],
    [2, 2, 2],
    [4, 3, 3],
  ])

  const [available, setAvailable] = useState([3, 3, 2])
  const [result, setResult] = useState(null)

  const calculateSafety = () => {
    const numProcesses = 5
    const numResources = 3

    let work = [...available]
    let finish = Array(numProcesses).fill(false)
    let safeSequence = []

    let need = allocation.map((allocRow, pIdx) =>
      allocRow.map((allocVal, rIdx) => max[pIdx][rIdx] - allocVal)
    )

    let count = 0
    while (count < numProcesses) {
      let found = false
      for (let i = 0; i < numProcesses; i++) {
        if (!finish[i]) {
          // Check if Need_i <= Work
          let canExecute = true
          for (let j = 0; j < numResources; j++) {
            if (need[i][j] > work[j]) {
              canExecute = false
              break
            }
          }

          if (canExecute) {
            for (let j = 0; j < numResources; j++) {
              work[j] += allocation[i][j]
            }
            safeSequence.push(`P${i}`)
            finish[i] = true
            found = true
            count++
          }
        }
      }

      if (!found) break
    }

    if (count === numProcesses) {
      setResult({
        isSafe: true,
        sequence: safeSequence,
        work
      })
    } else {
      setResult({
        isSafe: false,
        sequence: [],
        work
      })
    }
  }

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🛡 Banker's Algorithm & Deadlock Detector</h2>
          <p>Determine safe sequences, evaluate resource allocation matrices, and detect potential deadlocks.</p>
        </div>
      </div>

      <div className="metrics-grid">
        {/* Input Matrices */}
        <div className="viz-card">
          <h3>📊 Resource Matrices (R0, R1, R2)</h3>
          <div className="matrix-tables">
            <h4>Allocation Matrix</h4>
            <table className="viz-table text-center">
              <thead>
                <tr><th>Process</th><th>R0</th><th>R1</th><th>R2</th></tr>
              </thead>
              <tbody>
                {allocation.map((row, i) => (
                  <tr key={i}>
                    <td><strong>P{i}</strong></td>
                    {row.map((val, j) => <td key={j}>{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>

            <h4>Max Demand Matrix</h4>
            <table className="viz-table text-center">
              <thead>
                <tr><th>Process</th><th>R0</th><th>R1</th><th>R2</th></tr>
              </thead>
              <tbody>
                {max.map((row, i) => (
                  <tr key={i}>
                    <td><strong>P{i}</strong></td>
                    {row.map((val, j) => <td key={j}>{val}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Available Vector & Controls */}
        <div className="viz-card">
          <h3>📦 Available System Resources</h3>
          <div className="available-inputs">
            <div className="input-box">
              <label>Resource R0:</label>
              <input
                type="number"
                value={available[0]}
                onChange={e => setAvailable([Number(e.target.value), available[1], available[2]])}
                className="num-input"
              />
            </div>
            <div className="input-box">
              <label>Resource R1:</label>
              <input
                type="number"
                value={available[1]}
                onChange={e => setAvailable([available[0], Number(e.target.value), available[2]])}
                className="num-input"
              />
            </div>
            <div className="input-box">
              <label>Resource R2:</label>
              <input
                type="number"
                value={available[2]}
                onChange={e => setAvailable([available[0], available[1], Number(e.target.value)])}
                className="num-input"
              />
            </div>
          </div>

          <button onClick={calculateSafety} className="btn btn-primary btn-block" style={{ marginTop: '1.5rem' }}>
            ⚡ Run Safety Algorithm
          </button>

          {result && (
            <div className={`result-banner ${result.isSafe ? 'banner-safe' : 'banner-unsafe'}`}>
              <h4>{result.isSafe ? '✅ SYSTEM IS IN A SAFE STATE' : '❌ DEADLOCK DETECTED / UNSAFE STATE'}</h4>
              {result.isSafe ? (
                <p>Safe Execution Sequence: <strong>{result.sequence.join(' ➔ ')}</strong></p>
              ) : (
                <p>System cannot guarantee deadlock prevention with current allocation!</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
