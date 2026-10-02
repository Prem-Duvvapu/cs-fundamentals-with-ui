import useSimulationVisibility from '../../../hooks/useSimulationVisibility'
import React, { useState, useEffect } from 'react'
import { HashMapEngine } from '../../../utils/simulationEngines/hashMapEngine'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import javaData from '../../../data/java-concepts.json'
import { prefersReducedMotion } from '../../../utils/motionPreference'

// Legacy JSON is an immutable migration snapshot. Correct its display copy here.
const conceptData = {
  ...javaData.hashMap,
  subtitle: 'Trace string-key hash spreading, collision chains and resize. Tree-bin flags model OpenJDK 17 ordinary put; tree search and ConcurrentHashMap execution are not simulated.',
  mentalModel: 'Hashing selects a bucket; equality identifies a key. On ordinary put, a ninth list entry requests treeification, but capacity below 64 grows first. Tree-bin search depends on usable hash or key ordering.',
  theoryData: {
    ...javaData.hashMap.theoryData,
    failureModes: [
      'Identical hashes can still cause linear equality search in a tree bin when keys have no useful comparable ordering. Limit untrusted input and expensive key methods.',
      'Unsynchronized concurrent mutation is unsupported in every HashMap version. Historical resize bugs are not a reason to treat modern HashMap as thread-safe.'
    ],
    tradeOffs: [
      'External locking can protect a small shared map when every related operation follows the same lock discipline.',
      'ConcurrentHashMap coordinates updates with CAS and bin-level mechanisms; many reads proceed without that update lock. A stored mutable value still needs its own concurrency policy.',
      'Compute callbacks must not modify the same map. Per-key updates do not make a multi-key business invariant atomic.'
    ],
    interviewQA: javaData.hashMap.theoryData.interviewQA.map(item => ({
      ...item,
      a: 'A positive power-of-two capacity permits (n - 1) & spreadHash, equivalent to Math.floorMod(spreadHash, n), including negative hashes. It also enables resize splitting by one bit. Uniform bucket use still depends on hash distribution; the mask cannot manufacture it.'
    }))
  },
  quizData: javaData.hashMap.quizData.map(item => ({
    ...item,
    answer: 'For OpenJDK 17 ordinary put, eight entries can remain a list at capacity 32. Appending the ninth requests treeification; below capacity 64 the request doubles capacity instead. A later insertion can treeify if the bin still collides. Other insertion paths can differ.'
  }))
}

