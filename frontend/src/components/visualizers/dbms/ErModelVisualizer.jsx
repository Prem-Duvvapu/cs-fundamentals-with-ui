import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { ErModelEngine, ER_MODEL_SCENARIOS } from '../../../utils/simulationEngines/erModelEngine'
import conceptData from '../../../data/dbms-concepts-er-model.json'

export default function ErModelVisualizer() {
  const engine = useMemo(() => new ErModelEngine(), [])
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
            Select ER Diagram & Mapping Scenario:
          </label>
          <div className="scenario-picker-grid">
            {Object.values(ER_MODEL_SCENARIOS).map((scenario) => (
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

          {/* Key Rule Callout */}
          {stepData.keyRule && (
            <div className="er-key-rule">
              💡 {stepData.keyRule}
            </div>
          )}

          {/* Interactive Visual ER Canvas */}
          {stepData.entities && (
            <div className="er-canvas">
              <div className="er-canvas-label">
                📐 Conceptual ER Diagram Canvas
              </div>

              <div className="er-diagram">
                {/* Entity 1 */}
                <div className={`er-entity ${stepData.entities[0].type === 'Weak' ? 'is-weak' : ''}`}>
                  <div className="er-entity-name">
                    {stepData.entities[0].name}
                  </div>
                  <div className="er-entity-key">
                    PK: {stepData.entities[0].key}
                  </div>
                  <div className="er-attr-row">
                    {stepData.entities[0].attrs.map((attr, idx) => (
                      <span key={idx} className="er-attr-chip">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Relationship Diamond */}
                {stepData.relationship && (
                  <div className="er-relationship">
                    <div className="er-relationship-diamond">
                      ◆ {stepData.relationship.name} ◆
                    </div>
                    <span className="er-relationship-cardinality">
                      {stepData.relationship.cardinality}
                    </span>
                    <span className="er-relationship-participation">
                      {stepData.relationship.participation}
                    </span>
                  </div>
                )}

                {/* Entity 2 (if exists) */}
                {stepData.entities[1] && (
                  <div className={`er-entity ${stepData.entities[1].type === 'Weak' ? 'is-weak' : ''}`}>
                    <div className="er-entity-name">
                      {stepData.entities[1].name}
                    </div>
                    <div className="er-entity-key">
                      PK: {stepData.entities[1].key}
                    </div>
                    <div className="er-attr-row">
                      {stepData.entities[1].attrs.map((attr, idx) => (
                        <span key={idx} className="er-attr-chip">
                          {attr}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Relational Tables Synthesis & SQL DDL */}
          {stepData.tablesGenerated && (
            <div className="compare-grid">
              {/* Synthesized Tables */}
              <div className="compare-panel is-success">
                <div className="compare-panel-header">
                  <span className="compare-panel-title">
                    🗄️ Relational Schema ({stepData.relationalTablesCount} Tables Required)
                  </span>
                </div>
                <div className="kv-list">
                  {stepData.tablesGenerated.map((t, idx) => (
                    <div key={idx} className="er-table-row">
                      <div className="table-name">Table: {t.tableName}</div>
                      <div className="table-cols">{t.columns}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Synthesized SQL DDL */}
              <div className="compare-panel is-info">
                <div className="compare-panel-header">
                  <span className="compare-panel-title">
                    ⚡ Auto-Generated SQL DDL
                  </span>
                </div>
                <pre className="acid-sql-block is-accent">
                  {stepData.sqlDDL}
                </pre>
              </div>
            </div>
          )}
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
            tableCount: stepData.relationalTablesCount || 'N/A',
            mappingRule: stepData.keyRule || 'Standard Relational Synthesis'
          }}
          title="ER Mapping Engine Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
