import { useState, useEffect, useCallback } from 'react'
import { Link, useParams } from 'react-router-dom'
import { fetchInterviewQuestions } from '../utils/api'
import { CATEGORY_METADATA } from '../utils/topicCategories'
import InterviewDeck from '../components/shared/InterviewDeck'

const PAGE_SIZE = 50
const DIFFICULTY_FILTERS = ['all', 'easy', 'medium', 'hard']
const CATEGORY_ORDER = ['java-spring', 'os', 'networking', 'dbms', 'aiml']

function categoryLabel(id) {
  return id === 'all' ? 'All categories' : CATEGORY_METADATA[id]?.label || id
}

export default function InterviewPage() {
  const { category: categoryParam = 'all' } = useParams()
  const isKnownCategory = categoryParam === 'all' || Object.hasOwn(CATEGORY_METADATA, categoryParam)
  const apiCategory = categoryParam === 'all' ? null : categoryParam

  const [difficulty, setDifficulty] = useState('all')
  const [questions, setQuestions] = useState([])
  const [total, setTotal] = useState(0)
  const [offset, setOffset] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState(false)
  const [shuffleNonce, setShuffleNonce] = useState(0)

  useEffect(() => {
    if (!isKnownCategory) return undefined
    let cancelled = false
    setLoading(true)
    setError(false)

    fetchInterviewQuestions({
      category: apiCategory,
      difficulty: difficulty === 'all' ? null : difficulty,
      offset: 0,
      limit: PAGE_SIZE
    })
      .then(data => {
        if (cancelled) return
        setQuestions(data.questions)
        setTotal(data.total)
        setOffset(data.questions.length)
        setLoading(false)
      })
      .catch(() => {
        if (cancelled) return
        setError(true)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [apiCategory, difficulty, isKnownCategory])

  const loadMore = useCallback(() => {
    setLoadingMore(true)
    fetchInterviewQuestions({
      category: apiCategory,
      difficulty: difficulty === 'all' ? null : difficulty,
      offset,
      limit: PAGE_SIZE
    })
      .then(data => {
        setQuestions(prev => [...prev, ...data.questions])
        setOffset(offset + data.questions.length)
        setLoadingMore(false)
      })
      .catch(() => setLoadingMore(false))
  }, [apiCategory, difficulty, offset])

  const shuffle = useCallback(() => {
    setQuestions(prev => {
      const shuffled = [...prev]
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return shuffled
    })
    // Bump the deck's key (below) so it remounts at card 1 of the new order — a plain
    // useEffect keyed on `questions` would work most of the time, but effects run after
    // paint and can still be pending when the reader's very next click lands, silently
    // reverting it. See the note on InterviewDeck for the full race.
    setShuffleNonce(nonce => nonce + 1)
  }, [])

  if (!isKnownCategory) {
    return (
      <div className="interview-page roadmap-index">
        <header className="roadmap-header">
          <p className="eyebrow">Interview Mode</p>
          <h1>Unknown category</h1>
          <p>“{categoryParam}” isn't one of the curriculum categories. Pick one below.</p>
        </header>
        <nav className="roadmap-selectors" aria-label="Curriculum categories">
          <Link to="/interview/all" className="roadmap-selector">All categories</Link>
          {CATEGORY_ORDER.map(id => (
            <Link key={id} to={`/interview/${id}`} className="roadmap-selector" data-category={id}>
              <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[id].glyph}</span>
              <span>{CATEGORY_METADATA[id].shortLabel}</span>
            </Link>
          ))}
        </nav>
      </div>
    )
  }

  return (
    <div className="interview-page roadmap-index" data-category={apiCategory || undefined}>
      <header className="roadmap-header">
        <p className="eyebrow">Interview Mode</p>
        <h1>{categoryLabel(categoryParam)} practice</h1>
        <p>Step through validated interview Q&amp;A pulled straight from the curriculum — no separate quiz bank to keep in sync.</p>

        <nav className="roadmap-selectors" aria-label="Curriculum categories">
          <Link
            to="/interview/all"
            className={`roadmap-selector ${categoryParam === 'all' ? 'active' : ''}`}
            aria-current={categoryParam === 'all' ? 'page' : undefined}
          >
            All categories
          </Link>
          {CATEGORY_ORDER.map(id => (
            <Link
              key={id}
              to={`/interview/${id}`}
              className={`roadmap-selector ${categoryParam === id ? 'active' : ''}`}
              aria-current={categoryParam === id ? 'page' : undefined}
              data-category={id}
            >
              <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[id].glyph}</span>
              <span>{CATEGORY_METADATA[id].shortLabel}</span>
            </Link>
          ))}
        </nav>

        <div className="filter-bar" role="group" aria-label="Filter by difficulty">
          <span className="filter-bar-label">Difficulty</span>
          {DIFFICULTY_FILTERS.map(level => (
            <button
              key={level}
              type="button"
              className={`filter-chip ${difficulty === level ? 'is-active' : ''}`}
              aria-pressed={difficulty === level}
              onClick={() => setDifficulty(level)}
            >
              {level === 'all' ? 'All' : level[0].toUpperCase() + level.slice(1)}
            </button>
          ))}
        </div>
      </header>

      <main aria-live="polite">
        {loading ? (
          <p className="category-overview" role="status">Loading interview questions…</p>
        ) : error ? (
          <section className="roadmap-empty-state" role="alert">
            <h2>Couldn't load interview questions</h2>
            <p>The interview API may be unavailable. Try again in a moment.</p>
          </section>
        ) : questions.length === 0 ? (
          <section className="roadmap-empty-state" role="status">
            <h2>No questions match this filter</h2>
            <p>Try a different difficulty or category.</p>
          </section>
        ) : (
          <>
            <div className="interview-deck-toolbar">
              <p>{total} question{total === 1 ? '' : 's'} · {questions.length} loaded</p>
              <button type="button" className="btn btn-secondary is-snug" onClick={shuffle}>
                🔀 Shuffle deck
              </button>
            </div>
            <InterviewDeck
              key={`${categoryParam}-${difficulty}-${shuffleNonce}`}
              questions={questions}
              eyebrow={categoryLabel(categoryParam)}
              heading="Interview Mode"
              renderMeta={question => question.topicTitle && (
                <Link to={`/topic/${question.topicId}`}>
                  From: {question.topicTitle}
                </Link>
              )}
            />
            {offset < total && (
              <button
                type="button"
                className="btn btn-secondary interview-load-more"
                onClick={loadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Loading…' : `Load ${Math.min(PAGE_SIZE, total - offset)} more`}
              </button>
            )}
          </>
        )}
      </main>
    </div>
  )
}
