import React, { useState, useEffect, useRef } from 'react'
import { BPlusTree, calculateTreeLayout } from '../../../utils/simulationEngines/bplusTreeEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import dbmsData from '../../../data/dbms-concepts-bplus-tree.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

export default function BPlusTreeVisualizer() {
  const [order, setOrder] = useState(3) // Default Order M = 3
  const [treeInstance, setTreeInstance] = useState(() => new BPlusTree(3))

  // Timeline simulation steps
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1200)

  // Input states
  const [inputKey, setInputKey] = useState('')
  const [logMessages, setLogMessages] = useState(['B+ Tree initialized with Order M = 3. Add keys to observe node splitting.'])

  // Reset tree when order changes
  const handleOrderChange = (newOrder) => {
    setOrder(newOrder)
    const newTree = new BPlusTree(newOrder)
    setTreeInstance(newTree)
    setSteps([])
    setCurrentStepIdx(0)
    setIsPlaying(false)
    setLogMessages([`Reset B+ Tree to Order M = ${newOrder} (Max ${newOrder - 1} keys per node).`])
  }

  // Pre-fill initial tree for clean visualization start
  useEffect(() => {
    const initialTree = new BPlusTree(order)
    // Insert initial keys [10, 20, 5, 15, 25, 30]
    initialTree.insert(10)
    initialTree.insert(20)
    initialTree.insert(5)
    initialTree.insert(15)
    initialTree.insert(25)
    initialTree.insert(30)
    setTreeInstance(initialTree)
  }, [])

  // Auto-play timer
  useEffect(() => {
    let timer = null
    if (isPlaying && steps.length > 0 && !prefersReducedMotion()) {
      timer = setInterval(() => {
        setCurrentStepIdx(prev => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, steps.length, speed])

  // Handle single key insert
  const handleInsert = (e) => {
    if (e) e.preventDefault()
    const num = parseInt(inputKey, 10)
    if (isNaN(num)) return

    const insertSteps = treeInstance.insert(num)
    setSteps(insertSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
    setInputKey('')

    const finalStep = insertSteps[insertSteps.length - 1]
    setLogMessages(prev => [finalStep.description, ...prev])
  }

  // Handle key search
  const handleSearch = (e) => {
    if (e) e.preventDefault()
    const num = parseInt(inputKey, 10)
    if (isNaN(num)) return

    const searchSteps = treeInstance.generateSearchSteps(num)
    setSteps(searchSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)

    const finalStep = searchSteps[searchSteps.length - 1]
    setLogMessages(prev => [finalStep.description, ...prev])
  }

  // Run auto sequence demo
  const handleAutoDemo = () => {
    const demoTree = new BPlusTree(order)
    const keysToInsert = [10, 20, 5, 15, 25, 30, 35, 40, 50]
    let allSteps = []

    keysToInsert.forEach(k => {
      const s = demoTree.insert(k)
      allSteps = [...allSteps, ...s]
    })

    setTreeInstance(demoTree)
    setSteps(allSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
    setLogMessages(prev => ['Started auto sequence insertion of 9 keys...', ...prev])
  }

  // Get active step & layout
  const currentStep = steps[currentStepIdx] || null
  const activeTreeRoot = currentStep ? currentStep.tree : treeInstance.root
  const layout = calculateTreeLayout(activeTreeRoot, 900, 50, 90)

  const activeNodeId = currentStep?.highlightedNodeId || null
  const statusMessage = currentStep?.description || 'Ready for operations. Insert or search keys.'

  const simulationView = (
    <div className="visualizer-container">
      {/* Control Panel Card */}
      <div className="viz-controls-card bptree-toolbar">
        <form onSubmit={handleInsert} className="bptree-form-row">
          <div className="u-row">
            <label className="field-label-strong">Tree Order (M):</label>
            <select
              value={order}
              onChange={e => handleOrderChange(Number(e.target.value))}
              className="select-input is-compact"
            >
              <option value={3}>M = 3 (Max 2 keys)</option>
              <option value={4}>M = 4 (Max 3 keys)</option>
              <option value={5}>M = 5 (Max 4 keys)</option>
            </select>
          </div>

          <div className="bptree-key-group">
            <input
              type="number"
              placeholder="Enter key (e.g. 42)"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              className="num-input bptree-key-input"
            />
            <button type="submit" className="btn btn-primary is-snug">
              + Insert
            </button>
            <button type="button" onClick={handleSearch} className="btn btn-secondary is-snug">
              🔍 Search
            </button>
          </div>

          <button type="button" onClick={handleAutoDemo} className="btn btn-secondary is-snug">
            ⚡ Run Auto-Insert Demo
          </button>
        </form>

        <SimulationControlBar
          isPlaying={isPlaying}
          onTogglePlay={() => setIsPlaying(!isPlaying)}
          onStepForward={() => setCurrentStepIdx(prev => Math.min(steps.length - 1, prev + 1))}
          onStepBackward={() => setCurrentStepIdx(prev => Math.max(0, prev - 1))}
          onReset={() => { setCurrentStepIdx(0); setIsPlaying(false); }}
          currentTime={currentStepIdx}
          maxTime={Math.max(0, steps.length - 1)}
          speed={speed}
          onSpeedChange={setSpeed}
          onSeek={setCurrentStepIdx}
        />
      </div>

      {/* Action Description Banner */}
      <div className="action-banner">
        <span className="banner-icon">💡</span>
        <div>
          <strong>Step Action:</strong> {statusMessage}
        </div>
      </div>

      {/* Interactive B+ Tree Canvas */}
      <div className="viz-card bptree-canvas-card u-scroll-x-hint">
        <h3>
          <span>📊 Animated B+ Tree Structure (Order M = {order})</span>
          <span className="hint">
            🍃 Leaves connected via linked-list pointers
          </span>
        </h3>

        <div style={{ width: '100%', minWidth: `${layout.totalWidth}px`, display: 'flex', justifyContent: 'center' }}>
          <svg width={layout.totalWidth} height="320" className="bptree-svg">
            <defs>
              {/* Arrow marker for leaf links */}
              <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" style={{ fill: 'var(--state-success)' }} />
              </marker>
            </defs>

            {/* Render Parent -> Child Branch Edges */}
            {layout.edges.map(edge => (
              <line
                key={edge.id}
                x1={edge.x1}
                y1={edge.y1}
                x2={edge.x2}
                y2={edge.y2}
                style={{ stroke: 'var(--border-strong)' }}
                strokeWidth="2"
              />
            ))}

            {/* Render Horizontal Leaf Linked List Links */}
            {layout.leafEdges.map(lEdge => (
              <line
                key={lEdge.id}
                x1={lEdge.x1}
                y1={lEdge.y1 + 10}
                x2={lEdge.x2}
                y2={lEdge.y2 + 10}
                style={{ stroke: 'var(--state-success)' }}
                strokeWidth="2"
                strokeDasharray="4 4"
                markerEnd="url(#arrow)"
              />
            ))}

            {/* Render B+ Tree Nodes */}
            {layout.nodes.map(node => {
              const isActive = node.id === activeNodeId
              const isOverflow = node.keys.length > order - 1
              const nodeWidth = Math.max(90, node.keys.length * 34 + 24)
              const rectX = node.x - nodeWidth / 2
              const rectY = node.y - 20

              let borderColor = 'var(--border-strong)'
              let bgColor = 'var(--bg-surface)'
              if (isActive) {
                borderColor = 'var(--state-info)'
                bgColor = 'var(--state-info-tint)'
              }
              if (isOverflow) {
                borderColor = 'var(--state-warning)'
                bgColor = 'var(--state-warning-tint)'
              }
              if (currentStep?.type === 'SEARCH_HIT' && isActive) {
                borderColor = 'var(--state-success)'
                bgColor = 'var(--state-success-tint)'
              }

              return (
                <g key={node.id} style={{ transition: 'all 0.3s ease' }}>
                  {/* Node Box Container */}
                  <rect
                    x={rectX}
                    y={rectY}
                    width={nodeWidth}
                    height="42"
                    rx="8"
                    strokeWidth={isActive ? '2.5' : '1.5'}
                    style={{ fill: bgColor, stroke: borderColor, transition: 'all 0.3s ease' }}
                  />

                  {/* Leaf Indicator Badge */}
                  <text
                    x={rectX + 6}
                    y={rectY - 6}
                    fontSize="10"
                    fontWeight="bold"
                    style={{ fill: node.isLeaf ? 'var(--state-success)' : 'var(--cat-os-base)' }}
                  >
                    {node.isLeaf ? 'LEAF' : 'INTERNAL'}
                  </text>

                  {/* Keys inside node */}
                  {node.keys.map((key, keyIdx) => {
                    const keyX = rectX + 16 + keyIdx * 34
                    const isKeyHighlighted = currentStep?.highlightedKey === key

                    return (
                      <g key={keyIdx}>
                        {/* Key Cell Box */}
                        <rect
                          x={keyX - 10}
                          y={rectY + 8}
                          width="28"
                          height="26"
                          rx="4"
                          style={{
                            fill: isKeyHighlighted ? 'var(--state-success)' : 'var(--bg-raised)',
                            stroke: isKeyHighlighted ? 'var(--state-success-border)' : 'var(--border-default)'
                          }}
                        />
                        <text
                          x={keyX + 4}
                          y={rectY + 25}
                          fontSize="12"
                          fontWeight="bold"
                          textAnchor="middle"
                          style={{ fill: 'var(--text-primary)' }}
                        >
                          {key}
                        </text>
                      </g>
                    )
                  })}
                </g>
              )
            })}
          </svg>
        </div>
      </div>
      <p className="scroll-hint-caption">Scroll to see the full tree →</p>

      {/* State Inspector Grid */}
      <div className="field-block">
        <StateInspector
          title="B+ Tree Runtime Metrics"
          data={{
            order: `M = ${order}`,
            maxKeysPerNode: order - 1,
            totalNodes: layout.nodes.length,
            leafNodes: layout.nodes.filter(n => n.isLeaf).length,
            activeStep: `${currentStepIdx + 1} / ${Math.max(1, steps.length)}`,
            lastAction: currentStep ? currentStep.type : 'IDLE'
          }}
        />
      </div>
    </div>
  )

  const conceptData = dbmsData.bplusTree

  return (
    <ConceptModuleShell
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      simulationComponent={simulationView}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    />
  )
}
