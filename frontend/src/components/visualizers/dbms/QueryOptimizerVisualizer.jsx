import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { QueryOptimizerEngine } from '../../../utils/simulationEngines/queryOptimizerEngine'
import conceptData from '../../../data/dbms-concepts-query-optimization.json'

export default function QueryOptimizerVisualizer() {
  const engine = useMemo(() => new QueryOptimizerEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, costs } = engineState

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
        {/* Step Header & Description */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {/* Relational Algebra Tree Visualization */}
          {stepData.treeLayout && (
            <div className="p-5 bg-slate-950/90 rounded-xl border border-blue-500/30 font-mono text-xs text-blue-300 whitespace-pre-wrap leading-relaxed">
              {stepData.treeLayout.join('\n')}
            </div>
          )}

          {/* Physical Join Cost Comparison Matrix */}
          {stepData.costs && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold mb-1">Nested Loop Join Cost</div>
                <div className="font-mono text-base font-bold text-rose-400">{costs.nestedLoop.toLocaleString()} I/Os</div>
                <div className="text-xs text-slate-500 mt-1">Br + |R| × Bs (Very Slow)</div>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-lg border border-slate-800">
                <div className="text-xs text-slate-400 font-semibold mb-1">Block Nested Loop Join Cost</div>
                <div className="font-mono text-base font-bold text-amber-400">{costs.blockNestedLoop.toLocaleString()} I/Os</div>
                <div className="text-xs text-slate-500 mt-1">Buffered (M=50 pages)</div>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-lg border border-emerald-500/40">
                <div className="text-xs text-emerald-400 font-semibold mb-1">Hash Join Cost (Recommended)</div>
                <div className="font-mono text-base font-bold text-emerald-300">{costs.hashJoin.toLocaleString()} I/Os</div>
                <div className="text-xs text-emerald-500 mt-1">3 × (Br + Bs) (Optimal)</div>
              </div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StateInspector
            title="Optimizer Transformation Stage"
            state={{
              optimizationPhase: stepData.stage,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              tableR_Tuples: engineState.tableRSize,
              tableS_Tuples: engineState.tableSSize
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
