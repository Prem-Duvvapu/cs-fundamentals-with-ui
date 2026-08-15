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
      <div className="space-y-6">
        {/* Protocol Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Protocol:</span>
          {Object.keys(CONCURRENCY_PROTOCOLS).map(key => (
            <button
              key={key}
              onClick={() => handleProtocolChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                protocol === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              {CONCURRENCY_PROTOCOLS[key].name}
            </button>
          ))}
        </div>

        {/* Live Active Locks / Timestamp Header */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className={`text-xs font-mono px-2.5 py-1 rounded border ${
              stepData.hasCycle
                ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
            }`}>
              {stepData.hasCycle ? '🚨 DEADLOCK DETECTED' : `Step ${engineState.stepIndex + 1} of ${engineState.totalSteps}`}
            </span>
          </div>

          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {/* Active Locks Table in Strict 2PL */}
          {stepData.activeLocks && (
            <div className="grid grid-cols-2 gap-4 mt-4">
              {Object.keys(stepData.activeLocks).map(item => (
                <div key={item} className="p-3 bg-slate-950/80 rounded-lg border border-slate-800">
                  <div className="text-xs text-slate-400 font-semibold mb-1">Item {item} Lock Holders:</div>
                  <div className="flex items-center gap-2">
                    {stepData.activeLocks[item].length === 0 ? (
                      <span className="text-xs font-mono text-slate-500 italic">No Active Locks</span>
                    ) : (
                      stepData.activeLocks[item].map((holder, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-mono font-bold">
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
            <div className="p-4 bg-slate-950/70 rounded-xl border border-slate-800 mt-4">
              <div className="text-xs text-slate-400 font-semibold mb-2">Wait-For Dependency Graph:</div>
              <div className="flex items-center justify-center gap-6 py-3">
                <div className="px-4 py-2 rounded-lg bg-blue-600/30 border border-blue-400 text-blue-300 font-mono font-bold text-sm">
                  Transaction T1
                </div>
                {stepData.edges.length > 0 && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono text-amber-400 mb-1">{stepData.edges[0]?.item}</span>
                    <span className="text-xl text-amber-400">➔</span>
                  </div>
                )}
                <div className="px-4 py-2 rounded-lg bg-emerald-600/30 border border-emerald-400 text-emerald-300 font-mono font-bold text-sm">
                  Transaction T2
                </div>
                {stepData.edges.length > 1 && (
                  <div className="flex flex-col items-center">
                    <span className="text-xs font-mono text-rose-400 mb-1">{stepData.edges[1]?.item}</span>
                    <span className="text-xl text-rose-400">⬅</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
