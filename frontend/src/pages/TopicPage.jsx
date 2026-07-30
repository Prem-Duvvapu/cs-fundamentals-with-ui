import { useParams, Link } from 'react-router-dom'
import TopicViewer from '../components/TopicViewer'

export default function TopicPage() {
  const { topicId } = useParams()

  const titleMap = {
    'process-management': 'Process Management',
    'memory-management': 'Memory Management',
    'cpu-scheduling': 'CPU Scheduling',
    'synchronization': 'Synchronization',
    'deadlocks': 'Deadlocks',
    'file-systems': 'File Systems',
    'io-systems': 'I/O Systems',
  }

  const title = titleMap[topicId] || topicId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div>
      <Link to="/" style={{ color: '#7c3aed', textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Back to topics
      </Link>
      <TopicViewer topicId={topicId} />
    </div>
  )
}
