import { useState, lazy, Suspense, useId } from 'react'
import useLearningState from '../../hooks/useLearningState'
import { questionKey, savePractice, updateLearning, recordPracticeAttempt, moveReview } from '../../utils/learningState'
import { splitInterviewAnswer } from '../../utils/interviewQuestions'

// react-markdown + KaTeX + highlight.js are ~600KB and are only needed once an
// answer is actually revealed, so they get their own chunk.
const MarkdownRenderer = lazy(() => import('../markdown/MarkdownRenderer'))

/**
 * Step-through interview practice deck. Shared by the per-topic deck in TopicViewer
 * and the per-category deck in InterviewPage — both read the same validated Markdown
 * (directly for a topic, via GET /api/v1/interview/questions for a category), so this
 * component only needs a flat `questions` array of { id, question, difficulty,
 * answerMarkdown }. Pass `renderMeta` to show extra context per question (InterviewPage
 * uses it for a link back to the source topic; TopicViewer has no need for it since
 * every question already shares the page's topic).
 *
 * A genuinely new dataset (a different topic, or a different category/difficulty filter)
 * must be signalled with a `key` change at the call site rather than resetting state from
 * a `useEffect` keyed on `questions` — `useEffect` runs asynchronously after paint, so a
 * reset effect from a stale `questions` identity can still be queued when the very next
 * user interaction (e.g. an immediate "Reveal answer" click) commits, silently clobbering
 * it. `key`-driven remounts start a fresh instance synchronously with no such race. Callers
 * that only append/reorder the same dataset (pagination, shuffle) keep the same `key` on
 * purpose, so the reader's current position survives.
 */
