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
import Icon from '../components/shared/Icon'
import useScrollRegionAccess from '../hooks/useScrollRegionAccess'

export default function TopicPage() {
  const { topicId } = useParams()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const activeTab = searchParams.get('view') === 'simulation' ? 'simulator' : searchParams.get('view') === 'practice' ? 'practice' : 'theory'
  const tabRefs = useRef([])
  const simulationRef = useRef(null)

  const { topics, status, retry } = useCatalog()
  const topic = topics.find(item => item.id === topicId)
  const title = topic?.title || (status === 'ready' ? 'Topic not found' : status === 'error' ? "Couldn't load this lesson" : 'Loading lesson…')
  const category = topic?.category || getTopicCategory(topicId)
  const categoryMetadata = CATEGORY_METADATA[category]
  const categoryOutline = useCategoryOutline(category, Boolean(topic))
  const [expandedTopics, setExpandedTopics] = useTopicExpansion()
  // Opening a lesson reveals its outline once; an explicit choice (including Collapse all) is kept.
  useEffect(() => { setExpandedTopics(previous => (topicId in previous ? previous : { ...previous, [topicId]: true })) }, [topicId, setExpandedTopics])
  const toggleTopic = (id, open) => setExpandedTopics(previous => ({ ...previous, [id]: open }))
  const siblings = topics.filter(item => item.category === category).sort(compareTopics)
  const collapseAll = () => setExpandedTopics(previous => ({ ...previous, ...Object.fromEntries(siblings.map(item => [item.id, false])) }))
  const position = siblings.findIndex(item => item.id === topicId)
  const previous = siblings[position - 1]
  const next = siblings[position + 1]
  const canSimulate = hasTopicVisualizer(topicId)
  const tabs = canSimulate ? ['theory', 'simulator', 'practice'] : ['theory', 'practice']
  const selectedTab = activeTab === 'simulator' && !canSimulate ? 'theory' : activeTab
  const isKnownTopic = Boolean(topic)
  const [visitedSimulation, setVisitedSimulation] = useState(null)
  useEffect(() => { if (selectedTab === 'simulator') setVisitedSimulation(topicId) }, [selectedTab, topicId])
  useScrollRegionAccess(simulationRef, status === 'ready' && Boolean(topic) && selectedTab === 'simulator' && visitedSimulation === topicId)

  const { progress, toggleBookmark, toggleCompleted } = useTopicProgress()
  const bookmarked = isBookmarked(topicId, progress)
  const completed = isCompleted(topicId, progress)

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

  const prerequisites = (topic.prerequisiteIds || []).map(id => ({ id, title: topics.find(item => item.id === id)?.title || id }))

  return (
    <div className="topic-page-container" data-category={category}>
      <header className="topic-page-header">
        <nav className="topic-breadcrumb" aria-label="Breadcrumb">
          <ol>
            <li><Link to="/">Learning paths</Link></li>
            <li><Link to={`/category/${category}`}><span className="category-glyph" aria-hidden="true">{categoryMetadata.glyph}</span> {categoryMetadata.label}</Link></li>
          </ol>
        </nav>
        <h1 className="topic-page-title">{title}</h1>
        <div className="topic-progress-actions">
          <button
            type="button"
            className="progress-toggle bookmark-toggle"
            aria-pressed={bookmarked}
            onClick={() => toggleBookmark(topicId)}
          >
            <Icon name="bookmark" size={16} filled={bookmarked} />
            <span className="progress-toggle-label">{bookmarked ? 'Bookmarked' : 'Bookmark'}</span>
          </button>
          <button
            type="button"
            className="progress-toggle complete-toggle"
            aria-pressed={completed}
            onClick={() => toggleCompleted(topicId)}
          >
            <Icon name={completed ? 'checkCircle' : 'circle'} size={16} />
            <span className="progress-toggle-label">{completed ? 'Completed' : 'Mark complete'}</span>
          </button>
        </div>
        {(topic.outcomes?.length > 0 || prerequisites.length > 0) && <div className="lesson-summary">
          {topic.outcomes?.length > 0 && <p className="lesson-outcome"><span className="lesson-outcome-label">Outcome</span> {topic.outcomes[0]}</p>}
          {prerequisites.length > 0 && <details className="prerequisite-details">
            <summary>Before you start <span className="prerequisite-count">({prerequisites.length})</span></summary>
            <ul>{prerequisites.map(item => <li key={item.id}><Link to={`/topic/${item.id}`}>{item.title}</Link></li>)}</ul>
          </details>}
        </div>}
        <div className="main-tab-switcher" role="tablist" aria-label="Topic view">
          {tabs.map((tab, index) => <button key={tab} ref={element => { tabRefs.current[index] = element }} id={`topic-tab-${tab}`} type="button" role="tab" aria-selected={selectedTab === tab} aria-controls={`topic-panel-${selectedTab}`} tabIndex={selectedTab === tab ? 0 : -1} onClick={() => selectTab(tab)} onKeyDown={handleTabKeyDown} className={`main-tab-btn ${selectedTab === tab ? 'active-tab' : ''}`}><Icon name={tab === 'theory' ? 'book' : tab === 'simulator' ? 'play' : 'interview'} size={16} />{tab === 'theory' ? 'Study' : tab === 'simulator' ? 'Simulation' : 'Practice'}</button>)}
        </div>
      </header>

      <div
        className="tab-content-area"
        id={`topic-panel-${selectedTab}`}
        role="tabpanel"
        aria-labelledby={`topic-tab-${selectedTab}`}
        tabIndex="0"
      >
        {(selectedTab === 'simulator' || visitedSimulation === topicId) && <div ref={simulationRef} hidden={selectedTab !== 'simulator'} style={{ display: selectedTab === 'simulator' ? undefined : 'none' }}>
          <SimulationVisibility.Provider value={selectedTab === 'simulator'}>
            <Suspense fallback={<div className="viz-card"><h3>Loading visualizer…</h3></div>}>
              <TopicVisualizer key={topicId} topicId={topicId} />
            </Suspense>
          </SimulationVisibility.Provider>
        </div>}
        <div hidden={selectedTab === 'simulator'} style={{ display: selectedTab === 'simulator' ? 'none' : undefined }}>
          <TopicViewer key={topicId} topicId={topicId} category={category} locationHash={location.hash} locationSearch={location.search} categoryTopics={siblings} categoryOutline={categoryOutline} expandedTopics={expandedTopics} onToggleTopic={toggleTopic} onCollapseAll={collapseAll} onPractice={() => selectTab('practice')} mode={selectedTab === 'simulator' ? 'inactive' : selectedTab} practiceQuestion={searchParams.get('question')} />
        </div>
      </div>
      <nav className="lesson-navigation" aria-label="Learning path navigation">
        {previous
          ? <Link className="lesson-navigation-link lesson-navigation-link--previous" to={`/topic/${previous.id}`}><span><Icon name="arrowLeft" size={16} />Previous lesson</span><strong>{previous.title}</strong></Link>
          : <Link className="lesson-navigation-link lesson-navigation-link--previous" to={`/category/${category}`}><span><Icon name="arrowLeft" size={16} />Learning path</span><strong>{categoryMetadata.label}</strong></Link>}
        <button type="button" className={`ui-button ${completed ? 'ui-button--secondary' : 'ui-button--primary'} lesson-complete-action`} aria-pressed={completed} onClick={() => toggleCompleted(topicId)}>
          <Icon name={completed ? 'checkCircle' : 'check'} size={16} />{completed ? 'Completed' : 'Mark lesson complete'}
        </button>
        {next && <Link className="lesson-navigation-link lesson-navigation-link--next" to={`/topic/${next.id}`}><span>Next lesson<Icon name="arrowRight" size={16} /></span><strong>{next.title}</strong></Link>}
      </nav>
    </div>
  )
}
