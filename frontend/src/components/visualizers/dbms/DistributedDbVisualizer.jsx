import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { DistributedDbEngine, DISTRIBUTED_MODES } from '../../../utils/simulationEngines/distributedDbEngine'
import conceptData from '../../../data/dbms-concepts-distributed.json'

export default function DistributedDbVisualizer() {
  const engine = useMemo(() => new DistributedDbEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleModeChange = (mode) => {
    engine.setMode(mode)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, mode } = engineState

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
        {/* Mode Switcher */}
        <div className="filter-bar">
          <span className="filter-bar-label">Distributed Architecture:</span>
          {Object.keys(DISTRIBUTED_MODES).map(key => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`filter-chip ${mode === key ? 'is-active' : ''}`}
            >
              {DISTRIBUTED_MODES[key].name}
            </button>
          ))}
        </div>

        {/* Step Breakdown Card */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="detail-card-desc">{stepData.description}</p>

          {/* 2PC Interactive Node Dashboard */}
          {mode === '2pc' && (
            <div className="field-block">
              <div className="coordinator-banner">
                <div>
                  <span className="label">Coordinator Node</span>
                  <div className="value">Transaction Manager (TX-101)</div>
                </div>
                <span className="state-tag">
                  {stepData.coordinatorState}
                </span>
              </div>

              <div className="node-grid-3">
                {['node1State', 'node2State', 'node3State'].map((nKey, idx) => (
                  <div key={nKey} className="node-card">
                    <div className="sub-panel-label">Participant Node #{idx + 1}</div>
                    <div className="node-value">
                      {stepData[nKey]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CAP Theorem Partition Box */}
          {mode === 'cap-theorem' && (
            <div className="lock-grid">
              <div className="sub-panel">
                <div className="sub-panel-label">East Coast Node A</div>
                <div className="sub-panel-value is-info">{String(stepData.nodeAValue)}</div>
              </div>
              <div className="sub-panel">
                <div className="sub-panel-label">West Coast Node B</div>
                <div className="sub-panel-value is-purple">{String(stepData.nodeBValue)}</div>
              </div>
            </div>
          )}

          {/* Quorum Math Formula */}
          {mode === 'quorum' && stepData.formula && (
            <div className="anomaly-banner is-success is-formula">
              {stepData.formula}
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
          <StateInspector
            title="Distributed DB Engine Metrics"
            state={{
              protocol: DISTRIBUTED_MODES[mode].name,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              status: 'READY'
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
