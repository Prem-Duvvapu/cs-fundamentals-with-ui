import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { FunctionalDependencyEngine } from '../../../utils/simulationEngines/functionalDependencyEngine'
import conceptData from '../../../data/dbms-concepts-fd.json'

export default function FunctionalDependencyVisualizer() {
  const engine = useMemo(() => new FunctionalDependencyEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [inputAttr, setInputAttr] = useState('A')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleModeChange = (mode) => {
    engine.setMode(mode)
    setEngineState(engine.getCurrentState())
    setIsPlaying(false)
  }

  const handleTargetChange = (val) => {
    setInputAttr(val)
    engine.setTargetAttribute(val)
    setEngineState(engine.getCurrentState())
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, mode, attributes, fds, targetAttribute } = engineState

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
        <div className="filter-bar is-split">
          <div className="u-row">
            <span className="filter-bar-label">Analysis Tool:</span>
            {[
              { id: 'closure', label: 'Attribute Closure (X)⁺' },
              { id: 'candidate-keys', label: 'Candidate Key Detection' },
              { id: 'canonical-cover', label: 'Canonical Cover (Fc)' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`filter-chip ${mode === m.id ? 'is-active' : ''}`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'closure' && (
            <div className="u-row">
              <span className="mono-label">Calculate Closure For:</span>
              <input
                type="text"
                value={inputAttr}
                onChange={(e) => handleTargetChange(e.target.value)}
                maxLength={4}
                className="closure-input"
              />
            </div>
          )}
        </div>

        {/* Relation Schema & FD Set Dashboard */}
        <div className="metrics-2col">
          <div className="sub-panel">
            <div className="sub-panel-label">Relation Schema Attributes</div>
            <div className="attr-chip-row">
              {attributes.map(attr => (
                <span
                  key={attr}
                  className={`attr-chip ${stepData.closure && stepData.closure.includes(attr) ? 'is-active' : ''}`}
                >
                  {attr}
                </span>
              ))}
            </div>
          </div>

          <div className="sub-panel">
            <div className="sub-panel-label">Functional Dependencies (F)</div>
            <div className="fd-pill-row">
              {fds.map((fd, idx) => (
                <span
                  key={idx}
                  className={`fd-pill ${stepData.activeFd === idx ? 'is-active' : ''}`}
                >
                  {fd.lhs.join('')} → {fd.rhs.join('')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step Progress & Closure Visual Card */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="detail-card-desc">{stepData.description}</p>

          {mode === 'closure' && (
            <div className="closure-display">
              <span className="mono-label">Current Attribute Set in Closure:</span>
              <div className="closure-value">
                ({targetAttribute})⁺ = &#123; {stepData.closure ? stepData.closure.join(', ') : ''} &#125;
              </div>
            </div>
          )}

          {mode === 'candidate-keys' && stepData.candidateKeys && (
            <div className="key-grid">
              {stepData.candidateKeys.map(k => (
                <div key={k} className="key-card">
                  <div className="sub-panel-label">Candidate Key</div>
                  <div className="value">{k}</div>
                </div>
              ))}
            </div>
          )}

          {mode === 'canonical-cover' && stepData.rawFds && (
            <div className="canonical-pill-row">
              {stepData.rawFds.map((fdStr, idx) => (
                <span key={idx} className="canonical-pill">
                  {fdStr}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
          <StateInspector
            title="FD Engine Analysis Metrics"
            state={{
              analysisMode: mode,
              activeTarget: targetAttribute,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              totalDependencies: fds.length
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
