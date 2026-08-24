import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { TransactionAcidEngine, TRANSACTION_SCENARIOS } from '../../../utils/simulationEngines/transactionAcidEngine'
import conceptData from '../../../data/dbms-concepts-transactions-acid.json'

const STATE_COLORS = {
  ACTIVE: '#0ea5e9',
  PARTIALLY_COMMITTED: '#f59e0b',
  COMMITTED: '#10b981',
  FAILED: '#f43f5e',
  ABORTED: '#a78bfa'
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="viz-card" style={{ padding: '1rem' }}>
          <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-secondary)', marginRight: '0.75rem' }}>Scenario:</span>
          {Object.keys(TRANSACTION_SCENARIOS).map(key => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key)}
              className={`main-tab-btn ${scenario === key ? 'active-tab' : ''}`}
              style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', margin: '0.2rem' }}
              title={TRANSACTION_SCENARIOS[key].description}
            >
              {TRANSACTION_SCENARIOS[key].name}
            </button>
          ))}
        </div>

        <div className="viz-card">
          <h3>
            {stepData.title}
            <span className="header-pill" style={{ marginLeft: 'auto', background: STATE_COLORS[stepData.currentState] || '#475569' }}>
              Step {engineState.stepIndex + 1} / {engineState.totalSteps}
            </span>
          </h3>

          {stepData.statePath && (
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', margin: '1rem 0' }}>
              {['ACTIVE', 'PARTIALLY_COMMITTED', 'COMMITTED', 'FAILED', 'ABORTED']
                .filter(s => stepData.statePath.includes(s) || s === stepData.currentState)
                .map(stateName => (
                  <span
                    key={stateName}
                    className="header-pill"
                    style={{
                      background: stateName === stepData.currentState ? STATE_COLORS[stateName] : '#334155',
                      opacity: stateName === stepData.currentState ? 1 : 0.55,
                      fontSize: '0.8rem',
                      fontWeight: stateName === stepData.currentState ? 'bold' : 'normal'
                    }}
                  >
                    {stateName === stepData.currentState ? `▶ ${stateName.replace('_', ' ')}` : stateName.replace('_', ' ')}
                  </span>
                ))}
            </div>
          )}

          <p className="event-log-text" style={{ margin: '0.75rem 0' }}>{stepData.description}</p>

          {stepData.sql && (
            <pre className="code-block" style={{ background: '#0f172a', borderRadius: '0.5rem', padding: '0.85rem', overflowX: 'auto', whiteSpace: 'pre-wrap' }}>
              <code>{stepData.sql}</code>
            </pre>
          )}

          {(stepData.accountA !== undefined && stepData.accountA !== null) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
              <div className="encap-layer-row layer-active" style={{ borderColor: '#0ea5e9' }}>
                <span className="layer-title">Account 101 (Debit)</span>
                <span className="header-pill" style={{ background: '#0369a1' }}>${stepData.accountA}</span>
              </div>
              <div className="encap-layer-row layer-active" style={{ borderColor: '#10b981' }}>
                <span className="layer-title">Account 202 (Credit)</span>
                <span className="header-pill" style={{ background: '#047857' }}>${stepData.accountB}</span>
              </div>
            </div>
          )}

          {stepData.logRecords && (
            <div className="event-log-container" style={{ maxHeight: '260px', marginTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--accent-amber)', fontSize: '0.75rem', marginBottom: '0.25rem' }}>
                <span>{`Log Buffer / Stable Storage (dirty page on disk: ${stepData.dirtyPageOnDisk ? 'YES ⚠️' : 'no'})`}</span>
              </div>
              {stepData.logRecords.map(lr => (
                <div key={lr.lsn} className="log-entry">
                  <span className="log-text">
                    <span style={{ color: '#38bdf8', marginRight: '0.6rem' }}>{`LSN ${lr.lsn}`}</span>
                    {lr.record}
                  </span>
                  <span className="header-pill" style={{ background: lr.flushed ? '#065f46' : '#7c2d12', fontSize: '0.65rem' }}>
                    {lr.flushed ? '✓ ON DISK' : 'in memory'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {stepData.phase && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                {['ANALYSIS', 'REDO', 'UNDO'].map(phaseName => (
                  <span
                    key={phaseName}
                    className="header-pill"
                    style={{
                      background: stepData.phase === phaseName ? '#1d4ed8' : '#334155',
                      opacity: stepData.phase === phaseName ? 1 : 0.5,
                      fontSize: '0.8rem'
                    }}
                  >
                    {stepData.phase === phaseName ? `▶ ${phaseName}` : phaseName}
                  </span>
                ))}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {[stepData.t1Status && ['T1 (Winner)', stepData.t1Status], stepData.t2Status && ['T2 (Loser)', stepData.t2Status]]
                  .filter(Boolean)
                  .map(([label, val]) => (
                    <div key={label} className="encap-layer-row layer-active" style={{ borderColor: label.startsWith('T1') ? '#10b981' : '#f43f5e' }}>
                      <span className="layer-title">{label}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-primary)' }}>{val}</span>
                    </div>
                  ))}
              </div>
              {[['Redo Queue', stepData.redoQueue], ['Undo Queue', stepData.undoQueue]].map(([label, list]) => list && list.length > 0 && (
                <div key={label} className="event-log-container" style={{ maxHeight: '140px' }}>
                  {list.map((entry, idx) => (
                    <div key={idx} className="log-entry"><span className="log-text">{entry}</span></div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
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