export default function HashMapVisualizer() {
  const [engine] = useState(() => new HashMapEngine(8, 0.75))
  const [steps, setSteps] = useState([])
  const [currentStepIdx, setCurrentStepIdx] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const simulationVisible = useSimulationVisibility(setIsPlaying)
  const [speed, setSpeed] = useState(1000)

  const [inputKey, setInputKey] = useState('')
  const [inputValue, setInputValue] = useState('')

  useEffect(() => {
    // Initial seeds
    const s1 = engine.put('user101', 'Alice')
    const s2 = engine.put('user102', 'Bob')
    setSteps([...s1, ...s2])
  }, [])

  useEffect(() => {
    let timer = null
    if (simulationVisible && isPlaying && steps.length > 0 && !prefersReducedMotion()) {
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
  }, [simulationVisible, isPlaying, steps.length, speed])

  const handlePut = (e) => {
    if (e) e.preventDefault()
    const k = inputKey.trim() || `Key_${Math.floor(Math.random() * 900 + 100)}`
    const v = inputValue.trim() || `Val_${Math.floor(Math.random() * 90 + 10)}`

    const putSteps = engine.put(k, v)
    setSteps(putSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
    setInputKey('')
    setInputValue('')
  }

  const handleCollisionDemo = () => {
    // Insert 4 keys targeting similar hash collisions
    let allSteps = []
    ;['Alpha', 'Beta', 'Gamma', 'Delta', 'Epsilon', 'Zeta', 'Eta', 'Theta'].forEach(k => {
      const s = engine.put(k, `Val_${k}`)
      allSteps = [...allSteps, ...s]
    })
    setSteps(allSteps)
    setCurrentStepIdx(0)
    setIsPlaying(true)
  }

  const currentStep = steps[currentStepIdx] || null
  const state = currentStep?.state || engine.cloneState()
  const highlightBucket = currentStep?.highlightBucket ?? null

  const simulationView = (
    <div className="visualizer-container">
      {/* Controls Card */}
      <div className="viz-controls-card" style={{ marginBottom: '1rem' }}>
        <form onSubmit={handlePut} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '0.75rem' }}>
          <input
            aria-label="Map key"
            type="text"
            placeholder="Key (e.g. userId)"
            value={inputKey}
            onChange={e => setInputKey(e.target.value)}
            className="text-input"
            style={{ flex: 1, minWidth: '130px' }}
          />
          <input
            aria-label="Map value"
            type="text"
            placeholder="Value (e.g. Alice)"
            value={inputValue}
            onChange={e => setInputValue(e.target.value)}
            className="text-input"
            style={{ flex: 1, minWidth: '130px' }}
          />
          <button type="submit" className="btn btn-primary">
            + put(key, value)
          </button>
          <button type="button" onClick={handleCollisionDemo} className="btn btn-secondary">
            ⚡ Insert 8 Keys (Trigger Resize/Collision)
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

      {/* Action Banner */}
      <div
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--state-info)',
          borderRadius: '8px',
          padding: '0.85rem 1.1rem',
          marginBottom: '1rem',
          color: 'var(--state-info)',
          fontSize: '0.92rem'
        }}
      >
        💡 <strong>HashMap Operation:</strong> {currentStep?.description || 'Ready for map operations.'}
      </div>

      {/* Bucket Array Grid */}
      <div className="viz-card" style={{ background: 'var(--bg-inset)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
        <h3 style={{ margin: '0 0 1rem 0', fontSize: '1rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
          <span>📊 Bucket Array Table (`Entry&lt;K,V&gt;[] table`)</span>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Capacity: {state.capacity} | Load Factor: {state.loadFactor}</span>
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '0.75rem' }}>
          {state.buckets.map((bucket, idx) => {
            const isHighlighted = idx === highlightBucket
            const isTreeified = state.treeBins.includes(idx)

            return (
              <div
                key={idx}
                style={{
                  background: isHighlighted ? 'var(--state-info-tint)' : 'var(--bg-surface)',
                  border: '1px solid',
                  borderColor: isHighlighted ? 'var(--state-info)' : 'var(--border-subtle)',
                  borderRadius: '8px',
                  padding: '0.75rem'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.4rem', fontSize: '0.8rem' }}>
                  <strong style={{ color: isHighlighted ? 'var(--state-info)' : 'var(--text-secondary)' }}>
                    Bucket [{idx}]
                  </strong>
                  {isTreeified && (
                    <span style={{ background: 'var(--state-success-tint)', color: 'var(--state-success)', padding: '0.1rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem' }}>
                      🌳 Tree bin (modeled)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                  {bucket.map((node, nIdx) => (
                    <div
                      key={nIdx}
                      style={{
                        background: 'var(--bg-raised)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: '4px',
                        padding: '0.3rem 0.5rem',
                        fontSize: '0.78rem',
                        display: 'flex',
                        justify: 'space-between',
                        alignItems: 'center'
                      }}
                    >
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{node.key} ➔ {node.value}</span>
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>hash: {node.hash % 1000}</span>
                    </div>
                  ))}
                  {bucket.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>[ empty ]</span>}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Metrics */}
      <StateInspector
        title="HashMap Runtime State"
        data={{
          size: state.size,
          capacity: state.capacity,
          threshold: `${state.threshold} (0.75 * ${state.capacity})`,
          highlightedBucket: highlightBucket !== null ? `Bucket #${highlightBucket}` : 'None',
          lastAction: currentStep ? currentStep.action : 'IDLE'
        }}
      />
    </div>
  )

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
