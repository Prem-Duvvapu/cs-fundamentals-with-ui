import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import TopicViewer from '../components/TopicViewer'
import SchedulingVisualizer from '../components/visualizers/SchedulingVisualizer'
import ProcessLifecycleVisualizer from '../components/visualizers/ProcessLifecycleVisualizer'
import MemoryVisualizer from '../components/visualizers/MemoryVisualizer'
import SynchronizationVisualizer from '../components/visualizers/SynchronizationVisualizer'
import DeadlockVisualizer from '../components/visualizers/DeadlockVisualizer'

export default function TopicPage() {
  const { topicId } = useParams()
  const [activeTab, setActiveTab] = useState('simulator') // 'theory', 'simulator'

  const titleMap = {
    'process-management': 'Process Management & Lifecycle',
    'memory-management': 'Memory Management & Virtual Paging',
    'cpu-scheduling': 'CPU Scheduling Algorithms',
    'synchronization': 'Process Synchronization & Locks',
    'deadlocks': 'Deadlocks & Banker\'s Algorithm',
    'file-systems': 'File Systems & Inodes',
    'io-systems': 'I/O Systems & Kernel Architecture',
  }

  const title = titleMap[topicId] || topicId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  const renderVisualizer = () => {
    switch (topicId) {
      case 'cpu-scheduling':
        return <SchedulingVisualizer />
      case 'process-management':
        return <ProcessLifecycleVisualizer />
      case 'memory-management':
        return <MemoryVisualizer />
      case 'synchronization':
        return <SynchronizationVisualizer />
      case 'deadlocks':
        return <DeadlockVisualizer />
      default:
        return <SchedulingVisualizer />
    }
  }

  return (
    <div className="topic-page-container">
      <div className="topic-page-header">
        <Link to="/" className="back-link">
          ← Back to All Topics
        </Link>
        <h1 className="topic-page-title">{title}</h1>

        <div className="main-tab-switcher">
          <button
            onClick={() => setActiveTab('simulator')}
            className={`main-tab-btn ${activeTab === 'simulator' ? 'active-tab' : ''}`}
          >
            ⚡ Interactive Visual Simulation
          </button>
          <button
            onClick={() => setActiveTab('theory')}
            className={`main-tab-btn ${activeTab === 'theory' ? 'active-tab' : ''}`}
          >
            📖 Educational Content & Deep Dive
          </button>
        </div>
      </div>

      <div className="tab-content-area">
        {activeTab === 'simulator' ? (
          renderVisualizer()
        ) : (
          <TopicViewer topicId={topicId} />
        )}
      </div>
    </div>
  )
}
