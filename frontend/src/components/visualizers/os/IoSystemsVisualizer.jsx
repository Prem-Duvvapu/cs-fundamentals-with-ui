import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { IoSystemsEngine, IO_SCENARIOS } from '../../../utils/simulationEngines/ioSystemsEngine'

const conceptData = {
  id: 'io-systems',
  title: 'I/O Systems, DMA & Epoll Architecture',
  subtitle: 'Interactive CPU Utilization Timelines across Programmed I/O, Interrupts, DMA & Polling Scalability',
  mentalModel: 'Think of Programmed I/O like waiting in line at a counter continuously asking "Is my order ready?". Interrupt-Driven I/O is getting a buzzer that rings when ready while you read a book. DMA is hiring a courier to fetch your entire 100-package shipment directly to your house while you sleep.',
  theoryData: {
    keyTakeaways: [
      'Programmed I/O wastes 100% of CPU cycles in tight polling loops checking hardware status registers.',
      'Interrupt-Driven I/O allows CPU to run other user processes, switching back only when hardware raises an IRQ interrupt.',
      'Direct Memory Access (DMA) transfers entire memory blocks directly between devices and RAM, generating only 1 single completion interrupt.',
      'epoll_wait() achieves O(1) constant-time socket readiness notification via kernel ready-lists, eliminating select() O(N) linear descriptor scanning.'
    ]
  },
  quizData: [
    {
      question: 'Why is DMA superior to interrupt-driven I/O for high-throughput disk reads?',
      options: [
        "DMA eliminates the need for RAM memory.",
        "DMA bypasses CPU execution during data transfer, firing only 1 interrupt per block instead of 1 interrupt per byte/word.",
        "DMA runs without requiring device drivers.",
        "DMA forces all processes to pause during transfers."
      ],
      correctAnswer: 1,
      explanation: "Interrupt-driven I/O forces the CPU to execute an Interrupt Service Routine (ISR) for every transferred word. DMA handles multi-megabyte transfers directly to RAM and interrupts the CPU only once at the end."
    }
  ]
}

export default function IoSystemsVisualizer() {
  const engine = useMemo(() => new IoSystemsEngine(), [])
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
        {/* Scenario Selector Tabs */}
        <div className="scenario-picker-panel">
          <label className="scenario-picker-label">
            Select I/O Simulation Mode:
          </label>
          <div className="scenario-picker-grid">
            {Object.values(IO_SCENARIOS).map((scenario) => (
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

        {/* Step Visual Canvas */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="detail-card-desc">{stepData.description}</p>
          <div className="anomaly-banner is-cyan">
            ⚡ {stepData.status}
          </div>

          {activeScenario === 'io-modes' ? (
            /* Timeline & CPU Metrics */
            <div className="u-col-lg">
              {/* CPU Utilization Bar Comparison */}
              <div className="sub-panel">
                <div className="sub-panel-label">
                  CPU Execution Allocation
                </div>
                <div className="cpu-bar-row">
                  <div className="cpu-bar-col">
                    <div className="cpu-bar-label">
                      <span className="name is-danger">Busy-Wait Polling Overhead</span>
                      <span className="value is-danger">{stepData.cpuBusyWait}</span>
                    </div>
                    <div className="cpu-bar-track">
                      <div className="cpu-bar-fill is-danger" style={{ width: stepData.cpuBusyWait }}></div>
                    </div>
                  </div>
                  <div className="cpu-bar-col">
                    <div className="cpu-bar-label">
                      <span className="name is-success">Useful User Compute</span>
                      <span className="value is-success">{stepData.cpuOtherWork}</span>
                    </div>
                    <div className="cpu-bar-track">
                      <div className="cpu-bar-fill is-success" style={{ width: stepData.cpuOtherWork }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Timeline */}
              {stepData.timeline && (
                <div className="sub-panel">
                  <div className="sub-panel-label">
                    Execution Step Timeline
                  </div>
                  <div className="timeline-grid">
                    {stepData.timeline.map((item, idx) => (
                      <div key={idx} className="timeline-item">
                        <div className="time">{item.time}</div>
                        <div className="cpu">CPU: {item.cpuState}</div>
                        <div className="dev">Dev: {item.deviceState}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Select vs Epoll Comparison */
            <div className="stat-grid">
              <div className="stat-card">
                <span className="label">Sockets Monitored</span>
                <div className="stat-value">{stepData.fdsMonitored} Sockets</div>
              </div>
              <div className="stat-card is-success">
                <span className="label">Descriptors Scanned Per Call</span>
                <div className="stat-value">{stepData.scansPerformed} Checks ({stepData.complexity})</div>
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
            activeScenario: engineState.scenarioMeta.name,
            currentStep: `Step ${engineState.stepIndex + 1} of ${engineState.totalSteps}`,
            cpuBusyWait: stepData.cpuBusyWait || 'N/A',
            scansPerformed: stepData.scansPerformed || 'N/A'
          }}
          title="I/O Execution Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
