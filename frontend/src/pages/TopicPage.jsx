import useTopicExpansion from '../hooks/useTopicExpansion'
import useCategoryOutline from '../hooks/useCategoryOutline'
import { SimulationVisibility } from '../hooks/useSimulationVisibility'
import { readLearning } from '../utils/learningState'
import useCatalog from '../hooks/useCatalog'
import { compareTopics } from '../utils/progressStats'
import { useEffect, useRef, useState, Suspense } from 'react'
import { useParams, useSearchParams, useNavigate, useLocation, Link } from 'react-router-dom'
import TopicViewer from '../components/TopicViewer'
import { hasTopicVisualizer, TopicVisualizer } from '../components/visualizers/topicVisualizerRegistry'
import { CATEGORY_METADATA, getTopicCategory } from '../utils/topicCategories'
import { isBookmarked, isCompleted } from '../utils/topicProgress'
import useTopicProgress from '../hooks/useTopicProgress'
import NotFoundPage from './NotFoundPage'

export default function TopicPage() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('view') === 'simulation' ? 'simulator' : searchParams.get('view') === 'practice' ? 'practice' : 'theory'
  const [compactHeader, setCompactHeader] = useState(false)
  const tabRefs = useRef([])

  const { topics, status, retry } = useCatalog()
  const topic = topics.find(item => item.id === topicId)
  const title = topic?.title || (status === 'ready' ? 'Topic not found' : status === 'error' ? "Couldn't load this lesson" : 'Loading lesson…')
  const category = topic?.category || getTopicCategory(topicId)
  const categoryMetadata = CATEGORY_METADATA[category]
  const categoryOutline = useCategoryOutline(category, Boolean(topic))
  const [expandedTopics, setExpandedTopics] = useTopicExpansion()
  useEffect(() => { setExpandedTopics(previous => ({ ...previous, [topicId]: true })) }, [topicId, setExpandedTopics])
  const toggleTopic = (id, open) => setExpandedTopics(previous => ({ ...previous, [id]: open }))
  const siblings = topics.filter(item => item.category === category).sort(compareTopics)
  const position = siblings.findIndex(item => item.id === topicId)
  const previous = siblings[position - 1]
  const next = siblings[position + 1]
  const canSimulate = hasTopicVisualizer(topicId)
  const tabs = canSimulate ? ['theory', 'simulator', 'practice'] : ['theory', 'practice']
  const selectedTab = activeTab === 'simulator' && !canSimulate ? 'theory' : activeTab
  const isKnownTopic = Boolean(topic)
  const [visitedSimulation, setVisitedSimulation] = useState(null)
  useEffect(() => { if (selectedTab === 'simulator') setVisitedSimulation(topicId) }, [selectedTab, topicId])

  const { progress, toggleBookmark, toggleCompleted } = useTopicProgress()
  const bookmarked = isBookmarked(topicId, progress)
  const completed = isCompleted(topicId, progress)

  useEffect(() => {
    const updateHeader = () => setCompactHeader(window.scrollY > 120)
    updateHeader()
    window.addEventListener('scroll', updateHeader, { passive: true })
    return () => window.removeEventListener('scroll', updateHeader)
  }, [])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${title} | CS Fundamentals`
    return () => { document.title = previousTitle }
  }, [title])

  const selectTab = (tab, focus = false) => {
    const index = tabs.indexOf(tab)
    const params = new URLSearchParams(searchParams)
    if (tab === 'simulator') params.set('view', 'simulation')
    else if (tab === 'practice') params.set('view', 'practice')
    else params.delete('view')
    const savedHeading = tab === 'theory' ? readLearning().reading[topicId]?.headingId : null
    const hash = savedHeading ? `#${encodeURIComponent(savedHeading)}` : location.hash
    navigate({ pathname: location.pathname, search: params.toString(), hash })
    if (focus) tabRefs.current[index]?.focus()
  }

  const handleTabKeyDown = (event) => {
    const currentIndex = tabs.indexOf(selectedTab)
    let nextIndex
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabs.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex === undefined) return
    event.preventDefault()
    selectTab(tabs[nextIndex], true)
  }

  if (status === 'loading') return <div className="reader-loading" role="status">Loading lesson…</div>
  if (status === 'error') return <div className="reader-error" role="alert"><h1>Couldn't load this lesson</h1><p>Your saved progress is still on this device.</p><button onClick={retry}>Retry</button></div>
  if (!isKnownTopic) {
    return <NotFoundPage title="Topic not found" message="This topic is not part of the current curriculum." />
  }

  return (
    <div className="topic-page-container" data-category={category}>
      <div className={`topic-page-header ${compactHeader ? 'topic-page-header--compact' : ''}`}>
        <nav className="topic-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/">All topics</Link></li>
            <li><Link to={`/category/${category}`}><span aria-hidden="true">{categoryMetadata.glyph}</span> {categoryMetadata.label}</Link></li>
          </ol>
        </nav>
        <div className="topic-page-title-row">
          <h1 className="topic-page-title">{title}</h1>
          <div className="topic-progress-actions">
            <button
              type="button"
              className="progress-toggle bookmark-toggle"
              aria-pressed={bookmarked}
              onClick={() => toggleBookmark(topicId)}
            >
              <span aria-hidden="true">{bookmarked ? '★' : '☆'}</span>
              <span className="progress-toggle-label">{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
            </button>
            <button
              type="button"
              className="progress-toggle complete-toggle"
              aria-pressed={completed}
              onClick={() => toggleCompleted(topicId)}
            >
              <span aria-hidden="true">{completed ? '✓' : '○'}</span>
              <span className="progress-toggle-label">{completed ? 'Completed' : 'Mark complete'}</span>
            </button>
          </div>
        </div>

        {topic.outcomes?.length > 0 && <p className="lesson-outcome">{topic.outcomes[0]}</p>}
        {topic.prerequisiteIds?.length > 0 && <details className="prerequisite-details"><summary>Before you start</summary><ul>{topic.prerequisiteIds.map(id => <li key={id}><Link to={`/topic/${id}`}>{topics.find(item => item.id === id)?.title || id}</Link></li>)}</ul></details>}
        <div className="main-tab-switcher" role="tablist" aria-label="Topic view">
          {tabs.map((tab, index) => <button key={tab} ref={element => { tabRefs.current[index] = element }} id={`topic-tab-${tab}`} type="button" role="tab" aria-selected={selectedTab === tab} aria-controls={`topic-panel-${selectedTab}`} tabIndex={selectedTab === tab ? 0 : -1} onClick={() => selectTab(tab)} onKeyDown={handleTabKeyDown} className={`main-tab-btn ${selectedTab === tab ? 'active-tab' : ''}`}>{tab === 'theory' ? 'Study' : tab === 'simulator' ? 'Simulation' : 'Practice'}</button>)}
        </div>
      </div>

      <div
        className="tab-content-area"
        id={`topic-panel-${selectedTab}`}
        role="tabpanel"
        aria-labelledby={`topic-tab-${selectedTab}`}
        tabIndex="0"
      >
        {(selectedTab === 'simulator' || visitedSimulation === topicId) && <div hidden={selectedTab !== 'simulator'} style={{ display: selectedTab === 'simulator' ? undefined : 'none' }}>
          <SimulationVisibility.Provider value={selectedTab === 'simulator'}>
            <Suspense fallback={<div className="viz-card"><h3>Loading visualizer…</h3></div>}>
              <TopicVisualizer key={topicId} topicId={topicId} />
            </Suspense>
          </SimulationVisibility.Provider>
        </div>}
        <div hidden={selectedTab === 'simulator'} style={{ display: selectedTab === 'simulator' ? 'none' : undefined }}>
          <TopicViewer key={topicId} topicId={topicId} category={category} locationHash={location.hash} locationSearch={location.search} categoryTopics={siblings} categoryOutline={categoryOutline} expandedTopics={expandedTopics} onToggleTopic={toggleTopic} mode={selectedTab === 'simulator' ? 'inactive' : selectedTab} practiceQuestion={searchParams.get('question')} />
        </div>
      </div>
      <nav className="lesson-navigation" aria-label="Learning path navigation">
        {previous ? <Link to={`/topic/${previous.id}`}><span>← Previous lesson</span><strong>{previous.title}</strong></Link> : <Link to={`/category/${category}`}>Back to learning path</Link>}
        {next && <Link to={`/topic/${next.id}`}><span>Next lesson →</span><strong>{next.title}</strong></Link>}
      </nav>
    </div>
  )
}
