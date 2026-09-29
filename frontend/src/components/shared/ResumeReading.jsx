import { Link } from 'react-router-dom'
import useLearningState from '../../hooks/useLearningState'
import { latestReading, readingUrl } from '../../utils/learningState'
export default function ResumeReading({ topics }) {
  const { state } = useLearningState()
  const topic = latestReading(topics, state)
  if (!topic) return null
  return <aside className="resume-card"><div><p className="eyebrow">Pick up where you left off</p><p>{topic.title}</p></div><Link className="roadmap-cta roadmap-cta-primary" to={readingUrl(topic, state)}>Resume reading →</Link></aside>
}
