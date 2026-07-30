import { useState, useEffect } from 'react'
import { fetchPageReplacementSimulation } from '../../utils/api'

export default function MemoryVisualizer() {
  const [algo, setAlgo] = useState('LRU') // LRU, FIFO, OPTIMAL
  const [numFrames, setNumFrames] = useState(3)
  const [referenceStream, setReferenceStream] = useState([7, 0, 1, 2, 0, 3, 0, 4, 2, 3, 0, 3, 2])
  const [currentStep, setCurrentStep] = useState(0)
  const [framesState, setFramesState] = useState([])
  const [faultsCount, setFaultsCount] = useState(0)
  const [hitsCount, setHitsCount] = useState(0)
  const [history, setHistory] = useState([])

  // Virtual Address Translator State
  const [virtualAddress, setVirtualAddress] = useState(24580)
  const [pageSizeKB, setPageSizeKB] = useState(4) // 4KB

  useEffect(() => {
    fetchPageReplacementSimulation({ stream: referenceStream, numFrames, algorithm: algo })
      .then(res => {
        setHistory(res.stepHistory || [])
        setCurrentStep(0)
      })
      .catch(() => {
        const res = runPageReplacement(referenceStream, numFrames, algo)
        setHistory(res.stepHistory)
        setCurrentStep(0)
      })
  }, [referenceStream, numFrames, algo])

  const maxSteps = referenceStream.length

  const handleStep = (stepIdx) => {
    if (stepIdx < 0 || stepIdx > maxSteps) return
    setCurrentStep(stepIdx)
  }

  const currentStepData = history[currentStep - 1] || {
    page: null,
    frames: Array(numFrames).fill(null),
    isFault: false,
    hit: false,
    faultsSoFar: 0,
    hitsSoFar: 0
  }

  // Address translation math
  const pageSizeBytes = pageSizeKB * 1024
  const pageNumber = Math.floor(virtualAddress / pageSizeBytes)
  const offset = virtualAddress % pageSizeBytes
  const simulatedFrameNumber = (pageNumber * 3 + 2) % 16
  const physicalAddress = simulatedFrameNumber * pageSizeBytes + offset

  return (
    <div className="visualizer-container">
      <div className="viz-header">
        <div className="viz-title-group">
          <h2>🧠 Virtual Memory & Page Replacement Visualizer</h2>
          <p>Simulate Page Replacement Algorithms (LRU, FIFO, Optimal) and Virtual-to-Physical Address Translation.</p>
        </div>
      </div>

      {/* Control Panel */}
      <div className="viz-controls-card">
        <div className="control-row">
          <div className="control-group">
            <label>Algorithm:</label>
            <select value={algo} onChange={e => setAlgo(e.target.value)} className="select-input">
              <option value="LRU">Least Recently Used (LRU)</option>
              <option value="FIFO">First-In First-Out (FIFO)</option>
              <option value="OPTIMAL">Optimal Page Replacement</option>
            </select>
          </div>

          <div className="control-group">
            <label>Physical Frames:</label>
            <select value={numFrames} onChange={e => setNumFrames(Number(e.target.value))} className="select-input">
              <option value={3}>3 Frames</option>
              <option value={4}>4 Frames</option>
              <option value={5}>5 Frames</option>
            </select>
          </div>

          <div className="control-group buttons-group">
            <button
              onClick={() => handleStep(0)}
              className="btn btn-secondary"
            >
              ⏮ Reset
            </button>
            <button
              onClick={() => handleStep(currentStep - 1)}
              disabled={currentStep <= 0}
              className="btn btn-secondary"
            >
              ◀ Step Back
            </button>
            <button
              onClick={() => handleStep(currentStep + 1)}
              disabled={currentStep >= maxSteps}
              className="btn btn-primary"
            >
              Step Next ▶
            </button>
          </div>
        </div>
      </div>

      {/* Reference Stream Display */}
      <div className="viz-card">
        <h3>🔢 Page Reference Sequence</h3>
        <div className="stream-container">
          {referenceStream.map((pageVal, idx) => {
            const isCurrent = idx === currentStep - 1
            const stepInfo = history[idx]
            const isHit = stepInfo?.hit
            return (
              <div
                key={idx}
                className={`stream-badge ${isCurrent ? 'stream-active' : ''} ${stepInfo && idx < currentStep ? (isHit ? 'stream-hit' : 'stream-fault') : ''}`}
                onClick={() => setCurrentStep(idx + 1)}
              >
                <span className="page-num">{pageVal}</span>
                {stepInfo && idx < currentStep && (
                  <span className="status-sub">{isHit ? 'HIT' : 'FAULT'}</span>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* RAM Physical Frames State */}
      <div className="metrics-grid">
        <div className="viz-card">
          <h3>🖼 Physical Memory Frames (RAM)</h3>
          <div className="frames-container">
            {Array.from({ length: numFrames }).map((_, fIdx) => {
              const pageVal = currentStepData.frames[fIdx]
              return (
                <div key={fIdx} className="frame-box">
                  <div className="frame-header">Frame {fIdx}</div>
                  <div className={`frame-content ${pageVal !== null && pageVal !== undefined ? 'frame-filled' : 'frame-empty'}`}>
                    {pageVal !== null && pageVal !== undefined ? (
                      <span>Page {pageVal}</span>
                    ) : (
                      <span className="empty-text">Empty</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="stats-banner">
            <div className="stat-pill fault-pill">
              <span>Page Faults:</span>
              <strong>{currentStepData.faultsSoFar}</strong>
            </div>
            <div className="stat-pill hit-pill">
              <span>Page Hits:</span>
              <strong>{currentStepData.hitsSoFar}</strong>
            </div>
            <div className="stat-pill rate-pill">
              <span>Hit Ratio:</span>
              <strong>
                {currentStep > 0 ? `${((currentStepData.hitsSoFar / currentStep) * 100).toFixed(1)}%` : '0%'}
              </strong>
            </div>
          </div>
        </div>

        {/* Address Translation Calculator */}
        <div className="viz-card">
          <h3>🧮 Address Translation (MMU)</h3>
          <div className="mmu-form">
            <div className="form-row">
              <label>Virtual Address (Bytes):</label>
              <input
                type="number"
                value={virtualAddress}
                onChange={e => setVirtualAddress(Number(e.target.value))}
                className="num-input"
              />
            </div>
            <div className="form-row">
              <label>Page Size:</label>
              <select value={pageSizeKB} onChange={e => setPageSizeKB(Number(e.target.value))} className="select-input">
                <option value={4}>4 KB (4096 B)</option>
                <option value={2}>2 KB (2048 B)</option>
                <option value={8}>8 KB (8192 B)</option>
              </select>
            </div>
          </div>

          <div className="mmu-results">
            <div className="mmu-box">
              <span className="mmu-label">Page Number (VPN)</span>
              <span className="mmu-val">{pageNumber}</span>
              <span className="mmu-calc">floor({virtualAddress} / {pageSizeBytes})</span>
            </div>
            <div className="mmu-box">
              <span className="mmu-label">Offset</span>
              <span className="mmu-val">{offset}</span>
              <span className="mmu-calc">{virtualAddress} mod {pageSizeBytes}</span>
            </div>
            <div className="mmu-box result-box">
              <span className="mmu-label">Mapped Physical Address</span>
              <span className="mmu-val highlight-val">{physicalAddress}</span>
              <span className="mmu-calc">Frame {simulatedFrameNumber} × {pageSizeBytes} + {offset}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function runPageReplacement(stream, numFrames, algo) {
  let stepHistory = []
  let currentFrames = Array(numFrames).fill(null)
  let faults = 0
  let hits = 0
  let recentUsage = [] // For LRU

  stream.forEach((page, stepIdx) => {
    let hit = currentFrames.includes(page)

    if (hit) {
      hits++
      if (algo === 'LRU') {
        recentUsage = recentUsage.filter(p => p !== page)
        recentUsage.push(page)
      }
    } else {
      faults++
      let emptyIdx = currentFrames.indexOf(null)
      if (emptyIdx !== -1) {
        currentFrames[emptyIdx] = page
        recentUsage.push(page)
      } else {
        // Eviction
        let evictPage = null
        if (algo === 'FIFO') {
          evictPage = recentUsage.shift()
        } else if (algo === 'LRU') {
          evictPage = recentUsage.shift()
        } else if (algo === 'OPTIMAL') {
          // Look into future
          let future = stream.slice(stepIdx + 1)
          let maxNextUse = -1
          let evictCandidate = currentFrames[0]
          currentFrames.forEach(f => {
            let nextUse = future.indexOf(f)
            if (nextUse === -1) {
              evictCandidate = f
              maxNextUse = Infinity
            } else if (nextUse > maxNextUse) {
              maxNextUse = nextUse
              evictCandidate = f
            }
          })
          evictPage = evictCandidate
        }

        let replaceIdx = currentFrames.indexOf(evictPage)
        if (replaceIdx !== -1) {
          currentFrames[replaceIdx] = page
        } else {
          currentFrames[0] = page
        }
        recentUsage.push(page)
      }
    }

    stepHistory.push({
      page,
      frames: [...currentFrames],
      isFault: !hit,
      hit,
      faultsSoFar: faults,
      hitsSoFar: hits
    })
  })

  return { stepHistory }
}
