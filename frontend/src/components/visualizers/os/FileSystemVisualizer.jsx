import { useState, useMemo } from 'react'
import ConceptModuleShell from '../../shared/ConceptModuleShell'
import SimulationControlBar from '../../shared/SimulationControlBar'
import StateInspector from '../../shared/StateInspector'
import { FileSystemEngine, FILE_SIZE_PRESETS } from '../../../utils/simulationEngines/fileSystemEngine'

const conceptData = {
  id: 'file-systems',
  title: 'File Systems, Inodes & VFS Architecture',
  subtitle: 'Interactive Inode Direct & Indirect Block Allocation & Virtual File System (VFS) Layer Stack',
  mentalModel: 'Think of an Inode as a library index card for a file: it stores metadata (size, permissions, timestamps) and direct pointers to small data blocks. For larger files, it delegates to single, double, and triple-indirect index books to locate multi-gigabyte files on disk.',
  theoryData: {
    keyTakeaways: [
      'An Inode (Index Node) stores all metadata about a file except its name, including file mode, owner ID, size, and block pointers.',
      'Ext4 Inodes use 12 direct pointers (48 KB max), 1 single-indirect pointer (~4 MB), 1 double-indirect pointer (~4 GB), and 1 triple-indirect pointer (~4 TB).',
      'The Virtual File System (VFS) kernel layer provides an abstract vnode interface, enabling applications to use uniform POSIX syscalls (open/read/write) across ext4, btrfs, XFS, and NFS.'
    ]
  },
  quizData: [
    {
      question: 'With 4 KB disk blocks and 4-byte block pointers, how many block pointers can a single indirect block hold?',
      "options": [
        "12 pointers",
        "256 pointers",
        "1,024 pointers",
        "4,096 pointers"
      ],
      "correctAnswer": 2,
      "explanation": "4,096 bytes per block / 4 bytes per pointer = 1,024 block pointers per single-indirect block."
    }
  ]
}

