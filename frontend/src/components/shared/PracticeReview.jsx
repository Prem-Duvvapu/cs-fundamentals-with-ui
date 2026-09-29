import { Link } from 'react-router-dom'
import useLearningState from '../../hooks/useLearningState'
export default function PracticeReview({ topics }) {
  const { state } = useLearningState()
  const entries = Object.entries(state.practice).filter(([, entry]) => entry.assessment === 'review' || entry.assessment === 'partial')
  if (!entries.length) return null
  return <section className="category-overview"><h2>Review your explanations</h2><p>{entries.length} questions you marked for more practice. These are your self-assessments, not automated scores.</p><ul>{entries.slice(0, 20).map(([key, entry]) => {
    const divider = key.indexOf(':')
    const topic = topics.find(item => item.id === key.slice(0, divider))
    return <li key={key}><p>{key.slice(divider + 1)}</p>{topic && <Link to={`/topic/${topic.id}?view=practice`}>Practice {topic.title}</Link>}<details><summary>Your saved explanation</summary><p>{entry.draft || 'No written explanation yet.'}</p></details></li>
  })}</ul>{entries.length > 20 && <p>Showing the first 20 review items. All saved answers are included in your learning-data backup.</p>}</section>
}
