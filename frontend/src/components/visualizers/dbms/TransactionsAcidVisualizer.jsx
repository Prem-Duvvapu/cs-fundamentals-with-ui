import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { TransactionAcidEngine, TRANSACTION_SCENARIOS } from '../../../utils/simulationEngines/transactionAcidEngine'
import conceptData from '../../../data/dbms-concepts-transactions-acid.json'

// Solid --*-border tones (not the lighter --*-base/--state-* text tones) so a white-text
// header-pill filled with these stays readable.
const STATE_COLORS = {
  ACTIVE: 'var(--state-info-border)',
  PARTIALLY_COMMITTED: 'var(--state-warning-border)',
  COMMITTED: 'var(--state-success-border)',
  FAILED: 'var(--state-danger-border)',
  ABORTED: 'var(--cat-os-border)'
}

export default function TransactionsAcidVisualizer() {
  const engine = useMemo(() => new TransactionAcidEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleScenarioChange = (scenario) => {
    engine.setScenario(scenario)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, scenario } = engineState

  return (
    <ConceptModuleShell
      conceptId={conceptData.id}
      title={conceptData.title}
      subtitle={conceptData.subtitle}
      mentalModel={conceptData.mentalModel}
      theoryData={conceptData.theoryData}
      quizData={conceptData.quizData}
    >
      <div className="u-col">
        <div className="viz-card acid-scenario-picker">
          <span className="acid-scenario-label">Scenario:</span>
          {Object.keys(TRANSACTION_SCENARIOS).map(key => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key)}
              className={`main-tab-btn acid-scenario-btn ${scenario === key ? 'active-tab' : ''}`}
              title={TRANSACTION_SCENARIOS[key].description}
            >
              {TRANSACTION_SCENARIOS[key].name}
            </button>
          ))}
        </div>

        <div className="viz-card">
          <h3>
            {stepData.title}
            <span className={`header-pill ${STATE_COLORS[stepData.currentState] ? '' : 'is-idle-fallback'}`} style={{ marginLeft: 'auto', background: STATE_COLORS[stepData.currentState] }}>
              Step {engineState.stepIndex + 1} / {engineState.totalSteps}
            </span>
          </h3>

          {stepData.statePath && (
            <div className="state-path-row">
              {['ACTIVE', 'PARTIALLY_COMMITTED', 'COMMITTED', 'FAILED', 'ABORTED']
                .filter(s => stepData.statePath.includes(s) || s === stepData.currentState)
                .map(stateName => (
                  <span
                    key={stateName}
                    className={`header-pill state-pill ${stateName === stepData.currentState ? 'is-current' : 'is-dim'}`}
                    style={stateName === stepData.currentState ? { background: STATE_COLORS[stateName] } : undefined}
                  >
                    {stateName === stepData.currentState ? `▶ ${stateName.replace('_', ' ')}` : stateName.replace('_', ' ')}
                  </span>
                ))}
            </div>
          )}

          <p className="event-log-text acid-description">{stepData.description}</p>

          {stepData.sql && (
            <pre className="acid-sql-block">
              <code>{stepData.sql}</code>
            </pre>
          )}

          {(stepData.accountA !== undefined && stepData.accountA !== null) && (
            <div className="acid-accounts-grid">
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--state-info)' }}>
                <span className="layer-title">Account 101 (Debit)</span>
                <span className="header-pill" style={{ background: 'var(--state-info-border)' }}>${stepData.accountA}</span>
              </div>
              <div className="encap-layer-row layer-active" style={{ borderColor: 'var(--state-success)' }}>
                <span className="layer-title">Account 202 (Credit)</span>
                <span className="header-pill" style={{ background: 'var(--state-success-border)' }}>${stepData.accountB}</span>
              </div>
            </div>
          )}

          {stepData.logRecords && (
            <div className="event-log-container acid-log-panel">
              <div className="acid-log-header">
                <span>{`Log Buffer / Stable Storage (dirty page on disk: ${stepData.dirtyPageOnDisk ? 'YES ⚠️' : 'no'})`}</span>
              </div>
              {stepData.logRecords.map(lr => (
                <div key={lr.lsn} className="log-entry">
                  <span className="log-text">
                    <span className="acid-lsn">{`LSN ${lr.lsn}`}</span>
                    {lr.record}
                  </span>
                  <span className={`header-pill acid-durability-pill ${lr.flushed ? 'is-durable' : 'is-volatile'}`}>
                    {lr.flushed ? '✓ ON DISK' : 'in memory'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {stepData.phase && (
            <div className="acid-recovery-panel">
              <div className="acid-phase-row">
                {['ANALYSIS', 'REDO', 'UNDO'].map(phaseName => (
                  <span
                    key={phaseName}
                    className={`header-pill acid-phase-pill ${stepData.phase === phaseName ? 'is-active' : 'is-inactive'}`}
                  >
                    {stepData.phase === phaseName ? `▶ ${phaseName}` : phaseName}
                  </span>
                ))}
              </div>
              <div className="acid-tx-grid">
                {[stepData.t1Status && ['T1 (Winner)', stepData.t1Status], stepData.t2Status && ['T2 (Loser)', stepData.t2Status]]
                  .filter(Boolean)
                  .map(([label, val]) => (
                    <div key={label} className="encap-layer-row layer-active" style={{ borderColor: label.startsWith('T1') ? 'var(--state-success)' : 'var(--state-danger)' }}>
                      <span className="layer-title">{label}</span>
                      <span className="acid-tx-status">{val}</span>
                    </div>
                  ))}
              </div>
              {[['Redo Queue', stepData.redoQueue], ['Undo Queue', stepData.undoQueue]].map(([label, list]) => list && list.length > 0 && (
                <div key={label} className="event-log-container acid-queue-panel">
                  {list.map((entry, idx) => (
                    <div key={idx} className="log-entry"><span className="log-text">{entry}</span></div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="acid-metrics-grid">
          <StateInspector
            title="Transaction Controller Metrics"
            state={{
              scenario: TRANSACTION_SCENARIOS[scenario].name,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              txState: stepData.currentState || stepData.phase || 'ACTIVE'
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
