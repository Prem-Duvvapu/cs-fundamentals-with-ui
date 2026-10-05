import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import useTopicProgress from '../hooks/useTopicProgress'
import useLearningState from '../hooks/useLearningState'
import { latestReading, readingUrl } from '../utils/learningState'
import { CATEGORY_METADATA } from '../utils/topicCategories'
import { compareTopics } from '../utils/progressStats'
import Icon from '../components/shared/Icon'
import LessonRow from '../components/shared/LessonRow'
import NotFoundPage from './NotFoundPage'

export default function CategoryPage() {
  const { categoryId } = useParams()
  const category = CATEGORY_METADATA[categoryId]
  const { topics, status, retry } = useCatalog()
  const { progress, toggleBookmark } = useTopicProgress()
  const { state: learning } = useLearningState()
  const lessons = topics.filter(topic => topic.category === categoryId).sort(compareTopics)
  const completed = lessons.filter(topic => progress[topic.id]?.completed).length
  const percent = lessons.length ? Math.round((completed / lessons.length) * 100) : 0
  const resume = latestReading(lessons, learning)
  const nextLesson = lessons.find(topic => !progress[topic.id]?.completed)
  useEffect(() => { document.title = `${category?.label || 'Category not found'} | CS Fundamentals` }, [category])
  if (!category) return <NotFoundPage />

  return <div className="roadmap-index category-page-view" data-category={categoryId}>
    <header className="path-header">
      <nav className="topic-breadcrumb" aria-label="Breadcrumb">
        <ol>
          <li><Link to="/">Learning paths</Link></li>
          <li aria-current="page"><span className="category-glyph" aria-hidden="true">{category.glyph}</span> {category.label}</li>
        </ol>
      </nav>
      <h1>{category.label}</h1>
      <p className="path-intro">{category.summary}</p>
      {status === 'ready' && lessons.length > 0 && <div className="path-progress">
        <p className="path-completion">{completed} of {lessons.length} lessons completed</p>
        <div className="progress-bar" role="progressbar" aria-label={`${category.label} completion`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><div className="progress-bar-fill" style={{ width: `${percent}%` }} /></div>
      </div>}
      {status === 'ready' && lessons.length > 0 && <div className="path-actions">
        {resume
          ? <Link className="ui-button ui-button--primary" to={readingUrl(resume, learning)}><Icon name="book" size={18} />Resume reading: {resume.title}</Link>
          : nextLesson && <Link className="ui-button ui-button--primary" to={`/topic/${nextLesson.id}`}>{completed === 0 ? 'Start with' : 'Continue with'}: {nextLesson.title}<Icon name="arrowRight" size={18} /></Link>}
        {resume && nextLesson && nextLesson.id !== resume.id && <Link className="ui-button ui-button--secondary" to={`/topic/${nextLesson.id}`}>Next incomplete: {nextLesson.title}</Link>}
        <Link className="ui-button ui-button--quiet" to={`/interview/${categoryId}`}><Icon name="interview" size={18} />Practice this category</Link>
      </div>}
    </header>
    {status === 'loading' && <p role="status">Loading learning path…</p>}
    {status === 'error' && <div className="reader-error" role="alert"><h2>Couldn't load this learning path</h2><p>Your saved progress is still on this device.</p><button type="button" className="ui-button ui-button--primary" onClick={retry}>Retry</button></div>}
    {status === 'ready' && lessons.length === 0 && <p role="status">No lessons are available in this path yet.</p>}
    {lessons.length > 0 && <ol className="lesson-rows" aria-label={`${category.label} lessons`}>{lessons.map((topic, index) => (
      <LessonRow
        key={topic.id}
        topic={topic}
        number={index + 1}
        headingLevel={2}
        description={topic.outcomes?.[0] || topic.summary}
        bookmarked={Boolean(progress[topic.id]?.bookmarked)}
        completed={Boolean(progress[topic.id]?.completed)}
        onToggleBookmark={toggleBookmark}
      >
        {topic.prerequisiteIds?.length > 0 && <details className="prerequisite-details">
          <summary>Before you start <span className="prerequisite-count">({topic.prerequisiteIds.length})</span></summary>
          <ul>{topic.prerequisiteIds.map(id => <li key={id}><Link to={`/topic/${id}`}>{topics.find(item => item.id === id)?.title || id}</Link></li>)}</ul>
        </details>}
      </LessonRow>
    ))}</ol>}
  </div>
}
