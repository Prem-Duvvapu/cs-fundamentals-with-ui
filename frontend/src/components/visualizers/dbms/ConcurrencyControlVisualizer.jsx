import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { ConcurrencyControlEngine, CONCURRENCY_PROTOCOLS } from '../../../utils/simulationEngines/concurrencyControlEngine'
import conceptData from '../../../data/dbms-concepts-concurrency.json'

export default function ConcurrencyControlVisualizer() {
  const engine = useMemo(() => new ConcurrencyControlEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleProtocolChange = (proto) => {
    engine.setProtocol(proto)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, protocol } = engineState

  return (
    <ConceptModuleShell
      conceptId={conceptData.id}
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    >
      <div className="u-col-lg">
        {/* Protocol Selector */}
        <div className="filter-bar">
          <span className="filter-bar-label">Protocol:</span>
          {Object.keys(CONCURRENCY_PROTOCOLS).map(key => (
            <button
              key={key}
              onClick={() => handleProtocolChange(key)}
              className={`filter-chip ${protocol === key ? 'is-active' : ''}`}
            >
              {CONCURRENCY_PROTOCOLS[key].name}
            </button>
          ))}
        </div>

        {/* Live Active Locks / Timestamp Header */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className={`status-chip ${stepData.hasCycle ? 'is-alert' : 'is-normal'}`}>
              {stepData.hasCycle ? '🚨 DEADLOCK DETECTED' : `Step ${engineState.stepIndex + 1} of ${engineState.totalSteps}`}
            </span>
          </div>

          <p className="detail-card-desc">{stepData.description}</p>

          {/* Active Locks Table in Strict 2PL */}
          {stepData.activeLocks && (
            <div className="lock-grid">
              {Object.keys(stepData.activeLocks).map(item => (
                <div key={item} className="sub-panel">
                  <div className="sub-panel-label">Item {item} Lock Holders:</div>
                  <div className="u-row">
                    {stepData.activeLocks[item].length === 0 ? (
                      <span className="no-locks-text">No Active Locks</span>
                    ) : (
                      stepData.activeLocks[item].map((holder, idx) => (
                        <span key={idx} className="lock-holder-chip">
                          {holder}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Deadlock Wait-For Graph SVG */}
          {stepData.edges && (
            <div className="sub-panel field-block">
              <div className="sub-panel-label">Wait-For Dependency Graph:</div>
              <div className="wait-for-graph">
                <div className="wait-for-node tx1">
                  Transaction T1
                </div>
                {stepData.edges.length > 0 && (
                  <div className="wait-for-edge">
                    <span className="item-label">{stepData.edges[0]?.item}</span>
                    <span className="arrow">➔</span>
                  </div>
                )}
                <div className="wait-for-node tx2">
                  Transaction T2
                </div>
                {stepData.edges.length > 1 && (
                  <div className="wait-for-edge is-danger">
                    <span className="item-label">{stepData.edges[1]?.item}</span>
                    <span className="arrow">⬅</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
          <StateInspector
            title="Concurrency Controller Metrics"
            state={{
              protocol: CONCURRENCY_PROTOCOLS[protocol].name,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              deadlockStatus: stepData.hasCycle ? 'DEADLOCK DETECTED' : 'SERIALIZABLE'
            }}
          />
          <SimulationControlBar
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying(!isPlaying)}
            onNext={handleNext}
            onPrev={handlePrev}
            onReset={handleReset}
            speed={speed}
            onSpeedChange={setSpeed}
          />
        </div>
      </div>
    </ConceptModuleShell>
  )
}
