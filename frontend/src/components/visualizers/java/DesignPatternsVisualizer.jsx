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
      <div className="u-col-lg">
        {/* Scenario Tabs */}
        <div className="scenario-picker-panel">
          <label className="scenario-picker-label">
            Select Design Pattern Scenario:
          </label>
          <div className="scenario-picker-grid">
            {Object.values(DESIGN_PATTERN_SCENARIOS).map((scenario) => (
              <button
                key={scenario.id}
                onClick={() => handleScenarioChange(scenario.id)}
                className={`scenario-chip ${activeScenario === scenario.id ? 'is-active' : ''}`}
              >
                {scenario.name}
              </button>
            ))}
          </div>
        </div>

        {/* Step Canvas */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="detail-card-desc">{stepData.description}</p>
          <div className="anomaly-banner is-warning">
            💡 {stepData.status}
          </div>

          {activeScenario === 'singleton-race' ? (
            <div className="u-col-md">
              <div className="thread-grid">
                <div className="thread-panel is-cyan">
                  <span className="thread-label">Thread-1 Execution</span>
                  <div className="thread-state">{stepData.thread1State}</div>
                </div>
                <div className="thread-panel is-purple">
                  <span className="thread-label">Thread-2 Execution</span>
                  <div className="thread-state">{stepData.thread2State}</div>
                </div>
              </div>

              {stepData.codeSnippet && (
                <pre className="acid-sql-block is-success">
                  {stepData.codeSnippet}
                </pre>
              )}
            </div>
          ) : (
            <div className="u-col-md">
              <div className="pattern-panel">
                <span className="pattern-panel-label is-info">Registered Observers</span>
                <div className="observer-pill-row">
                  {stepData.observers.map((obs, idx) => (
                    <span key={idx} className="observer-pill">
                      {obs}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pattern-panel">
                <span className="pattern-panel-label is-purple">Event Bus Execution Logs</span>
                <div className="event-log-lines">
                  {stepData.logs.map((log, idx) => (
                    <div key={idx}>{log}</div>
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
