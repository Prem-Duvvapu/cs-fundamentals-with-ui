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
      <div className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Analysis Tool:</span>
            {[
              { id: 'closure', label: 'Attribute Closure (X)⁺' },
              { id: 'candidate-keys', label: 'Candidate Key Detection' },
              { id: 'canonical-cover', label: 'Canonical Cover (Fc)' }
            ].map(m => (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  mode === m.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {mode === 'closure' && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 font-mono">Calculate Closure For:</span>
              <input
                type="text"
                value={inputAttr}
                onChange={(e) => handleTargetChange(e.target.value)}
                maxLength={4}
                className="w-20 px-2.5 py-1 bg-slate-950 border border-blue-500/40 rounded text-center text-xs font-mono text-blue-300 uppercase focus:outline-none focus:border-blue-400"
              />
            </div>
          )}
        </div>

        {/* Relation Schema & FD Set Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Relation Schema Attributes</div>
            <div className="flex items-center gap-2">
              {attributes.map(attr => (
                <span
                  key={attr}
                  className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                    stepData.closure && stepData.closure.includes(attr)
                      ? 'bg-blue-600/30 border-blue-400 text-blue-300 shadow-md shadow-blue-500/20'
                      : 'bg-slate-800/60 border-slate-700 text-slate-400'
                  }`}
                >
                  {attr}
                </span>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Functional Dependencies (F)</div>
            <div className="flex flex-wrap gap-2">
              {fds.map((fd, idx) => (
                <span
                  key={idx}
                  className={`px-2.5 py-1 rounded font-mono text-xs border transition-all ${
                    stepData.activeFd === idx
                      ? 'bg-emerald-500/20 border-emerald-400 text-emerald-300 font-bold animate-pulse'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {fd.lhs.join('')} → {fd.rhs.join('')}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Step Progress & Closure Visual Card */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-blue-500/30 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {mode === 'closure' && (
            <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-mono">Current Attribute Set in Closure:</span>
              <div className="font-mono text-lg font-bold text-blue-400 tracking-wider">
                ({targetAttribute})⁺ = &#123; {stepData.closure ? stepData.closure.join(', ') : ''} &#125;
              </div>
            </div>
          )}

          {mode === 'candidate-keys' && stepData.candidateKeys && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
              {stepData.candidateKeys.map(k => (
                <div key={k} className="p-3 rounded-lg bg-slate-950/80 border border-emerald-500/30 text-center">
                  <div className="text-xs text-slate-400 uppercase tracking-wider mb-1 font-semibold">Candidate Key</div>
                  <div className="font-mono text-base font-bold text-emerald-300">{k}</div>
                </div>
              ))}
            </div>
          )}

          {mode === 'canonical-cover' && stepData.rawFds && (
            <div className="flex flex-wrap gap-2 mt-4">
              {stepData.rawFds.map((fdStr, idx) => (
                <span key={idx} className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-300 font-mono text-xs font-bold">
                  {fdStr}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
