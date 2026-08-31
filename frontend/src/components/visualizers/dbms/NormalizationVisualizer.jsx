import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { NormalizationEngine, NORMALIZATION_SCENARIOS } from '../../../utils/simulationEngines/normalizationEngine'
import conceptData from '../../../data/dbms-concepts-normalization.json'

export default function NormalizationVisualizer() {
  const engine = useMemo(() => new NormalizationEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleScenarioChange = (key) => {
    engine.setScenario(key)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, scenario, scenarioKey } = engineState

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
        {/* Scenario Switcher */}
        <div className="filter-bar">
          <span className="filter-bar-label">Anomaly Scenario:</span>
          {Object.keys(NORMALIZATION_SCENARIOS).map(key => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key)}
              className={`filter-chip ${scenarioKey === key ? 'is-active' : ''}`}
            >
              {NORMALIZATION_SCENARIOS[key].name}
            </button>
          ))}
        </div>

        {/* Normal Form Evaluation Badge & Schema */}
        <div className="metrics-3col">
          <div className="sub-panel">
            <div className="sub-panel-label">Target Relation</div>
            <div className="sub-panel-value-sm">{scenario.relation}</div>
          </div>
          <div className="sub-panel">
            <div className="sub-panel-label">Current Normal Form</div>
            <div className="u-row">
              <span className={`u-pill is-mono ${stepData.stage === 'DECOMPOSED' ? 'u-pill-success' : 'u-pill-warning'}`}>
                {stepData.currentNormalForm}
              </span>
            </div>
          </div>
          <div className="sub-panel">
            <div className="sub-panel-label">Decomposition Status</div>
            <div className="sub-panel-value-sm is-muted">
              {stepData.stage === 'DECOMPOSED' ? '✅ Lossless & Preserved' : '⚠️ Pending Decomposition'}
            </div>
          </div>
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

          {scenario.fds && (
            <div className="sub-panel mb">
              <div className="sub-panel-label">Functional Dependencies In Scope:</div>
              <div className="fd-list">
                {scenario.fds.map((f, idx) => (
                  <div key={idx} className="fd-list-item">
                    <span className="dot"></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stepData.stage === 'DECOMPOSED' && (
            <div className="decomposed-banner">
              <div className="label">Decomposed Normalized Schema</div>
              <div className="value">{scenario.fixDescription}</div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
          <StateInspector
            title="Normalization Engine State"
            state={{
              scenario: scenario.name,
              evaluatedNormalForm: stepData.currentNormalForm,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              stage: stepData.stage
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