export default function InterviewDeck({
  questions,
  eyebrow = 'Interview practice',
  heading = 'Test your recall',
  renderMeta,
  scope,
  requestedKey,
  onFindSavedQuestion
}) {
  const { state, durable } = useLearningState()
  const [selectedId, setSelectedId] = useState(() => requestedKey || (scope && state.sessions[scope]) || (questions[0] ? questionKey(questions[0]) : null))
  const instanceId = useId()
  const [revealed, setRevealed] = useState(false)
  const [answerViewed, setAnswerViewed] = useState(false)
  const [attemptMessage, setAttemptMessage] = useState('')
  const [finding, setFinding] = useState(false)
  const [findError, setFindError] = useState('')

  if (questions.length === 0) return null
  const selectedIndex = questions.findIndex(question => questionKey(question) === selectedId)
  const safeIndex = Math.max(0, selectedIndex)
  const current = questions[safeIndex]
  const { answerMarkdown, rubric } = splitInterviewAnswer(current.answerMarkdown)
  const rubricMarkdown = rubric && `${['Say it', 'Mechanism', 'Example', 'Limit', 'Watch for']
    .map((label, index) => `${index + 1}. **${label}:** ${rubric[label]}`)
    .join('\n')}\n\n**Follow-up:** ${rubric['Follow-up']}`
  const answerId = `interview-answer-${instanceId}-${current.id}`
  const saved = state.practice[questionKey(current)] || { draft: '', assessment: '' }
  const move = (nextIndex) => {
    const key = questionKey(questions[nextIndex])
    setSelectedId(key)
    if (scope) updateLearning(state => ({ ...state, sessions: { ...state.sessions, [scope]: key } }))
    setRevealed(false)
    setAnswerViewed(false)
    setAttemptMessage('')
    setFindError('')
  }

  if (selectedIndex < 0) return <section className="interview-deck" aria-labelledby={`interview-practice-title-${instanceId}`}>
    <div className="interview-deck-heading"><div><p className="study-eyebrow">{eyebrow}</p><h2 id={`interview-practice-title-${instanceId}`}>{heading}</h2></div></div>
    <p role="status">Your saved question is not among the {questions.length} questions loaded yet.</p>
    {onFindSavedQuestion && <button type="button" disabled={finding} onClick={async () => {
      setFinding(true)
      setFindError('')
      try {
        if (!await onFindSavedQuestion(selectedId)) setFindError('That question is no longer in this selection. Your saved answer remains in your learning backup.')
      } catch { setFindError('Could not load the saved question. Try again or start from the first question.') }
      finally { setFinding(false) }
    }}>{finding ? 'Finding saved question…' : 'Find saved question'}</button>}
    {findError && <p role="alert">{findError}</p>}
    <button type="button" onClick={() => move(0)}>Start from the first question</button>
  </section>

  return (
    <section className="interview-deck" aria-labelledby={`interview-practice-title-${instanceId}`}>
      <div className="interview-deck-heading">
        <div>
          <p className="study-eyebrow">{eyebrow}</p>
          <h2 id={`interview-practice-title-${instanceId}`}>{heading}</h2>
        </div>
        <span>{safeIndex + 1} / {questions.length}</span>
      </div>
      <p className="interview-question"><strong>{current.question}</strong> <code>[{current.difficulty}]</code></p>
      {renderMeta && <div className="interview-question-meta">{renderMeta(current)}</div>}
      <label className="practice-draft">Your explanation <span>(optional)</span><textarea rows={5} maxLength={20000} value={saved.draft} placeholder="Explain the idea in your own words. What changes, and why?" onChange={event => savePractice(current, { draft: event.target.value })} /></label>
      <p className="practice-save-status" role="status">{durable ? 'Drafts are saved in this browser.' : 'Storage is unavailable. Your draft is kept for this session only.'}</p>
      {revealed && (
        <div id={answerId} className="interview-answer">
          <Suspense fallback={<p>Loading answer…</p>}>
            <MarkdownRenderer content={answerMarkdown} />
          </Suspense>
        </div>
      )}
      {revealed && (rubric ? <details className="practice-guidance"><summary>Answer checklist and follow-up</summary><Suspense fallback={<p>Loading checklist…</p>}><MarkdownRenderer content={rubricMarkdown} /></Suspense><p>Compare your explanation with these points; your self-rating is not an automatic grade.</p></details> : <details className="practice-guidance"><summary>How to compare your answer</summary><ol><li>Did you state the main idea directly?</li><li>Did you explain the mechanism or sequence, not just name it?</li><li>Could you give a concrete example and say when the answer changes?</li><li>Did you mention an important limit or trade-off?</li></ol><p>Use the model answer to check your reasoning. These prompts are a guide, not an automatic score.</p></details>)}
      {<fieldset className="practice-assessment"><legend>Your self-assessment</legend>{[['review', 'Needs review'], ['partial', 'Partly recalled'], ['confident', 'Recalled confidently']].map(([value, label]) => <button key={value} type="button" aria-pressed={saved.assessment === value} onClick={() => savePractice(current, { assessment: value })}>{label}</button>)}</fieldset>}
      <div className="saved-answer-actions">
        <button type="button" disabled={!saved.assessment} onClick={() => {
          if (recordPracticeAttempt(current, answerViewed)) setAttemptMessage('Attempt recorded. Your next review date is shown below.')
        }}>Record this attempt</button>
      </div>
      {attemptMessage && <p role="status">{attemptMessage}</p>}
      {state.reviews[questionKey(current)] && <details className="practice-guidance">
        <summary>Review date and previous attempts</summary>
        <p>Next review: {new Date(state.reviews[questionKey(current)].dueAt).toLocaleString()}. Needs review: 1 day; partial: 3 days; confident: 7 days, then doubles up to 30 days. These are suggestions, not grades.</p>
        <button type="button" onClick={() => moveReview(questionKey(current), 'postpone')}>Postpone one day</button>
        <button type="button" onClick={() => moveReview(questionKey(current), 'reset')}>Reset review date to now</button>
        <p>The most recent 10 recorded attempts are kept. Compare what you explained, not just your rating.</p>
        <ol>{state.reviews[questionKey(current)].attempts.map((attempt, index) => <li key={`${attempt.id}-${index}`}>
          <p>{new Date(attempt.at).toLocaleString()} · {attempt.assessment} · {attempt.answerViewed ? 'Model answer opened during this visit' : 'Model answer not opened during this visit'}</p>
          <p className="saved-answer-draft">{attempt.draft || 'No written explanation recorded.'}</p>
        </li>)}</ol>
      </details>}
      <div className="interview-deck-actions">
        <button
          type="button"
          aria-expanded={revealed}
          aria-controls={answerId}
          onClick={() => { setRevealed(value => !value); setAnswerViewed(true) }}
        >
          {revealed ? 'Hide answer' : 'Reveal answer'}
        </button>
        <button type="button" onClick={() => move(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0}>Previous</button>
        <button type="button" onClick={() => move(Math.min(questions.length - 1, safeIndex + 1))} disabled={safeIndex === questions.length - 1}>Next</button>
      </div>
    </section>
  )
}
