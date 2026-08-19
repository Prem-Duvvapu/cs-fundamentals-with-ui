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
      <div className="space-y-6">
        {/* Scenario Selector Tabs */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select I/O Simulation Mode:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {Object.values(IO_SCENARIOS).map((scenario) => (
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

        {/* Step Visual Canvas */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>
          <p className="text-xs font-medium text-cyan-300 p-3 bg-cyan-950/40 rounded-lg border border-cyan-500/30 mb-6">
            ⚡ {stepData.status}
          </p>

          {activeScenario === 'io-modes' ? (
            /* Timeline & CPU Metrics */
            <div className="space-y-6">
              {/* CPU Utilization Bar Comparison */}
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                  CPU Execution Allocation
                </div>
                <div className="flex gap-4 items-center">
                  <div className="w-1/2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-rose-400 font-semibold">Busy-Wait Polling Overhead</span>
                      <span className="font-mono text-rose-300">{stepData.cpuBusyWait}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: stepData.cpuBusyWait }}></div>
                    </div>
                  </div>
                  <div className="w-1/2">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-emerald-400 font-semibold">Useful User Compute</span>
                      <span className="font-mono text-emerald-300">{stepData.cpuOtherWork}</span>
                    </div>
                    <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                      <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: stepData.cpuOtherWork }}></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Execution Timeline */}
              {stepData.timeline && (
                <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                    Execution Step Timeline
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono text-xs">
                    {stepData.timeline.map((item, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-slate-900 border border-slate-800">
                        <div className="text-amber-400 font-bold text-[11px] mb-1">{item.time}</div>
                        <div className="text-blue-300 text-[11px]">CPU: {item.cpuState}</div>
                        <div className="text-slate-400 text-[10px] mt-1">Dev: {item.deviceState}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Select vs Epoll Comparison */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800">
                <span className="text-xs font-bold text-slate-400 uppercase">Sockets Monitored</span>
                <div className="text-2xl font-bold text-white font-mono mt-1">{stepData.fdsMonitored} Sockets</div>
              </div>
              <div className="p-4 rounded-xl bg-slate-950/90 border border-emerald-500/30">
                <span className="text-xs font-bold text-emerald-400 uppercase">Descriptors Scanned Per Call</span>
                <div className="text-2xl font-bold text-emerald-300 font-mono mt-1">{stepData.scansPerformed} Checks ({stepData.complexity})</div>
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
