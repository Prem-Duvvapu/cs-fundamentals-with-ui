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
      <div className="space-y-6">
        {/* Scenario Selector Tabs */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select ER Diagram & Mapping Scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {Object.values(ER_MODEL_SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario.id)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all duration-200 ${
                  activeScenario === scenario.id
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20 border border-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-700/50'
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step Card & Narrative */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {/* Key Rule Callout */}
          {stepData.keyRule && (
            <div className="p-3.5 rounded-lg bg-blue-950/40 border border-blue-500/30 text-xs text-blue-300 font-medium mb-4">
              💡 {stepData.keyRule}
            </div>
          )}

          {/* Interactive Visual ER Canvas */}
          {stepData.entities && (
            <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 mb-6">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">
                📐 Conceptual ER Diagram Canvas
              </div>

              <div className="flex flex-col lg:flex-row items-center justify-center gap-6">
                {/* Entity 1 */}
                <div className={`p-4 rounded-xl border ${
                  stepData.entities[0].type === 'Weak'
                    ? 'border-dashed border-2 border-amber-500 bg-amber-950/20'
                    : 'border-blue-500 bg-blue-950/20'
                } min-w-[200px] text-center shadow-lg`}>
                  <div className="text-xs font-bold text-blue-300 mb-1">
                    {stepData.entities[0].name}
                  </div>
                  <div className="text-[11px] font-mono text-amber-300 font-semibold underline mb-2">
                    PK: {stepData.entities[0].key}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {stepData.entities[0].attrs.map((attr, idx) => (
                      <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                        {attr}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Relationship Diamond */}
                {stepData.relationship && (
                  <div className="flex flex-col items-center">
                    <div className="px-3 py-1.5 rounded bg-purple-600/30 border border-purple-400 text-purple-200 text-xs font-bold shadow-md">
                      ◆ {stepData.relationship.name} ◆
                    </div>
                    <span className="text-[10px] font-mono text-purple-300 mt-1">
                      {stepData.relationship.cardinality}
                    </span>
                    <span className="text-[9px] text-slate-400">
                      {stepData.relationship.participation}
                    </span>
                  </div>
                )}

                {/* Entity 2 (if exists) */}
                {stepData.entities[1] && (
                  <div className={`p-4 rounded-xl border ${
                    stepData.entities[1].type === 'Weak'
                      ? 'border-dashed border-2 border-amber-500 bg-amber-950/20'
                      : 'border-blue-500 bg-blue-950/20'
                  } min-w-[200px] text-center shadow-lg`}>
                    <div className="text-xs font-bold text-blue-300 mb-1">
                      {stepData.entities[1].name}
                    </div>
                    <div className="text-[11px] font-mono text-amber-300 font-semibold underline mb-2">
                      PK: {stepData.entities[1].key}
                    </div>
                    <div className="flex flex-wrap gap-1 justify-center">
                      {stepData.entities[1].attrs.map((attr, idx) => (
                        <span key={idx} className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
              {/* Synthesized Tables */}
              <div className="p-5 rounded-xl bg-slate-950/90 border border-emerald-500/30">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-emerald-500/20">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    🗄️ Relational Schema ({stepData.relationalTablesCount} Tables Required)
                  </span>
                </div>
                <div className="space-y-3 font-mono text-xs">
                  {stepData.tablesGenerated.map((t, idx) => (
                    <div key={idx} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                      <div className="text-emerald-400 font-bold mb-1 text-[11px]">Table: {t.tableName}</div>
                      <div className="text-slate-300 text-[11px] break-words">{t.columns}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Synthesized SQL DDL */}
              <div className="p-5 rounded-xl bg-slate-950/90 border border-blue-500/30">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-500/20">
                  <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                    ⚡ Auto-Generated SQL DDL
                  </span>
                </div>
                <pre className="p-3 bg-slate-900/90 rounded-lg border border-slate-800 text-cyan-300 font-mono text-xs overflow-x-auto whitespace-pre-wrap">
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
