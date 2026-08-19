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
      <div className="space-y-6">
        {/* Module Sub-tabs */}
        <div className="flex gap-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setActiveTab('inode')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'inode' ? 'bg-blue-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🗂️ Inode Block Allocation Explorer
          </button>
          <button
            onClick={() => setActiveTab('vfs')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'vfs' ? 'bg-purple-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            🏗️ Virtual File System (VFS) Layer Stack
          </button>
        </div>

        {activeTab === 'inode' ? (
          <>
            {/* File Size Presets */}
            <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 shadow-xl">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                Select File Size Preset:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                {FILE_SIZE_PRESETS.map((preset, idx) => (
                  <button
                    key={idx}
                    onClick={() => handlePresetChange(preset.bytes)}
                    className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition-all ${
                      engineState.targetSizeBytes === preset.bytes
                        ? 'bg-blue-600 text-white shadow border border-blue-400'
                        : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 border border-slate-700/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inode Pointer Visualization Canvas */}
            <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-base font-semibold text-white">{stepData.title}</h4>
                <span className="text-xs font-mono text-blue-400 px-2.5 py-1 bg-blue-500/10 rounded border border-blue-500/20">
                  Step {engineState.stepIndex + 1} of {engineState.totalSteps}
                </span>
              </div>
              <p className="text-sm text-slate-300 mb-4">{stepData.description}</p>
              <p className="text-xs font-medium text-emerald-300 p-3 bg-emerald-950/40 rounded-lg border border-emerald-500/30 mb-6">
                💡 {stepData.explanation}
              </p>

              {/* Inode Structure Visual Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Direct Pointers */}
                <div className={`p-4 rounded-xl border ${
                  stepData.activeTier === 'direct' ? 'bg-blue-950/40 border-blue-500 ring-2 ring-blue-500/40' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-blue-400">Direct Pointers [0..11]</span>
                    <span className="text-[10px] font-mono text-slate-400">Max 48 KB</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">{stepData.directUsed} / 12</div>
                  <div className="text-[11px] text-slate-400 mt-1">Direct data block pointers</div>
                </div>

                {/* Single Indirect */}
                <div className={`p-4 rounded-xl border ${
                  stepData.activeTier === 'single' ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-amber-400">Single Indirect Pointer</span>
                    <span className="text-[10px] font-mono text-slate-400">Max ~4 MB</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">{stepData.singleDataUsed} Data Blocks</div>
                  <div className="text-[11px] text-amber-300/80 mt-1">
                    Index Blocks: {stepData.singleIndexUsed} (1024 ptrs/block)
                  </div>
                </div>

                {/* Double Indirect */}
                <div className={`p-4 rounded-xl border ${
                  stepData.activeTier === 'double' ? 'bg-purple-950/40 border-purple-500 ring-2 ring-purple-500/40' : 'bg-slate-950/80 border-slate-800'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-purple-400">Double Indirect Pointer</span>
                    <span className="text-[10px] font-mono text-slate-400">Max ~4 GB</span>
                  </div>
                  <div className="text-lg font-bold text-white font-mono">{stepData.doubleDataUsed} Data Blocks</div>
                  <div className="text-[11px] text-purple-300/80 mt-1">
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
          <div className="p-6 rounded-xl bg-slate-900/90 border border-slate-700 shadow-2xl space-y-4">
            <h4 className="text-base font-semibold text-white mb-2">Linux Virtual File System (VFS) Abstraction Layers</h4>
            <p className="text-sm text-slate-300 mb-4">
              VFS decoupling allows standard POSIX calls (`open`, `read`, `write`) to operate transparently across local disk file systems, network drives, and kernel pseudo-filesystems.
            </p>

            <div className="space-y-3 font-mono">
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-blue-300">1. User Application Space</span>
                  <p className="text-[11px] text-slate-300 font-sans mt-0.5">Calls standard C library `read(fd, buf, count)` or Java `FileInputStream`</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">User Mode</span>
              </div>

              <div className="text-center text-amber-400 font-bold text-xs">↓ System Call Interface (`sys_read`) ↓</div>

              <div className="p-4 rounded-xl bg-purple-950/40 border border-purple-500/40 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-purple-300">2. Virtual File System (VFS) Layer</span>
                  <p className="text-[11px] text-slate-300 font-sans mt-0.5">Dispatches calls via `struct file_operations` and `struct inode_operations` vnode pointers</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">Kernel Abstraction</span>
              </div>

              <div className="text-center text-amber-400 font-bold text-xs">↓ File System Specific Drivers ↓</div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                  <div className="text-xs font-bold text-emerald-400">ext4 / xfs Driver</div>
                  <div className="text-[10px] text-slate-400 mt-1">Local Disk Inode Mapping</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                  <div className="text-xs font-bold text-cyan-400">NFS Driver</div>
                  <div className="text-[10px] text-slate-400 mt-1">Network RPC Packet Calls</div>
                </div>
                <div className="p-3 rounded-lg bg-slate-950/90 border border-slate-800 text-center">
                  <div className="text-xs font-bold text-amber-400">procfs / sysfs</div>
                  <div className="text-[10px] text-slate-400 mt-1">Kernel Memory Data</div>
                </div>
              </div>

              <div className="text-center text-amber-400 font-bold text-xs">↓ Block Device Driver & I/O Scheduler ↓</div>

              <div className="p-4 rounded-xl bg-slate-950/90 border border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-300">3. Physical Storage Controller</span>
                  <p className="text-[11px] text-slate-400 font-sans mt-0.5">NVMe SSD Controller, SATA HDD, or RAID Storage Array</p>
                </div>
                <span className="text-[10px] px-2 py-1 rounded bg-slate-800 text-slate-400 border border-slate-700">Hardware Layer</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </ConceptModuleShell>
  )
}
