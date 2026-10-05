import { useEffect, useId, useState } from 'react'
import useLearningState from '../hooks/useLearningState'
import { latestReading, readingUrl } from '../utils/learningState'
import useCatalog from '../hooks/useCatalog'
import { Link, useSearchParams } from 'react-router-dom'
import { compareTopics } from '../utils/progressStats'
import { isBookmarked, isCompleted, getCompletedCount } from '../utils/topicProgress'
import { getNextTopic, getBookmarkedTopics } from '../utils/progressStats'
import useTopicProgress from '../hooks/useTopicProgress'
import { CATEGORY_METADATA, CATEGORY_ORDER, LEVEL_LABELS } from '../utils/topicCategories'
import Icon from '../components/shared/Icon'
import LessonRow from '../components/shared/LessonRow'

const LEVEL_FILTERS = ['all', 'beginner', 'intermediate', 'expert']
const FILTER_KEYS = ['category', 'level', 'bookmarked']

function savedAgo(timestamp) {
  const minutes = Math.round((Date.now() - timestamp) / 60000)
  if (!Number.isFinite(minutes) || minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.round(hours / 24)
  return `${days} day${days === 1 ? '' : 's'} ago`
}

function topicCategory(topic) {
  return topic.category || 'os'
}

function sortTopics(topics) {
  return [...topics].sort(compareTopics)
}

function topicCountLabel(count) {
  return `${count} ${count === 1 ? 'topic' : 'topics'}`
}

export default function HomePage() {
  const { topics, status, retry } = useCatalog()
  const { state: learning } = useLearningState()
  const [params, setParams] = useSearchParams()
  const browseId = useId()
  const selectedCategory = Object.hasOwn(CATEGORY_METADATA, params.get('category')) ? params.get('category') : 'all'
  const selectedLevel = LEVEL_FILTERS.includes(params.get('level')) ? params.get('level') : 'all'
  const bookmarkedOnly = params.get('bookmarked') === 'true'
  const hasFilterInUrl = FILTER_KEYS.some(key => params.has(key))
  // A bookmarked or shared filter URL opens the roadmap with its selection visible.
  const [browseOpen, setBrowseOpen] = useState(hasFilterInUrl)
  useEffect(() => { if (hasFilterInUrl) setBrowseOpen(true) }, [hasFilterInUrl])
  const setFilter = (key, value) => setParams(previous => {
    const next = new URLSearchParams(previous)
    if (value === 'all' || value === false) next.delete(key)
    else next.set(key, String(value))
    return next
  })
  const setSelectedCategory = value => setFilter('category', value)
  const setSelectedLevel = value => setFilter('level', value)
  const setBookmarkedOnly = value => setFilter('bookmarked', typeof value === 'function' ? value(bookmarkedOnly) : value)
  const { progress, toggleBookmark } = useTopicProgress()

  const categories = CATEGORY_ORDER.map(id => ({
    id,
    ...CATEGORY_METADATA[id],
    topics: sortTopics(topics.filter(topic => topicCategory(topic) === id))
  }))

  const selectedCategories = selectedCategory === 'all'
    ? categories
    : categories.filter(category => category.id === selectedCategory)

  const visibleCategories = selectedCategories.map(category => ({
    ...category,
    topics: category.topics
      .filter(topic => selectedLevel === 'all' || (topic.level || 'beginner') === selectedLevel)
      .filter(topic => !bookmarkedOnly || isBookmarked(topic.id, progress))
  }))

  const visibleTopicCount = visibleCategories.reduce((count, category) => count + category.topics.length, 0)
  const completedCount = getCompletedCount(progress)

  // Same helper the progress dashboard uses for "Continue where you left off", so both pages agree
  // on what comes next instead of each deciding for themselves.
  const resumeTopic = latestReading(topics, learning)
  const nextTopic = getNextTopic(topics, progress, resumeTopic?.category)
  // Kept visible while the filter is on, even at zero bookmarks: otherwise un-bookmarking your last
  // topic hides the control while the filter stays active, with no way left to switch it off.
  const showBookmarkFilter = bookmarkedOnly || getBookmarkedTopics(topics, progress).length > 0
  const clearFilters = () => setParams(previous => { const next = new URLSearchParams(previous); FILTER_KEYS.forEach(key => next.delete(key)); return next })

  return (
    <div className="roadmap-index home-page">
      <header className="home-hero">
        <p className="eyebrow">CS Fundamentals · Learn with understanding</p>
        <h1>Understand the systems behind your code.</h1>
        <p className="home-lead">
          {status === 'ready' ? `${topics.length} lessons` : 'Lessons'} on the fundamentals interviewers actually ask about — each read at three depths, with diagrams, worked examples and interview questions.
        </p>
        <div className="home-actions">
          {resumeTopic ? (
            <Link to={readingUrl(resumeTopic, learning)} className="ui-button ui-button--primary home-primary-action">
              <Icon name="book" size={18} /><span>Resume reading: {resumeTopic.title}</span>
            </Link>
          ) : nextTopic && (
            <Link to={`/topic/${nextTopic.id}`} className="ui-button ui-button--primary home-primary-action">
              <span>{completedCount === 0 ? 'Start here' : 'Next recommended lesson'}: {nextTopic.title}</span><Icon name="arrowRight" size={18} />
            </Link>
          )}
          {resumeTopic && nextTopic && nextTopic.id !== resumeTopic.id && (
            <Link to={`/topic/${nextTopic.id}`} className="ui-button ui-button--secondary">Next recommended: {nextTopic.title}</Link>
          )}
          <Link to="/search" className="ui-button ui-button--quiet"><Icon name="search" size={18} />Search lessons</Link>
        </div>
        {resumeTopic && <p className="home-resume-note">Reading position saved {savedAgo(learning.reading[resumeTopic.id].updatedAt)} in this browser.</p>}
        {completedCount > 0 && status === 'ready' && (
          <p className="roadmap-progress-summary" role="status">
            {completedCount} of {topics.length} topics completed
          </p>
        )}
      </header>

      {status === 'error' && <section className="reader-error" role="alert"><h2>Couldn't load the curriculum</h2><p>Your saved progress is still on this device.</p><button type="button" className="ui-button ui-button--primary" onClick={retry}>Retry</button></section>}
      {status === 'loading' && <p className="home-loading" role="status">Loading the curriculum…</p>}

      {status === 'ready' && <section className="learning-paths" aria-labelledby="learning-paths-title">
        <div className="section-heading">
          <h2 id="learning-paths-title">Learning paths</h2>
          <p>Choose a path to see its ordered lessons, outcomes and prerequisites.</p>
        </div>
        <ul className="path-grid">
          {categories.map(category => {
            const done = category.topics.filter(topic => isCompleted(topic.id, progress)).length
            return (
              <li key={category.id}>
                <Link className="path-card" data-category={category.id} to={`/category/${category.id}`}>
                  <span className="path-card-glyph" aria-hidden="true">{category.glyph}</span>
                  <span className="path-card-body">
                    <span className="path-card-title">{category.label}</span>
                    <span className="path-card-meta">{category.topics.length} lesson{category.topics.length === 1 ? '' : 's'}{done > 0 ? ` · ${done} completed` : ''}</span>
                    <span className="path-card-summary">{category.summary}</span>
                  </span>
                  <Icon name="chevronRight" size={18} className="path-card-chevron" />
                </Link>
              </li>
            )
          })}
        </ul>
      </section>}

      {status === 'ready' && <section className="browse-lessons" aria-labelledby={`${browseId}-heading`}>
        <h2 id={`${browseId}-heading`} className="browse-lessons-heading">
          <button type="button" className="browse-lessons-toggle" aria-expanded={browseOpen} aria-controls={browseId} onClick={() => setBrowseOpen(value => !value)}>
            <span>Browse all lessons</span>
            <span className="browse-lessons-count">{hasFilterInUrl ? `${visibleTopicCount} of ${topics.length}` : topics.length}</span>
            <Icon name={browseOpen ? 'chevronUp' : 'chevronDown'} size={18} />
          </button>
        </h2>
        <div id={browseId} className="browse-lessons-panel" hidden={!browseOpen}>
          <div className="roadmap-filters">
            <nav className="roadmap-selectors" aria-label="Curriculum categories">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`roadmap-selector ${selectedCategory === 'all' ? 'active' : ''}`}
                aria-pressed={selectedCategory === 'all'}
                aria-label={`Full roadmap, ${topicCountLabel(topics.length)}`}
              >
                <span>Full roadmap</span>
                <span className="roadmap-selector-count" aria-hidden="true">· {topics.length}</span>
              </button>
              {categories.map(category => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategory(category.id)}
                  className={`roadmap-selector ${selectedCategory === category.id ? 'active' : ''}`}
                  aria-pressed={selectedCategory === category.id}
                  aria-label={`${category.label}, ${topicCountLabel(category.topics.length)}`}
                  data-category={category.id}
                >
                  <span className="category-glyph" aria-hidden="true">{category.glyph}</span>
                  <span>{category.shortLabel}</span>
                  <span className="roadmap-selector-count" aria-hidden="true">· {category.topics.length}</span>
                </button>
              ))}
            </nav>

            <div className="level-selectors" role="group" aria-label="Topic levels">
              {LEVEL_FILTERS.map(level => (
                <button
                  key={level}
                  type="button"
                  className={`level-selector ${selectedLevel === level ? 'active' : ''}`}
                  aria-pressed={selectedLevel === level}
                  onClick={() => setSelectedLevel(level)}
                >
                  {level === 'all' ? 'All levels' : LEVEL_LABELS[level]}
                </button>
              ))}
              {showBookmarkFilter && (
                <button
                  type="button"
                  className={`level-selector ${bookmarkedOnly ? 'active' : ''}`}
                  aria-pressed={bookmarkedOnly}
                  onClick={() => setBookmarkedOnly(current => !current)}
                >
                  <Icon name="bookmark" size={14} filled={bookmarkedOnly} /> Bookmarked
                </button>
              )}
              {hasFilterInUrl && <button type="button" className="ui-button ui-button--quiet ui-button--compact" onClick={clearFilters}>Reset filters</button>}
            </div>
          </div>
          <div aria-live="polite">
            {selectedCategory !== 'all' && (
              <p className="roadmap-filter-summary">
                {CATEGORY_METADATA[selectedCategory].summary} {topicCountLabel(visibleTopicCount)} in this path.
              </p>
            )}

            {visibleTopicCount === 0 ? (
              <section className="roadmap-empty-state" role="status" aria-labelledby="empty-roadmap-heading">
                <h3 id="empty-roadmap-heading">No topics match these filters</h3>
                <p>Choose another category or level to continue exploring the curriculum.</p>
                <button type="button" className="ui-button ui-button--secondary" onClick={clearFilters}>Show all topics</button>
              </section>
            ) : visibleCategories.filter(category => category.topics.length > 0).map((category, categoryIndex) => (
              <section key={category.id} className="roadmap-group" aria-labelledby={`${category.id}-heading`} data-category={category.id}>
                <div className="roadmap-group-heading">
                  <h3 id={`${category.id}-heading`}>
                    <span className="category-glyph" aria-hidden="true">{category.glyph}</span>{' '}
                    {selectedCategory === 'all' ? `${categoryIndex + 1}. ${category.label}` : category.label}
                  </h3>
                  <span className="roadmap-group-count">{topicCountLabel(category.topics.length)}</span>
                </div>
                <ol className="lesson-rows" aria-label={`${category.label} topics`}>
                  {category.topics.map((topic, topicIndex) => (
                    <LessonRow
                      key={topic.id}
                      topic={topic}
                      number={topicIndex + 1}
                      description={topic.summary}
                      bookmarked={isBookmarked(topic.id, progress)}
                      completed={isCompleted(topic.id, progress)}
                      onToggleBookmark={toggleBookmark}
                      headingLevel={4}
                    />
                  ))}
                </ol>
              </section>
            ))}
          </div>
        </div>
      </section>}
    </div>
  )
}
