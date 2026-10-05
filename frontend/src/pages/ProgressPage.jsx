import PracticeReview from '../components/shared/PracticeReview'
import LearningBackup from '../components/shared/LearningBackup'
import Icon from '../components/shared/Icon'
import LessonRow from '../components/shared/LessonRow'
import useLearningState from '../hooks/useLearningState'
import { latestReading, readingUrl } from '../utils/learningState'
import useCatalog from '../hooks/useCatalog'
import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchTopics } from '../utils/api'
import { exportProgress, importProgress } from '../utils/topicProgress'
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

const IMPORT_ERROR_MESSAGES = {
  'invalid-json': 'That file is not valid JSON.',
  'invalid-format': 'That file is not a recognized progress export.',
  'unsupported-version': 'That file was exported from a newer version of this app.'
}

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
  const { topics, status, retry } = useCatalog()
  const [importStatus, setImportStatus] = useState(null)
  const importInputRef = useRef(null)
  const { progress, toggleBookmark } = useTopicProgress()
  const { state: learning } = useLearningState()

  const handleExportProgress = () => {
    const file = exportProgress()
    const blob = new Blob([JSON.stringify(file, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `cs-fundamentals-progress-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleImportFile = (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = importProgress(reader.result)
      setImportStatus(result.ok
        ? { type: 'success', message: `Imported progress for ${result.importedCount} topic${result.importedCount === 1 ? '' : 's'}.` }
        : { type: 'error', message: IMPORT_ERROR_MESSAGES[result.error] || 'Could not import that file.' })
    }
    reader.onerror = () => setImportStatus({ type: 'error', message: 'Could not read that file.' })
    reader.readAsText(file)
  }

  const overall = computeOverallStats(topics, progress)
  const categoryStats = computeCategoryStats(topics, progress)
  const levelStats = computeLevelStats(topics, progress)
  const nextTopic = getNextTopic(topics, progress, latestReading(topics, learning)?.category)
  const bookmarked = getBookmarkedTopics(topics, progress)

  const resumeTopic = latestReading(topics, learning)
  const now = Date.now()
  const dueReviews = Object.values(learning.reviews || {}).filter(entry => Number.isFinite(entry?.dueAt) && entry.dueAt <= now).length

  return (
    <div className="progress-page roadmap-index">
      <header className="roadmap-header">
        <p className="eyebrow">Your learning progress</p>
        <h1>Progress Dashboard</h1>
        {status === 'loading' ? (
          <p role="status">Loading your progress…</p>
        ) : status === 'error' ? (
          <div className="reader-error" role="alert"><p>Couldn't load your progress right now. Your saved progress is still on this device.</p><button type="button" className="ui-button ui-button--primary" onClick={retry}>Retry</button></div>
        ) : (
          <div className="progress-overall">
            <p role="status">
              {overall.completed} of {overall.total} topics completed ({overall.percent}%)
            </p>
            <ProgressBar percent={overall.percent} label="Overall completion" />
          </div>
        )}
      </header>

      {status === 'ready' && (
        <div className="progress-layout" aria-live="polite">
          <section className="category-overview progress-continue" aria-labelledby="progress-continue-heading">
            <h2 id="progress-continue-heading">Continue</h2>
            <div className="progress-continue-grid">
              {resumeTopic && <div className="progress-continue-item">
                <p className="eyebrow">Resume reading</p>
                <p className="progress-continue-title">{resumeTopic.title}</p>
                <Link to={readingUrl(resumeTopic, learning)} className="ui-button ui-button--primary"><Icon name="book" size={16} />Resume reading</Link>
              </div>}
              {nextTopic && <section className="progress-continue-item progress-next-up" aria-labelledby="progress-next-heading">
                <h3 id="progress-next-heading" className="eyebrow">Next recommended lesson</h3>
                <p className="progress-continue-title">{nextTopic.title}</p>
                <Link to={`/topic/${nextTopic.id}`} className={`ui-button ${resumeTopic ? 'ui-button--secondary' : 'ui-button--primary'}`} aria-label={`Study ${nextTopic.title}`}>Study<Icon name="arrowRight" size={16} /></Link>
              </section>}
              <div className="progress-continue-item">
                <p className="eyebrow">Review over time</p>
                <p className="progress-continue-title">{dueReviews > 0 ? `${dueReviews} question${dueReviews === 1 ? '' : 's'} due for review` : 'No reviews due right now'}</p>
                <p className="progress-continue-note">A session mixes due questions with previously recalled answers, up to eight. Dates are suggestions, not grades.</p>
                <Link to="/review" className="ui-button ui-button--secondary"><Icon name="review" size={16} />Start a review session</Link>
              </div>
            </div>
          </section>

          <section className="category-overview" aria-labelledby="progress-bookmarks-heading">
            <h2 id="progress-bookmarks-heading">Bookmarked topics</h2>
            {bookmarked.length === 0 ? (
              <p className="progress-empty">No bookmarks yet — bookmark a lesson from its page or a learning path to save it here.</p>
            ) : (
              <ol className="lesson-rows" aria-label="Bookmarked topics">
                {bookmarked.map((topic, index) => (
                  <LessonRow key={topic.id} topic={topic} number={index + 1} description={topic.summary} showCategory bookmarked completed={Boolean(progress[topic.id]?.completed)} onToggleBookmark={toggleBookmark} />
                ))}
              </ol>
            )}
          </section>

          <div className="progress-stats-grid">
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
          </div>
        </div>
      )}
      <PracticeReview topics={topics} />
      <section className="category-overview progress-backup" aria-labelledby="progress-backup-heading">
        <h2 id="progress-backup-heading">Backups and transfer</h2>
        <LearningBackup topics={topics} />
        <div className="progress-legacy-transfer">
          <h3>Lesson progress only</h3>
          <p>Bookmarks and completion in the older version 1 format. Importing merges: it never removes progress made on this device.</p>
          <div className="progress-transfer-actions">
            <button type="button" className="ui-button ui-button--secondary ui-button--compact" onClick={handleExportProgress}>
              <Icon name="download" size={16} />Export progress
            </button>
            <button type="button" className="ui-button ui-button--secondary ui-button--compact" onClick={() => importInputRef.current?.click()}>
              <Icon name="upload" size={16} />Import progress
            </button>
            <input
              ref={importInputRef}
              type="file"
              accept="application/json"
              onChange={handleImportFile}
              className="progress-transfer-input"
              aria-label="Import progress from a JSON file"
            />
          </div>
          {importStatus && (
            <p className={`progress-transfer-status progress-transfer-status--${importStatus.type}`} role="status">
              {importStatus.message}
            </p>
          )}
        </div>
      </section>
    </div>
  )
}
