import { useState, lazy, Suspense } from 'react'

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
  renderMeta
}) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (questions.length === 0) return null
  const safeIndex = Math.min(index, questions.length - 1)
  const current = questions[safeIndex]
  const answerId = `interview-answer-${current.id}`
  const move = (nextIndex) => {
    setIndex(nextIndex)
    setRevealed(false)
  }

  return (
    <section className="interview-deck" aria-labelledby="interview-practice-title">
      <div className="interview-deck-heading">
        <div>
          <p className="study-eyebrow">{eyebrow}</p>
          <h2 id="interview-practice-title">{heading}</h2>
        </div>
        <span>{safeIndex + 1} / {questions.length}</span>
      </div>
      <p className="interview-question"><strong>{current.question}</strong> <code>[{current.difficulty}]</code></p>
      {renderMeta && <div className="interview-question-meta">{renderMeta(current)}</div>}
      {revealed && (
        <div id={answerId} className="interview-answer">
          <Suspense fallback={<p>Loading answer…</p>}>
            <MarkdownRenderer content={current.answerMarkdown} />
          </Suspense>
        </div>
      )}
      <div className="interview-deck-actions">
        <button
          type="button"
          aria-expanded={revealed}
          aria-controls={answerId}
          onClick={() => setRevealed(value => !value)}
        >
          {revealed ? 'Hide answer' : 'Reveal answer'}
        </button>
        <button type="button" onClick={() => move(Math.max(0, safeIndex - 1))} disabled={safeIndex === 0}>Previous</button>
        <button type="button" onClick={() => move(Math.min(questions.length - 1, safeIndex + 1))} disabled={safeIndex === questions.length - 1}>Next</button>
      </div>
    </section>
  )
}
