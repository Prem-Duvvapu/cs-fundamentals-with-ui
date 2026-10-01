import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import useLearningState from '../../hooks/useLearningState'
import { adoptPracticeAlternative, basePracticeKey, deletePractice, isImportedCopyKey } from '../../utils/learningState'

const PAGE_SIZE = 20
const needsReview = ([key, entry]) => isImportedCopyKey(key) || entry.assessment === 'review' || entry.assessment === 'partial'

export default function PracticeReview({ topics }) {
  const { state, durable } = useLearningState()
  const [filter, setFilter] = useState('review')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [pending, setPending] = useState(null)
  const [message, setMessage] = useState('')
  const statusRef = useRef(null)

  const all = Object.entries(state.practice).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0))
  const review = all.filter(needsReview)
  const entries = filter === 'all' ? all : review

  const changeFilter = next => {
    setFilter(next)
    setVisibleCount(PAGE_SIZE)
    setPending(null)
  }
  const completeAction = (action, key) => {
    if (pending?.action !== action || pending.key !== key) {
      setPending({ action, key })
      return
    }
    if (action === 'adopt') {
      if (!adoptPracticeAlternative(key)) setMessage('This alternative is no longer available. Refresh the page and try again.')
      else setMessage('Alternative adopted. The previous answer is still saved as the alternative.')
    } else {
      deletePractice(key)
      setMessage('Saved answer deleted.')
    }
    setPending(null)
    requestAnimationFrame(() => statusRef.current?.focus())
  }

  return <section className="category-overview saved-answers" aria-labelledby="saved-answers-heading">
    <h2 id="saved-answers-heading">Saved interview answers</h2>
    <p>{all.length} saved answer{all.length === 1 ? '' : 's'} · {review.length} need review or have an alternative. Ratings are your self-assessments, not automated scores.</p>
    {!durable && <p role="alert">Changes are only in this tab because browser storage is unavailable. Keep an export before closing it.</p>}
    <div className="saved-answers-filters" role="group" aria-label="Saved answer filter">
      <button type="button" aria-pressed={filter === 'review'} onClick={() => changeFilter('review')}>Needs review ({review.length})</button>
      <button type="button" aria-pressed={filter === 'all'} onClick={() => changeFilter('all')}>All answers ({all.length})</button>
    </div>
    <p ref={statusRef} role="status" tabIndex={-1}>{message}</p>
    {entries.length === 0 ? <p>{all.length === 0 ? 'No saved interview answers yet. Save an answer in Interview Mode to see it here.' : filter === 'review' ? 'No answers need review. Choose All answers to see everything you saved.' : 'No saved answers to show.'}</p> : <ul className="saved-answers-list">{entries.slice(0, visibleCount).map(([key, entry]) => {
      const imported = isImportedCopyKey(key)
      const base = basePracticeKey(key)
      const divider = base.indexOf(':')
      const topic = topics.find(item => item.id === base.slice(0, divider))
      const question = divider >= 0 ? base.slice(divider + 1) : base
      const current = imported ? state.practice[base] : null
      const isPendingAdopt = pending?.action === 'adopt' && pending.key === key
      const isPendingDelete = pending?.action === 'delete' && pending.key === key
      return <li key={key} className="saved-answer-item">
        <h3>{question}</h3>
        <p>{topic?.title || 'Lesson no longer in catalog'} · {imported ? 'Alternative version' : entry.assessment === 'review' ? 'Needs review' : entry.assessment === 'partial' ? 'Partly recalled' : entry.assessment === 'confident' ? 'Recalled confidently' : 'Not rated'}</p>
        {topic && !imported && <Link to={'/topic/' + topic.id + '?view=practice&question=' + encodeURIComponent(key)}>Practice this exact question</Link>}
        <details><summary>{imported ? 'Compare this version with your current answer' : 'Read your saved answer'}</summary>
          {imported && <><h4>Current answer</h4><p>{current?.draft || 'No current written answer.'}</p><h4>Alternative answer</h4></>}
          <p className="saved-answer-draft">{entry.draft || 'No written explanation yet.'}</p>
        </details>
        <div className="saved-answer-actions">
          {imported && current && <button type="button" onClick={() => completeAction('adopt', key)}>{isPendingAdopt ? 'Confirm use of this version' : 'Use this version for practice'}</button>}
          <button type="button" onClick={() => completeAction('delete', key)}>{isPendingDelete ? 'Confirm delete this answer' : 'Delete this saved answer'}</button>
          {(isPendingAdopt || isPendingDelete) && <button type="button" onClick={() => setPending(null)}>Cancel</button>}
        </div>
        {isPendingAdopt && <p role="status">Your current answer will become the alternative, so neither draft is lost.</p>}
        {isPendingDelete && <p role="alert">Deleting this answer removes it from this browser and future exports. Export a backup first if you may need it.</p>}
      </li>
    })}</ul>}
    {visibleCount < entries.length && <button type="button" onClick={() => setVisibleCount(count => count + PAGE_SIZE)}>Show more saved answers</button>}
  </section>
}
