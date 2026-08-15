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
      <div className="space-y-6">
        {/* Scenario Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Anomaly Scenario:</span>
          {Object.keys(NORMALIZATION_SCENARIOS).map(key => (
            <button
              key={key}
              onClick={() => handleScenarioChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                scenarioKey === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              {NORMALIZATION_SCENARIOS[key].name}
            </button>
          ))}
        </div>

        {/* Normal Form Evaluation Badge & Schema */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Target Relation</div>
            <div className="font-mono text-xs text-blue-300">{scenario.relation}</div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Current Normal Form</div>
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold ${
                stepData.stage === 'DECOMPOSED'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}>
                {stepData.currentNormalForm}
              </span>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Decomposition Status</div>
            <div className="text-xs font-mono text-slate-300">
              {stepData.stage === 'DECOMPOSED' ? '✅ Lossless & Preserved' : '⚠️ Pending Decomposition'}
            </div>
          </div>
        </div>

        {/* Step Breakdown Card */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {scenario.fds && (
            <div className="p-3.5 bg-slate-950/70 rounded-lg border border-slate-800 mb-4">
              <div className="text-xs text-slate-400 font-semibold mb-2">Functional Dependencies In Scope:</div>
              <div className="space-y-1 font-mono text-xs text-amber-300">
                {scenario.fds.map((f, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                    {f}
                  </div>
                ))}
              </div>
            </div>
          )}

          {stepData.stage === 'DECOMPOSED' && (
            <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30">
              <div className="text-xs text-emerald-400 font-semibold uppercase tracking-wider mb-1">Decomposed Normalized Schema</div>
              <div className="font-mono text-sm text-emerald-200">{scenario.fixDescription}</div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
