import ResumeReading from '../components/shared/ResumeReading'
import useLearningState from '../hooks/useLearningState'
import { latestReading } from '../utils/learningState'
import useCatalog from '../hooks/useCatalog'
import { Link, useSearchParams } from 'react-router-dom'
import { compareTopics } from '../utils/progressStats'
import { isBookmarked, isCompleted, getCompletedCount } from '../utils/topicProgress'
import { getNextTopic, getBookmarkedTopics } from '../utils/progressStats'
import useTopicProgress from '../hooks/useTopicProgress'
import { CATEGORY_ORDER, LEVEL_ORDER, LEVEL_LABELS, LEVEL_GLYPHS } from '../utils/topicCategories'

const LEVEL_FILTERS = ['all', 'beginner', 'intermediate', 'expert']

// Distinct from utils/topicCategories.js's CATEGORY_METADATA: this page's established labels/
// summaries (e.g. "AI/ML Systems") predate and differ from that shared module's, so it keeps its
// own copy rather than risk changing text this page never asked to change.
const CATEGORY_DETAILS = {
  'java-spring': {
    label: 'Java & Spring',
    shortLabel: 'JAVA',
    glyph: '◐',
    summary: 'Start with Java foundations, then build toward concurrency and Spring application architecture.'
  },
  os: {
    label: 'Operating Systems',
    shortLabel: 'OS',
    glyph: '◆',
    summary: 'Understand processes, memory, scheduling, synchronization, and the kernel services beneath applications.'
  },
  networking: {
    label: 'Computer Networks',
    shortLabel: 'NET',
    glyph: '⬡',
    summary: 'Follow data from local links through routing, transport, and secure application protocols.'
  },
  dbms: {
    label: 'DBMS',
    shortLabel: 'DB',
    glyph: '▤',
    summary: 'Model data, reason about queries and transactions, then study storage and distributed trade-offs.'
  },
  aiml: {
    label: 'AI/ML Systems',
    shortLabel: 'AI/ML',
    glyph: '✳',
    summary: 'Connect modern ML foundations to retrieval, serving, evaluation, and production operations.'
  },
  devops: {
    label: 'DevOps & Infrastructure',
    shortLabel: 'DEVOPS',
    glyph: '⚙',
    summary: 'Take a working application to production: containers, orchestration, networking, delivery pipelines, and observability.'
  }
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
  const selectedCategory = Object.hasOwn(CATEGORY_DETAILS, params.get('category')) ? params.get('category') : 'all'
  const selectedLevel = LEVEL_FILTERS.includes(params.get('level')) ? params.get('level') : 'all'
  const bookmarkedOnly = params.get('bookmarked') === 'true'
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
    ...CATEGORY_DETAILS[id],
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
  const recentCategory = latestReading(topics, learning)?.category
  const nextTopic = getNextTopic(topics, progress, recentCategory)
  // Kept visible while the filter is on, even at zero bookmarks: otherwise un-bookmarking your last
  // topic hides the control while the filter stays active, with no way left to switch it off.
  const showBookmarkFilter = bookmarkedOnly || getBookmarkedTopics(topics, progress).length > 0

  return (
    <div className="roadmap-index">
      <ResumeReading topics={topics} />
      <header className="roadmap-header home-hero">
        <p className="eyebrow">CS Fundamentals · Learn with understanding</p>
        <h1>Understand the systems <br /><em>behind your code.</em></h1>
        <p>
          {topics.length} lessons on the fundamentals interviewers actually ask about — each read at three depths, with diagrams, worked examples and interview questions.
        </p>
        {nextTopic && (
          <p className="roadmap-start">
            <Link to={`/topic/${nextTopic.id}`} className="roadmap-cta roadmap-cta-primary">
              {completedCount === 0 ? 'Start here' : 'Next recommended lesson'}: {nextTopic.title} →
            </Link>
          </p>
        )}
        {completedCount > 0 && (
          <p className="roadmap-progress-summary" role="status">
            {completedCount} of {topics.length} topics completed
          </p>
        )}

      </header>

      {status === 'ready' && selectedCategory === 'all' && <section className="learning-paths" aria-labelledby="learning-paths-title">
        <div className="section-heading"><div><p className="eyebrow">Choose your path</p><h2 id="learning-paths-title">Six ways to go deeper</h2></div><p>Understand the idea. Follow the mechanism. Explain the trade-off.</p></div>
        <div className="category-card-grid">{categories.map(category => <Link className="category-card" data-category={category.id} key={category.id} to={`/category/${category.id}`}>
          <span className="category-card-symbol" aria-hidden="true">{category.glyph}</span><span className="category-card-count">{category.topics.length} lessons</span>
          <h3>{category.label}</h3><p>{category.summary}</p><span className="category-card-action">Explore path <span aria-hidden="true">↗</span></span>
        </Link>)}</div>
      </section>}
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
                <span aria-hidden="true">★</span> Bookmarked
              </button>
            )}
          </div>
        </div>
      <div aria-live="polite">
        {/* Only when a category is chosen. The "all" variant restated the intro sentence above and
            cost ~175px of the first screen, pushing every topic below the fold. */}
        {selectedCategory !== 'all' && (
          <section className="category-overview" aria-labelledby="roadmap-summary">
            <h2 id="roadmap-summary">{CATEGORY_DETAILS[selectedCategory].label}</h2>
            <p>
              {CATEGORY_DETAILS[selectedCategory].summary} {topicCountLabel(visibleTopicCount)} in this path.
            </p>
          </section>
        )}

        {status === 'error' ? (<section className="reader-error" role="alert"><h2>Couldn't load the curriculum</h2><p>Your saved progress is still on this device.</p><button onClick={retry}>Retry</button></section>) : status === 'loading' ? (
          <p className="category-overview">Loading the curriculum roadmap…</p>
        ) : visibleTopicCount === 0 ? (
          <section className="roadmap-empty-state" role="status" aria-labelledby="empty-roadmap-heading">
            <h2 id="empty-roadmap-heading">No topics match these filters</h2>
            <p>Choose another category or level to continue exploring the curriculum.</p>
            <button
              type="button"
              className="roadmap-empty-action"
              onClick={() => {
                setParams(previous => { const next = new URLSearchParams(previous); ['category', 'level', 'bookmarked'].forEach(key => next.delete(key)); return next })
              }}
            >
              Show all topics
            </button>
          </section>
        ) : visibleCategories.filter(category => category.topics.length > 0).map((category, categoryIndex) => (
          <section
            key={category.id}
            className="category-overview"
            aria-labelledby={`${category.id}-heading`}
            data-category={category.id}
          >
            <h2 id={`${category.id}-heading`}>
              <span className="category-glyph" aria-hidden="true">{category.glyph}</span>{' '}
              {selectedCategory === 'all' ? `${categoryIndex + 1}. ${category.label}` : category.label}
            </h2>
            <div className="category-meta">
              <p>{category.summary}</p>
              <span>{topicCountLabel(category.topics.length)}</span>
            </div>
            <ol className="topic-rows" aria-label={`${category.label} topics`}>
              {category.topics.map((topic, topicIndex) => {
                const topicBookmarked = isBookmarked(topic.id, progress)
                const topicCompleted = isCompleted(topic.id, progress)
                return (
                  <li key={topic.id} className="topic-row">
                    <span className="topic-number" aria-label={`Topic ${topicIndex + 1}`}>{String(topicIndex + 1).padStart(2, '0')}</span>
                    <div className="topic-row-body">
                      <span
                        className={`tier-badge tier-badge--${topic.level || 'beginner'}`}
                        aria-label={`${LEVEL_LABELS[topic.level] || 'Beginner'} level`}
                      >
                        <span className="tier-badge-glyph" aria-hidden="true">
                          {LEVEL_GLYPHS[topic.level] || LEVEL_GLYPHS.beginner}
                        </span>
                        <span>{LEVEL_LABELS[topic.level] || 'Beginner'}</span>
                      </span>
                      {topicCompleted && (
                        <span className="completed-badge">
                          <span aria-hidden="true">✓</span> Completed
                        </span>
                      )}
                      <h3 className="topic-row-title">{topic.title}</h3>
                      <p className="topic-row-summary">{topic.summary}</p>
                    </div>
                    <div className="topic-row-actions">
                      <button
                        type="button"
                        className="bookmark-toggle-icon"
                        aria-pressed={topicBookmarked}
                        aria-label={topicBookmarked ? `Remove ${topic.title} from bookmarks` : `Bookmark ${topic.title}`}
                        onClick={() => toggleBookmark(topic.id)}
                      >
                        <span aria-hidden="true">{topicBookmarked ? '★' : '☆'}</span>
                      </button>
                      <Link to={`/topic/${topic.id}`} className="roadmap-cta" aria-label={`Study ${topic.title}`}>
                        Study topic <span aria-hidden="true">→</span>
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  )
}
