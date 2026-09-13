import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'
import { CATEGORY_METADATA, CATEGORY_ORDER, LEVEL_LABELS, LEVEL_GLYPHS } from '../utils/topicCategories'
import useTopicProgress from '../hooks/useTopicProgress'
import {
  computeOverallStats,
  computeCategoryStats,
  computeLevelStats,
  getNextTopic,
  getBookmarkedTopics
} from '../utils/progressStats'

const LEVELS = ['beginner', 'intermediate', 'expert']

function ProgressBar({ percent, label }) {
  return (
    <div
      className="progress-bar"
      role="progressbar"
      aria-valuenow={percent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div className="progress-bar-fill" style={{ width: `${percent}%` }} />
    </div>
  )
}

export default function ProgressPage() {
  const [topics, setTopics] = useState([])
  const [status, setStatus] = useState('loading') // 'loading' | 'ready' | 'error'
  const { progress } = useTopicProgress()

  useEffect(() => {
    fetchTopics()
      .then((data) => {
        setTopics(data)
        setStatus('ready')
      })
      .catch(() => setStatus('error'))
  }, [])

  const overall = computeOverallStats(topics, progress)
  const categoryStats = computeCategoryStats(topics, progress)
  const levelStats = computeLevelStats(topics, progress)
  const nextTopic = getNextTopic(topics, progress)
  const bookmarked = getBookmarkedTopics(topics, progress)

  return (
    <div className="progress-page roadmap-index">
      <header className="roadmap-header">
        <p className="eyebrow">Your learning progress</p>
        <h1>Progress Dashboard</h1>
        {status === 'loading' ? (
          <p role="status">Loading your progress…</p>
        ) : status === 'error' ? (
          <p role="alert">Couldn&apos;t load your progress right now. Try again in a moment.</p>
        ) : (
          <>
            <p role="status">
              {overall.completed} of {overall.total} topics completed ({overall.percent}%)
            </p>
            <ProgressBar percent={overall.percent} label="Overall completion" />
          </>
        )}
      </header>

      {status === 'ready' && (
        <div aria-live="polite">
          {nextTopic && (
            <section className="category-overview progress-next-up" aria-labelledby="progress-next-heading">
              <h2 id="progress-next-heading">Continue where you left off</h2>
              <div className="progress-next-up-body">
                <p className="topic-row-title">{nextTopic.title}</p>
                <Link to={`/topic/${nextTopic.id}`} className="roadmap-cta" aria-label={`Study ${nextTopic.title}`}>
                  Study topic <span aria-hidden="true">→</span>
                </Link>
              </div>
            </section>
          )}

          <section className="category-overview" aria-labelledby="progress-category-heading">
            <h2 id="progress-category-heading">By category</h2>
            <ul className="progress-stat-rows">
              {CATEGORY_ORDER.map((id) => {
                const stats = categoryStats[id]
                const meta = CATEGORY_METADATA[id]
                return (
                  <li key={id} className="progress-stat-row" data-category={id}>
                    <span className="category-glyph" aria-hidden="true">{meta.glyph}</span>
                    <span className="progress-stat-label">{meta.label}</span>
                    <ProgressBar percent={stats.percent} label={`${meta.label} completion`} />
                    <span className="progress-stat-count">{stats.completed} of {stats.total}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="category-overview" aria-labelledby="progress-level-heading">
            <h2 id="progress-level-heading">By level</h2>
            <ul className="progress-stat-rows">
              {LEVELS.map((level) => {
                const stats = levelStats[level]
                return (
                  <li key={level} className="progress-stat-row">
                    <span className="progress-level-glyph" aria-hidden="true">{LEVEL_GLYPHS[level]}</span>
                    <span className="progress-stat-label">{LEVEL_LABELS[level]}</span>
                    <ProgressBar percent={stats.percent} label={`${LEVEL_LABELS[level]} completion`} />
                    <span className="progress-stat-count">{stats.completed} of {stats.total}</span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="category-overview" aria-labelledby="progress-bookmarks-heading">
            <h2 id="progress-bookmarks-heading">Bookmarked topics</h2>
            {bookmarked.length === 0 ? (
              <p className="topic-row-summary">No bookmarks yet — star a topic from the roadmap to save it here.</p>
            ) : (
              <ol className="topic-rows" aria-label="Bookmarked topics">
                {bookmarked.map((topic) => (
                  <li key={topic.id} className="topic-row" data-category={topic.category}>
                    <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[topic.category]?.glyph}</span>
                    <div className="topic-row-body">
                      <h3 className="topic-row-title">{topic.title}</h3>
                      <p className="topic-row-summary">{topic.summary}</p>
                    </div>
                    <Link to={`/topic/${topic.id}`} className="roadmap-cta" aria-label={`Study ${topic.title}`}>
                      Study topic <span aria-hidden="true">→</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
