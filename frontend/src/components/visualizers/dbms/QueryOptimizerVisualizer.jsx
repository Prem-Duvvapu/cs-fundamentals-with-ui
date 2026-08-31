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
      <div className="u-col-lg">
        {/* Step Header & Description */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="detail-card-desc">{stepData.description}</p>

          {/* Relational Algebra Tree Visualization */}
          {stepData.treeLayout && (
            <pre className="acid-sql-block is-accent">
              {stepData.treeLayout.join('\n')}
            </pre>
          )}

          {/* Physical Join Cost Comparison Matrix */}
          {stepData.costs && (
            <div className="metrics-3col field-block">
              <div className="sub-panel">
                <div className="sub-panel-label">Nested Loop Join Cost</div>
                <div className="cost-value is-danger">{costs.nestedLoop.toLocaleString()} I/Os</div>
                <div className="cost-caption">Br + |R| × Bs (Very Slow)</div>
              </div>
              <div className="sub-panel">
                <div className="sub-panel-label">Block Nested Loop Join Cost</div>
                <div className="cost-value is-warning">{costs.blockNestedLoop.toLocaleString()} I/Os</div>
                <div className="cost-caption">Buffered (M=50 pages)</div>
              </div>
              <div className="sub-panel is-recommended">
                <div className="sub-panel-label is-success">Hash Join Cost (Recommended)</div>
                <div className="cost-value is-success">{costs.hashJoin.toLocaleString()} I/Os</div>
                <div className="cost-caption is-success">3 × (Br + Bs) (Optimal)</div>
              </div>
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="metrics-2col">
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
