import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { DiskSchedulingEngine, DISK_ALGORITHMS } from '../../../utils/simulationEngines/diskSchedulingEngine'

const conceptData = {
  id: 'disk-scheduling',
  title: 'Disk Scheduling Algorithms & File Allocation',
  subtitle: 'Interactive Head Motion & Total Seek Distance Comparison across FCFS, SSTF, SCAN & C-SCAN',
  mentalModel: 'Think of disk scheduling like an elevator servicing floors in a skyscraper: FCFS takes passengers in request order causing wild up-and-down trips, SSTF picks the nearest floor (starving top-floor passengers), SCAN runs all the way to the top before coming down, and C-SCAN continuously loops upward.',
  theoryData: {
    keyTakeaways: [
      'Seek Time (head motion between cylinders) is the single largest component of HDD latency (3-15 ms).',
      'FCFS is simple and fair but causes high seek distance due to back-and-forth oscillations.',
      'SSTF minimizes instantaneous seek time but can starve requests at extreme cylinders.',
      'SCAN and C-SCAN elevator algorithms enforce bounded, predictable wait times across all cylinders.'
    ]
  },
  quizData: [
    {
      question: 'Which disk scheduling algorithm can cause starvation for requests at extreme cylinder locations?',
      options: [
        "FCFS",
        "SSTF (Shortest Seek Time First)",
        "SCAN",
        "C-SCAN"
      ],
      correctAnswer: 1,
      explanation: "SSTF constantly selects the request closest to the current head location, so requests far away on extreme cylinders can be starved if new closer requests keep arriving."
    }
  ]
}

export default function DiskSchedulingVisualizer() {
  const engine = useMemo(() => new DiskSchedulingEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handleAlgoChange = (algoKey) => {
    setEngineState(engine.setAlgorithm(algoKey))
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData, algorithm } = engineState

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
        {/* Algorithm Selector Tabs */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Select Disk Scheduling Algorithm:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {Object.entries(DISK_ALGORITHMS).map(([key, name]) => (
              <button
                key={key}
                onClick={() => handleAlgoChange(key)}
                className={`px-3 py-2.5 rounded-lg text-xs font-medium text-left transition-all ${
                  algorithm === key
                    ? 'bg-blue-600 text-white shadow-lg border border-blue-400'
                    : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        {/* Head Position Canvas & Step Info */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>
          <p className="text-sm text-slate-300 mb-4">{stepData.explanation}</p>

          {/* Disk Cylinder Line Graphic */}
          <div className="p-5 rounded-xl bg-slate-950/90 border border-slate-800 mb-4">
            <div className="flex justify-between text-xs text-slate-400 font-mono mb-2">
              <span>Cylinder 0</span>
              <span className="text-blue-400 font-bold">Current Head: {stepData.currentHead}</span>
              <span>Cylinder 199</span>
            </div>
            {/* Visual Track Bar */}
            <div className="relative w-full bg-slate-800 h-6 rounded-lg overflow-hidden border border-slate-700">
              {/* Head Pointer Indicator */}
              <div
                className="absolute top-0 bottom-0 w-3 bg-blue-500 rounded shadow-lg shadow-blue-500/50 transition-all duration-300 transform -translate-x-1/2"
                style={{ left: `${(stepData.currentHead / 199) * 100}%` }}
              ></div>
              {/* Target Requests Pins */}
              {engineState.requests.map((req, idx) => (
                <div
                  key={idx}
                  className={`absolute top-1 bottom-1 w-1 rounded ${
                    stepData.servicedSoFar.includes(req) ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                  style={{ left: `${(req / 199) * 100}%` }}
                  title={`Request: Cylinder ${req}`}
                ></div>
              ))}
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-2">
              <span>🟩 Serviced Requests</span>
              <span>🟥 Pending Requests</span>
            </div>
          </div>
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
            algorithm: engineState.algorithmName,
            currentHeadLocation: stepData.currentHead,
            lastSeekDistance: `${stepData.stepSeekDistance} cylinders`,
            totalAccumulatedSeekDistance: `${stepData.accumulatedSeekDistance} cylinders`
          }}
          title="Disk Head Motion Inspector"
        />
      </div>
    </ConceptModuleShell>
  )
}
