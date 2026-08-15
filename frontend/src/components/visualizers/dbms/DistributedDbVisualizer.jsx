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
      <div className="space-y-6">
        {/* Mode Switcher */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Distributed Architecture:</span>
          {Object.keys(DISTRIBUTED_MODES).map(key => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              {DISTRIBUTED_MODES[key].name}
            </button>
          ))}
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

          {/* 2PC Interactive Node Dashboard */}
          {mode === '2pc' && (
            <div className="space-y-4 mt-4">
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/50 flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold uppercase text-blue-400">Coordinator Node</span>
                  <div className="font-mono text-sm text-white font-bold">Transaction Manager (TX-101)</div>
                </div>
                <span className="px-3 py-1 bg-blue-600 text-white rounded font-mono text-xs font-bold">
                  {stepData.coordinatorState}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {['node1State', 'node2State', 'node3State'].map((nKey, idx) => (
                  <div key={nKey} className="p-3.5 bg-slate-950/80 rounded-xl border border-slate-800 text-center">
                    <div className="text-xs text-slate-400 font-semibold mb-1">Participant Node #{idx + 1}</div>
                    <div className="font-mono text-xs text-emerald-300 font-bold mt-2">
                      {stepData[nKey]}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CAP Theorem Partition Box */}
          {mode === 'cap-theorem' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold mb-1">East Coast Node A</div>
                <div className="font-mono text-base font-bold text-blue-300">{String(stepData.nodeAValue)}</div>
              </div>
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold mb-1">West Coast Node B</div>
                <div className="font-mono text-base font-bold text-purple-300">{String(stepData.nodeBValue)}</div>
              </div>
            </div>
          )}

          {/* Quorum Math Formula */}
          {mode === 'quorum' && stepData.formula && (
            <div className="p-4 bg-emerald-950/30 rounded-xl border border-emerald-500/40 text-center font-mono text-sm text-emerald-300 font-bold mt-4">
              {stepData.formula}
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