export default function FileSystemVisualizer() {
  const engine = useMemo(() => new FileSystemEngine(), [])
  const [engineState, setEngineState] = useState(() => engine.getCurrentState())
  const [activeTab, setActiveTab] = useState('inode')
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(1)

  const handlePresetChange = (bytes) => {
    setEngineState(engine.setFileSize(bytes))
    setIsPlaying(false)
  }

  const handleNext = () => setEngineState(engine.nextStep())
  const handlePrev = () => setEngineState(engine.prevStep())
  const handleReset = () => {
    setEngineState(engine.reset())
    setIsPlaying(false)
  }

  const { stepData } = engineState

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
        {/* Module Sub-tabs */}
        <div className="fs-tab-row">
          <button
            onClick={() => setActiveTab('inode')}
            className={`fs-tab-btn ${activeTab === 'inode' ? 'is-active-info' : ''}`}
          >
            🗂️ Inode Block Allocation Explorer
          </button>
          <button
            onClick={() => setActiveTab('vfs')}
            className={`fs-tab-btn ${activeTab === 'vfs' ? 'is-active-purple' : ''}`}
          >
            🏗️ Virtual File System (VFS) Layer Stack
          </button>
        </div>

        {activeTab === 'inode' ? (
          <>
            {/* File Size Presets */}
            <div className="scenario-picker-panel">
              <label className="scenario-picker-label">
                Select File Size Preset:
              </label>
              <div className="scenario-picker-grid">
                {FILE_SIZE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetChange(preset.bytes)}
                    className={`scenario-chip ${engineState.targetSizeBytes === preset.bytes ? 'is-active' : ''}`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inode Pointer Visualization Canvas */}
            <div className="detail-card">
              <div className="detail-card-header">
                <h4>{stepData.title}</h4>
                <span className="status-chip is-normal">
                  Step {engineState.stepIndex + 1} of {engineState.totalSteps}
                </span>
              </div>
              <p className="detail-card-desc">{stepData.description}</p>
              <div className="anomaly-banner is-success">
                💡 {stepData.explanation}
              </div>

              {/* Inode Structure Visual Grid */}
              <div className="tier-grid">
                {/* Direct Pointers */}
                <div className={`tier-card ${stepData.activeTier === 'direct' ? 'is-active-info' : ''}`}>
                  <div className="tier-card-header">
                    <span className="name is-info">Direct Pointers [0..11]</span>
                    <span className="cap">Max 48 KB</span>
                  </div>
                  <div className="tier-value">{stepData.directUsed} / 12</div>
                  <div className="tier-caption">Direct data block pointers</div>
                </div>

                {/* Single Indirect */}
                <div className={`tier-card ${stepData.activeTier === 'single' ? 'is-active-warning' : ''}`}>
                  <div className="tier-card-header">
                    <span className="name is-warning">Single Indirect Pointer</span>
                    <span className="cap">Max ~4 MB</span>
                  </div>
                  <div className="tier-value">{stepData.singleDataUsed} Data Blocks</div>
                  <div className="tier-caption is-warning">
                    Index Blocks: {stepData.singleIndexUsed} (1024 ptrs/block)
                  </div>
                </div>

                {/* Double Indirect */}
                <div className={`tier-card ${stepData.activeTier === 'double' ? 'is-active-purple' : ''}`}>
                  <div className="tier-card-header">
                    <span className="name is-purple">Double Indirect Pointer</span>
                    <span className="cap">Max ~4 GB</span>
                  </div>
                  <div className="tier-value">{stepData.doubleDataUsed} Data Blocks</div>
                  <div className="tier-caption is-purple">
                    Index Blocks: {stepData.doubleIndexUsed}
                  </div>
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
                fileSize: `${(engineState.targetSizeBytes / 1024).toFixed(0)} KB`,
                totalDataBlocks: stepData.totalDataBlocks,
                totalIndexBlocks: stepData.totalMetadataBlocks,
                totalDiskAccesses: stepData.totalPhysicalBlocksTouched
              }}
              title="Inode Storage Overhead Inspector"
            />
          </>
        ) : (
          /* VFS Layer Stack Diagram */
          <div className="detail-card">
            <h4>Linux Virtual File System (VFS) Abstraction Layers</h4>
            <p className="detail-card-desc">
              VFS decoupling allows standard POSIX calls (`open`, `read`, `write`) to operate transparently across local disk file systems, network drives, and kernel pseudo-filesystems.
            </p>

            <div className="vfs-stack">
              <div className="vfs-layer is-info">
                <div>
                  <span className="name">1. User Application Space</span>
                  <p className="desc">Calls standard C library `read(fd, buf, count)` or Java `FileInputStream`</p>
                </div>
                <span className="tag">User Mode</span>
              </div>

              <div className="vfs-arrow">↓ System Call Interface (`sys_read`) ↓</div>

              <div className="vfs-layer is-purple">
                <div>
                  <span className="name">2. Virtual File System (VFS) Layer</span>
                  <p className="desc">Dispatches calls via `struct file_operations` and `struct inode_operations` vnode pointers</p>
                </div>
                <span className="tag">Kernel Abstraction</span>
              </div>

              <div className="vfs-arrow">↓ File System Specific Drivers ↓</div>

              <div className="vfs-driver-grid">
                <div className="vfs-driver-card">
                  <div className="name is-success">ext4 / xfs Driver</div>
                  <div className="desc">Local Disk Inode Mapping</div>
                </div>
                <div className="vfs-driver-card">
                  <div className="name is-cyan">NFS Driver</div>
                  <div className="desc">Network RPC Packet Calls</div>
                </div>
                <div className="vfs-driver-card">
                  <div className="name is-warning">procfs / sysfs</div>
                  <div className="desc">Kernel Memory Data</div>
                </div>
              </div>

              <div className="vfs-arrow">↓ Block Device Driver & I/O Scheduler ↓</div>

              <div className="vfs-layer is-neutral">
                <div>
                  <span className="name">3. Physical Storage Controller</span>
                  <p className="desc">NVMe SSD Controller, SATA HDD, or RAID Storage Array</p>
                </div>
                <span className="tag">Hardware Layer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConceptModuleShell>
  )
}
