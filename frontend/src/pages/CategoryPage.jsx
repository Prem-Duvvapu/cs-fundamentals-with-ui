import { useEffect } from 'react'
import { Link, useParams } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import useTopicProgress from '../hooks/useTopicProgress'
import { CATEGORY_METADATA } from '../utils/topicCategories'
import { compareTopics } from '../utils/progressStats'
import { hasTopicVisualizer } from '../components/visualizers/topicVisualizerRegistry'
import NotFoundPage from './NotFoundPage'

export default function CategoryPage() {
  const { categoryId } = useParams()
  const category = CATEGORY_METADATA[categoryId]
  const { topics, status, retry } = useCatalog()
  const { progress, toggleBookmark } = useTopicProgress()
  const lessons = topics.filter(topic => topic.category === categoryId).sort(compareTopics)
  const completed = lessons.filter(topic => progress[topic.id]?.completed).length
  useEffect(() => { document.title = `${category?.label || 'Category not found'} | CS Fundamentals` }, [category])
  if (!category) return <NotFoundPage />
  return <div className="roadmap-index category-page-view" data-category={categoryId}>
    <header className="path-header">
      <Link className="back-link" to="/">← All learning paths</Link>
      <p className="eyebrow">{category.glyph} Learning path</p><h1>{category.label}</h1><p className="path-intro">{category.summary}</p>
      {status === 'ready' && <p className="path-completion">{completed} of {lessons.length} lessons completed · Work through the foundations, then explore deeper.</p>}
      <Link className="roadmap-cta" to={`/interview/${categoryId}`}>Practice this category →</Link>
    </header>
    {status === 'loading' && <p role="status">Loading learning path…</p>}
    {status === 'error' && <div role="alert"><p>Couldn't load this learning path.</p><button onClick={retry}>Retry</button></div>}
    {status === 'ready' && lessons.length === 0 && <p role="status">No lessons are available in this path yet.</p>}
    <ol className="topic-rows" aria-label={`${category.label} lessons`}>{lessons.map((topic, index) => <li key={topic.id} className="topic-row">
      <span className="topic-number">{String(index + 1).padStart(2, '0')}</span>
      <div className="topic-row-body"><p className="eyebrow">{topic.level} {hasTopicVisualizer(topic.id) ? '· Interactive simulation' : '· Study guide'} {progress[topic.id]?.completed ? '· Completed' : ''}</p>
        <h2 className="topic-row-title"><Link to={`/topic/${topic.id}`}>{topic.title}</Link></h2><p>{topic.outcomes?.[0] || topic.summary}</p>
        {topic.prerequisiteIds?.length > 0 && <details className="prerequisite-details"><summary>Before you start</summary><ul>{topic.prerequisiteIds.map(id => <li key={id}><Link to={`/topic/${id}`}>{topics.find(item => item.id === id)?.title || id}</Link></li>)}</ul></details>}
      </div><div className="topic-row-actions"><button className="bookmark-toggle-icon" aria-pressed={!!progress[topic.id]?.bookmarked} aria-label={`Bookmark ${topic.title}`} onClick={() => toggleBookmark(topic.id)}>{progress[topic.id]?.bookmarked ? '★' : '☆'}</button><Link className="roadmap-cta" to={`/topic/${topic.id}`}>Study →</Link></div>
    </li>)}</ol>
  </div>
}
