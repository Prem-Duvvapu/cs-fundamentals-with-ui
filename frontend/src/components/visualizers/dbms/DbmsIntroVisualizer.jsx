import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { DbmsIntroEngine, DBMS_INTRO_SCENARIOS } from '../../../utils/simulationEngines/dbmsIntroEngine'
import conceptData from '../../../data/dbms-concepts-intro.json'

export default function DbmsIntroVisualizer() {
  const engine = useMemo(() => new DbmsIntroEngine(), [])
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
            Select Comparison Simulation Scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.values(DBMS_INTRO_SCENARIOS).map((scenario) => (
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

          {/* Anomaly / Insight Alert Banner */}
          {stepData.anomalyAlert && (
            <div className={`p-4 rounded-xl mb-4 text-xs font-medium border ${
              stepData.anomalyAlert.includes('🚨')
                ? 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                : 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
            }`}>
              {stepData.anomalyAlert}
            </div>
          )}

          {/* Side-by-Side Comparison: Traditional File System vs Relational DBMS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-4">
            {/* File System Panel */}
            <div className="p-5 rounded-xl bg-slate-950/90 border border-rose-500/30">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-rose-500/20">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                  📁 Traditional File System (Uncoordinated)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 font-mono">
                  No ACID / Raw OS Files
                </span>
              </div>

              {stepData.fileSystemState && (
                <div className="space-y-3 font-mono text-xs">
                  {Object.entries(stepData.fileSystemState).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-1 text-[11px]">{key}:</div>
                      <div className="text-rose-300 break-words whitespace-pre-wrap">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stepData.fileSystemMetrics && (
                <div className="space-y-2 font-mono text-xs">
                  {Object.entries(stepData.fileSystemMetrics).map(([key, val]) => (
                    <div key={key} className="flex justify-between p-2.5 bg-slate-900/90 rounded border border-slate-800">
                      <span className="text-slate-400 capitalize">{key}:</span>
                      <span className="text-rose-400 font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DBMS Panel */}
            <div className="p-5 rounded-xl bg-slate-950/90 border border-blue-500/30">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-blue-500/20">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                  🗄️ Relational DBMS (Centralized Engine)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 text-blue-300 border border-blue-500/20 font-mono">
                  ACID / WAL / Lock Manager
                </span>
              </div>

              {stepData.dbmsState && (
                <div className="space-y-3 font-mono text-xs">
                  {Object.entries(stepData.dbmsState).map(([key, val]) => (
                    <div key={key} className="p-3 bg-slate-900/90 rounded-lg border border-slate-800">
                      <div className="text-slate-400 font-semibold mb-1 text-[11px]">{key}:</div>
                      <div className="text-emerald-300 break-words whitespace-pre-wrap">
                        {typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {stepData.dbmsMetrics && (
                <div className="space-y-2 font-mono text-xs">
                  {Object.entries(stepData.dbmsMetrics).map(([key, val]) => (
                    <div key={key} className="flex justify-between p-2.5 bg-slate-900/90 rounded border border-slate-800">
                      <span className="text-slate-400 capitalize">{key}:</span>
                      <span className="text-emerald-400 font-bold">{val}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
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
            scenarioStatus: stepData.status,
            engineFeatures: ['Single Source of Truth', 'Row Locks / MVCC', 'Write-Ahead Logging (WAL)', 'B+ Tree Indexing']
          }}
          title="DBMS Engine State Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
