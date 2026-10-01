import { useState } from 'react'
import { Link } from 'react-router-dom'
import useLearningState from '../../hooks/useLearningState'
import { isImportedCopyKey } from '../../utils/learningState'

const PAGE_SIZE = 20

export default function PracticeReview({ topics }) {
  const { state } = useLearningState()
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const entries = Object.entries(state.practice)
    .filter(([key, entry]) => isImportedCopyKey(key) || entry.assessment === 'review' || entry.assessment === 'partial')
    .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  if (!entries.length) return null

  return <section className="category-overview"><h2>Review your explanations</h2>
    <p>{entries.length} saved answer{entries.length === 1 ? '' : 's'} need attention, including any different versions imported from a backup. These are your self-assessments, not automated scores.</p>
    <ul>{entries.slice(0, visibleCount).map(([key, entry]) => {
      const divider = key.indexOf(':')
      const topic = topics.find(item => item.id === key.slice(0, divider))
      const imported = isImportedCopyKey(key)
      const question = key.slice(divider + 1).replace(/ \[imported \d+\]( \d+)?$/, '')
      return <li key={key}>
        <p>{question}{imported && ' · Imported alternative'}</p>
        {topic && !imported && <Link to={`/topic/${topic.id}?view=practice&question=${encodeURIComponent(key)}`}>Practice this question in {topic.title}</Link>}
        {!topic && <p>This lesson is not in the current catalog. Your answer remains in your backup.</p>}
        <details><summary>Your saved explanation</summary><p>{entry.draft || 'No written explanation yet.'}</p></details>
      </li>
    })}</ul>
    {visibleCount < entries.length && <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>Show more saved answers</button>}
  </section>
}
