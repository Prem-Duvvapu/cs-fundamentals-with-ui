import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { DesignPatternsEngine, DESIGN_PATTERN_SCENARIOS } from '../../../utils/simulationEngines/designPatternsEngine'

const conceptData = {
  id: 'design-patterns-solid',
  title: 'SOLID Principles & Design Patterns',
  subtitle: 'Interactive Multithreaded Singleton Race Condition & Observer Pattern Event Dispatcher',
  mentalModel: 'Think of SOLID as standard architectural building codes: SRP ensures each worker has one job, OCP allows adding extensions without tearing down walls, and DIP ensures appliances plug into standard sockets rather than being hardwired to specific power generators.',
  theoryData: {
    keyTakeaways: [
      'SOLID principles (SRP, OCP, LSP, ISP, DIP) maximize maintainability, testability, and decouple software modules.',
      'Lazy Singletons require synchronization or the Bill Pugh Holder idiom to prevent dual-instance creation under concurrent thread execution.',
      'The Observer pattern decouples Subject event publishers from subscriber listeners, enabling flexible event-driven architectures.'
    ]
  },
  quizData: [
    {
      question: 'Which SOLID principle is violated if extending a base class requires modifying existing client code handling that base class?',
      options: [
        "Single Responsibility Principle (SRP)",
        "Open/Closed Principle (OCP)",
        "Liskov Substitution Principle (LSP)",
        "Interface Segregation Principle (ISP)"
      ],
      correctAnswer: 2,
      explanation: "Liskov Substitution Principle (LSP) states that subtypes must be substitutable for their base types without altering client correctness."
    }
  ]
}

export default function DesignPatternsVisualizer() {
  const engine = useMemo(() => new DesignPatternsEngine(), [])
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
        {/* Scenario Tabs */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Design Pattern Scenario:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(DESIGN_PATTERN_SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario.id)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all ${
                  activeScenario === scenario.id
                    ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step Canvas */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>
          <p className="text-xs font-medium text-amber-300 p-3 bg-amber-950/40 rounded-lg border border-amber-500/30 mb-6">
            💡 {stepData.status}
          </p>

          {activeScenario === 'singleton-race' ? (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 font-mono text-xs">
                <div className="p-4 rounded-xl bg-slate-950/90 border border-cyan-500/30">
                  <span className="text-xs font-bold text-cyan-400">Thread-1 Execution</span>
                  <div className="text-slate-200 mt-2">{stepData.thread1State}</div>
                </div>
                <div className="p-4 rounded-xl bg-slate-950/90 border border-purple-500/30">
                  <span className="text-xs font-bold text-purple-400">Thread-2 Execution</span>
                  <div className="text-slate-200 mt-2">{stepData.thread2State}</div>
                </div>
              </div>

              {stepData.codeSnippet && (
                <pre className="p-3 bg-slate-950/90 rounded-lg border border-slate-800 text-emerald-300 font-mono text-xs overflow-x-auto">
                  {stepData.codeSnippet}
                </pre>
              )}
            </div>
          ) : (
            <div className="space-y-4 font-mono text-xs">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                <span className="text-xs font-bold text-blue-400 uppercase tracking-wider">Registered Observers</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {stepData.observers.map((obs, idx) => (
                    <span key={idx} className="px-2.5 py-1 rounded bg-slate-800 text-slate-200 border border-slate-700">
                      {obs}
                    </span>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">Event Bus Execution Logs</span>
                <div className="space-y-1 mt-2 text-slate-300">
                  {stepData.logs.map((log, idx) => (
                    <div key={idx} className="text-[11px]">{log}</div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

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

        <StateInspector
          state={{
            scenario: engineState.scenarioMeta.name,
            currentStep: `Step ${engineState.stepIndex + 1} of ${engineState.totalSteps}`
          }}
          title="Design Pattern State Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
