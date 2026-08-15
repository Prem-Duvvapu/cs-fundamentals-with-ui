import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { StorageIndexingEngine, STORAGE_MODES } from '../../../utils/simulationEngines/storageIndexingEngine'
import conceptData from '../../../data/dbms-concepts-storage.json'

export default function StorageIndexingVisualizer() {
  const engine = useMemo(() => new StorageIndexingEngine(), [])
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
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-2">Storage Model:</span>
          {Object.keys(STORAGE_MODES).map(key => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                mode === key
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
              }`}
            >
              {STORAGE_MODES[key].name}
            </button>
          ))}
        </div>

        {/* Step Visual Details */}
        <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
            <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>

          {/* RAID 5 Disk Visualizer */}
          {mode === 'raid' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {['disk1', 'disk2', 'disk3'].map((dKey, idx) => {
                const disk = stepData[dKey]
                const isDead = disk.status.includes('FAILED')
                const isRecovered = disk.status.includes('RECONSTRUCTED')

                return (
                  <div
                    key={dKey}
                    className={`p-4 rounded-xl border transition-all ${
                      isDead
                        ? 'bg-rose-950/40 border-rose-500/60 shadow-lg shadow-rose-500/20'
                        : isRecovered
                        ? 'bg-emerald-950/40 border-emerald-500/60'
                        : 'bg-slate-950/80 border-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold font-mono text-slate-300">Disk {idx + 1}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        isDead ? 'bg-rose-500/20 text-rose-300' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {disk.status}
                      </span>
                    </div>
                    <div className="space-y-1.5 font-mono text-xs text-slate-300 mt-3">
                      {disk.data.map((block, bIdx) => (
                        <div key={bIdx} className="p-2 bg-slate-900 rounded border border-slate-800 flex justify-between">
                          <span>{block.split(' ')[0]} {block.split(' ')[1]}</span>
                          <span className="text-blue-400 font-bold">{block.split(' ')[2] || ''}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Bitmap Index Vectors */}
          {mode === 'bitmap-index' && stepData.bitmaps && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 mt-4 space-y-2 font-mono text-xs">
              {Object.keys(stepData.bitmaps).map(key => (
                <div key={key} className="flex justify-between items-center py-1.5 border-b border-slate-800">
                  <span className="text-slate-400">{key}:</span>
                  <span className="text-blue-300 font-bold tracking-widest text-sm">{stepData.bitmaps[key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inverted Index Postings */}
          {mode === 'inverted-index' && (
            <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 mt-4 space-y-2 font-mono text-xs">
              <div className="text-xs text-slate-400 font-semibold mb-2">Inverted Index Postings Lists:</div>
              {stepData.postings && Object.keys(stepData.postings).map(term => (
                <div key={term} className="flex items-center gap-3">
                  <span className="w-24 text-purple-300 font-bold">"{term}":</span>
                  <div className="flex gap-1.5">
                    {stepData.postings[term].map(docId => (
                      <span key={docId} className="px-2 py-0.5 bg-purple-500/20 text-purple-200 rounded border border-purple-500/30">
                        Doc #{docId}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* State Inspector & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StateInspector
            title="Storage Engine Metrics"
            state={{
              storageModel: STORAGE_MODES[mode].name,
              step: `${engineState.stepIndex + 1} / ${engineState.totalSteps}`,
              status: 'ACTIVE'
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
