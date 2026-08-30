import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { DbmsIntroEngine, DBMS_INTRO_SCENARIOS } from '../../../utils/simulationEngines/dbmsIntroEngine'
import conceptData from '../../../data/dbms-concepts-intro.json'

export default function DbmsIntroVisualizer() {
  const engine = useMemo(() => new DbmsIntroEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleScenarioChange = (scenarioId) => {
    setEngineState(engine.setScenario(scenarioId))
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, activeScenario } = engineState

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
        {/* Scenario Selector Tabs */}
        <div className="scenario-picker-panel">
          <label className="scenario-picker-label">
            Select Comparison Simulation Scenario:
          </label>
          <div className="scenario-picker-grid">
            {Object.values(DBMS_INTRO_SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario.id)}
                className={`scenario-chip ${activeScenario === scenario.id ? 'is-active' : ''}`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step Card & Narrative */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="detail-card-desc">{stepData.description}</p>

          {/* Anomaly / Insight Alert Banner */}
          {stepData.anomalyAlert && (
            <div className={`anomaly-banner ${stepData.anomalyAlert.includes('🚨') ? 'is-danger' : 'is-success'}`}>
              {stepData.anomalyAlert}
            </div>
          )}

          {/* Side-by-Side Comparison: Traditional File System vs Relational DBMS */}
          <div className="compare-grid">
            {/* File System Panel */}
            <div className="compare-panel is-danger">
              <div className="compare-panel-header">
                <span className="compare-panel-title">
                  📁 Traditional File System (Uncoordinated)
                </span>
                <span className="compare-panel-tag">
                  No ACID / Raw OS Files
                </span>
              </div>

              {stepData.fileSystemState && (
                <div className="kv-list">
                  {Object.entries(stepData.fileSystemState).map(([key, val]) => (
                    <div key={key} className="kv-entry is-danger">
                      <div className="kv-key">{key}:</div>
                      <div className="kv-val">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stepData.fileSystemMetrics && (
                <div className="kv-list is-compact field-block">
                  {Object.entries(stepData.fileSystemMetrics).map(([key, val]) => (
                    <div key={key} className="kv-row is-danger">
                      <span className="kv-key">{key}:</span>
                      <span className="kv-val">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DBMS Panel */}
            <div className="compare-panel is-info">
              <div className="compare-panel-header">
                <span className="compare-panel-title">
                  🗄️ Relational DBMS (Centralized Engine)
                </span>
                <span className="compare-panel-tag">
                  ACID / WAL / Lock Manager
                </span>
              </div>

              {stepData.dbmsState && (
                <div className="kv-list">
                  {Object.entries(stepData.dbmsState).map(([key, val]) => (
                    <div key={key} className="kv-entry is-success">
                      <div className="kv-key">{key}:</div>
                      <div className="kv-val">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stepData.dbmsMetrics && (
                <div className="kv-list is-compact field-block">
                  {Object.entries(stepData.dbmsMetrics).map(([key, val]) => (
                    <div key={key} className="kv-row is-success">
                      <span className="kv-key">{key}:</span>
                      <span className="kv-val">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Playback Controls */}
        <SimulationControlBar
          isPlaying={isPlaying}
          onPlayPause={() => setIsPlaying(!isPlaying)}
          onStepForward={handleNext}
          onStepBackward={handlePrev}
          onReset={handleReset}
          speed={speed}
          onSpeedChange={setSpeed}
          isFirstStep={engineState.isFirst}
          isLastStep={engineState.isLast}
        />

        {/* State Inspector */}
        <StateInspector
          state={{
            activeScenario: engineState.scenarioMeta.name,
            currentStep: `Step ${engineState.stepIndex + 1} of ${engineState.totalSteps}`,
            scenarioStatus: stepData.status,
            engineFeatures: ['Single Source of Truth', 'Row Locks / MVCC', 'Write-Ahead Logging (WAL)', 'B+ Tree Indexing']
          }}
          title="DBMS Engine State Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
