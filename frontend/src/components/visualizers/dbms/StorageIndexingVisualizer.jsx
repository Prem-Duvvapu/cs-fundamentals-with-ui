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
      <div className="u-col-lg">
        {/* Mode Switcher */}
        <div className="filter-bar">
          <span className="filter-bar-label">Storage Model:</span>
          {Object.keys(STORAGE_MODES).map(key => (
            <button
              key={key}
              onClick={() => handleModeChange(key)}
              className={`filter-chip ${mode === key ? 'is-active' : ''}`}
            >
              {STORAGE_MODES[key].name}
            </button>
          ))}
        </div>

        {/* Step Visual Details */}
        <div className="detail-card">
          <div className="detail-card-header">
            <h4>{stepData.title}</h4>
            <span className="status-chip is-normal">
              Step {engineState.stepIndex + 1} of {engineState.totalSteps}
            </span>
          </div>

          <p className="detail-card-desc">{stepData.description}</p>

          {/* RAID 5 Disk Visualizer */}
          {mode === 'raid' && (
            <div className="raid-grid">
              {['disk1', 'disk2', 'disk3'].map((dKey, idx) => {
                const disk = stepData[dKey]
                const isDead = disk.status.includes('FAILED')
                const isRecovered = disk.status.includes('RECONSTRUCTED')

                return (
                  <div
                    key={dKey}
                    className={`raid-disk ${isDead ? 'is-dead' : isRecovered ? 'is-recovered' : ''}`}
                  >
                    <div className="raid-disk-header">
                      <span className="name">Disk {idx + 1}</span>
                      <span className={`raid-disk-status ${isDead ? 'is-dead' : 'is-ok'}`}>
                        {disk.status}
                      </span>
                    </div>
                    <div className="raid-blocks">
                      {disk.data.map((block, bIdx) => (
                        <div key={bIdx} className="raid-block-row">
                          <span>{block.split(' ')[0]} {block.split(' ')[1]}</span>
                          <span className="parity">{block.split(' ')[2] || ''}</span>
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
            <div className="sub-panel bitmap-panel field-block">
              {Object.keys(stepData.bitmaps).map(key => (
                <div key={key} className="bitmap-row">
                  <span className="key">{key}:</span>
                  <span className="vector">{stepData.bitmaps[key]}</span>
                </div>
              ))}
            </div>
          )}

          {/* Inverted Index Postings */}
          {mode === 'inverted-index' && (
            <div className="sub-panel postings-panel field-block">
              <div className="sub-panel-label">Inverted Index Postings Lists:</div>
              {stepData.postings && Object.keys(stepData.postings).map(term => (
                <div key={term} className="posting-row">
                  <span className="posting-term">"{term}":</span>
                  <div className="posting-docs">
                    {stepData.postings[term].map(docId => (
                      <span key={docId} className="posting-doc">
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
        <div className="metrics-2col">
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
