import CategoryTopicNavigation from './shared/CategoryTopicNavigation'
import useLearningState from '../hooks/useLearningState'
import { readLearning, saveReading, updateLearning } from '../utils/learningState'
import { prefersReducedMotion } from '../utils/motionPreference'
import { useState, useEffect, useLayoutEffect, useMemo, useRef, useCallback, lazy, Suspense } from 'react'
import { getTopicCategory } from '../utils/topicCategories'
import { parseInterviewQuestions } from '../utils/interviewQuestions'
import InterviewDeck from './shared/InterviewDeck'
import Icon from './shared/Icon'
import useDisclosure from '../hooks/useDisclosure'

// react-markdown + KaTeX + highlight.js are ~600KB and are only needed once
// a topic's content is actually being read, so they get their own chunk
// rather than loading with the app shell.
const MarkdownRenderer = lazy(() => import('./markdown/MarkdownRenderer'))

const TIER_HEADINGS = [
  { label: 'Beginner', id: 'beginner-level', tier: 'beginner' },
  { label: 'Intermediate', id: 'intermediate-level', tier: 'intermediate' },
  { label: 'Expert', id: 'expert-level', tier: 'expert' }
]

const TEXT_SIZES = [[16, 'Small'], [18, 'Standard'], [20, 'Large']]

const DESKTOP_TOC_QUERY = '(min-width: 1024px)'

function prefersExpandedToc() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(DESKTOP_TOC_QUERY).matches
}

function cleanSectionTitle(title) {
  return title.replace(/^(?:🟢|🟡|🔴)\s*/u, '')
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: prefersReducedMotion() ? 'instant' : 'smooth', block: 'start' })
}

export default function TopicViewer({ topicId, category, mode = 'theory', practiceQuestion, categoryTopics, categoryOutline, expandedTopics, onToggleTopic, onCollapseAll, locationHash, locationSearch, onPractice }) {
  const { state: learning } = useLearningState()
  const [focusReading, setFocusReading] = useState(false)
  const [content, setContent] = useState('')
  const [loadError, setLoadError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [rendererReady, setRendererReady] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)
  const [activeSection, setActiveSection] = useState('')
  const [sections, setSections] = useState([])
  const [readingProgress, setReadingProgress] = useState(0)
  const [tocExpanded, setTocExpanded] = useState(prefersExpandedToc)
  const articleRef = useRef(null)
  const readingOptions = useDisclosure()
  const textSizeName = `reader-text-size-${topicId}`
  const restoringRef = useRef(true)
  const handleRendererReady = useCallback(() => setRendererReady(true), [])

  useEffect(() => {
    if (!rendererReady || mode !== 'theory') return
    const headings = [...(articleRef.current?.querySelectorAll('h2[id], h3[id]') || [])]
      .map(heading => ({ id: heading.id, title: heading.dataset.tocTitle || heading.textContent, level: Number(heading.tagName[1]) }))
    setSections(headings)
    setActiveSection(current => headings.some(heading => heading.id === current) ? current : '')
  }, [content, rendererReady, mode])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return undefined

    const desktopQuery = window.matchMedia(DESKTOP_TOC_QUERY)
    const handleBreakpointChange = event => setTocExpanded(event.matches)

    if (typeof desktopQuery.addEventListener === 'function') {
      desktopQuery.addEventListener('change', handleBreakpointChange)
    } else {
      desktopQuery.addListener?.(handleBreakpointChange)
    }

    return () => {
      if (typeof desktopQuery.removeEventListener === 'function') {
        desktopQuery.removeEventListener('change', handleBreakpointChange)
      } else {
        desktopQuery.removeListener?.(handleBreakpointChange)
      }
    }
  }, [])

  useEffect(() => {
    setLoading(true)
    setLoadError(null)
    setContent('')
    setRendererReady(false)
    setActiveSection('')
    setSections([])
    setReadingProgress(0)
    const cat = category || getTopicCategory(topicId)

    const controller = new AbortController()
    fetch(`/api/v1/content/${cat}/${topicId}`, { signal: controller.signal })
      .then(res => {
        if (!res.ok) {
          const error = new Error(res.status === 404 ? 'not-found' : 'request-failed')
          error.status = res.status
          throw error
        }
        return res.text()
      })
      .then(text => {
        if (controller.signal.aborted) return
        setContent(text)
        setLoading(false)
      })
      .catch(error => {
        if (controller.signal.aborted || error?.name === 'AbortError') return
        setLoadError(error?.status === 404 ? 'not-found' : 'request-failed')
        setLoading(false)
      })
    return () => controller.abort()
  }, [topicId, category, retryNonce])

  useEffect(() => {
    if (!content || !rendererReady || mode !== 'theory' || typeof IntersectionObserver === 'undefined') return undefined
    const sectionIds = sections.map(section => section.id)
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(entry => entry.isIntersecting)
        if (visible && !restoringRef.current) {
          setActiveSection(visible.target.id)
          if (readLearning().reading[topicId]?.headingId !== visible.target.id) saveReading(topicId, visible.target.id)
        }
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    sectionIds.forEach(id => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [content, rendererReady, sections, mode, topicId])

  useEffect(() => {
    const updateProgress = () => {
      const article = articleRef.current
      if (!article) return
      const articleTop = article.getBoundingClientRect().top + window.scrollY
      const readableDistance = Math.max(1, article.scrollHeight - window.innerHeight)
      const progress = ((window.scrollY - articleTop) / readableDistance) * 100
      setReadingProgress(Math.max(0, Math.min(100, Math.round(progress))))
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    window.addEventListener('resize', updateProgress)
    return () => {
      window.removeEventListener('scroll', updateProgress)
      window.removeEventListener('resize', updateProgress)
    }
  }, [content, rendererReady])

  useLayoutEffect(() => {
    if (!rendererReady || sections.length === 0 || mode !== 'theory') return undefined
    restoringRef.current = true
    const restoreHash = () => {
      let id
      try { id = decodeURIComponent((locationHash ?? window.location.hash).slice(1)) } catch { return }
      const requestedSection = new URLSearchParams(locationSearch ?? window.location.search).get('section')
      const normalizeSection = text => text.replace(/[*_~`|]/g, '').trim()
      const matched = requestedSection && sections.find(section => normalizeSection(section.title) === normalizeSection(requestedSection))
      const saved = readLearning().reading[topicId]?.headingId
      const target = [id, matched?.id, saved].find(value => value && sections.some(section => section.id === value))
      if (target) {
        document.getElementById(target)?.scrollIntoView({ block: 'start', behavior: 'instant' })
        setActiveSection(target)
      }
    }
    restoreHash()
    const frame = requestAnimationFrame(() => { restoringRef.current = false })
    window.addEventListener('hashchange', restoreHash)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('hashchange', restoreHash) }
  }, [rendererReady, sections, mode, topicId, locationHash, locationSearch])

  const questions = useMemo(() => parseInterviewQuestions(content, topicId), [content, topicId])

  if (loading) {
    return (
      <div className="reader-loading" role="status" aria-label="Loading topic">
        <p>Loading topic…</p>
        <span /><span /><span />
      </div>
    )
  }

  if (loadError === 'not-found') {
    return <div className="reader-error" role="status"><h2>Topic not found</h2><p>This lesson is not registered in the curriculum.</p></div>
  }

  if (loadError) {
    return (
      <div className="reader-error" role="alert">
        <h2>Couldn't load this lesson</h2>
        <p>Check the backend connection and try again.</p>
        <button type="button" className="ui-button ui-button--primary" onClick={() => setRetryNonce(value => value + 1)}>Retry</button>
      </div>
    )
  }

  const currentSection = sections.find(section => section.id === activeSection) || sections[0]
  const currentLabel = currentSection ? cleanSectionTitle(currentSection.title) : 'the first section'

  if (mode === 'practice' && !categoryTopics) return questions.length ? <InterviewDeck key={`${topicId}:${practiceQuestion || ''}`} scope={`topic:${topicId}`} requestedKey={practiceQuestion} questions={questions} /> : <p role="status">No interview questions are available for this lesson.</p>

  return (
    <div className={`study-layout ${focusReading && mode === 'theory' ? 'study-layout--focused' : ''}`} style={{ '--reader-font-size': `${learning.preferences.fontSize}px` }}>
      <aside className="study-navigation" aria-label="Study navigation">
        <div className="reading-progress-label"><p className="study-eyebrow">{categoryTopics ? "This lesson" : "On this page"}</p><span>{readingProgress}% read</span></div>
        <div
          className="reading-progress-track"
          role="progressbar"
          aria-label="Reading progress"
          aria-valuemin="0"
          aria-valuemax="100"
          aria-valuenow={readingProgress}
          aria-valuetext={`${readingProgress}% read`}
        ><span style={{ width: `${readingProgress}%` }} /></div>
        <button
          type="button"
          className="toc-toggle"
          aria-expanded={tocExpanded}
          aria-controls="topic-table-of-contents"
          onClick={() => setTocExpanded(expanded => !expanded)}
        >
          <Icon name="list" />
          <span>{categoryTopics ? (tocExpanded ? 'Hide topics' : 'Show topics') : (tocExpanded ? 'Hide table of contents' : 'Show table of contents')}</span>
          <Icon name={tocExpanded ? 'chevronUp' : 'chevronDown'} size={16} className="toc-toggle-chevron" />
        </button>
        {categoryTopics ? <CategoryTopicNavigation category={category} topics={categoryTopics} topicId={topicId} sections={sections} activeSection={activeSection} onSectionClick={id => { setActiveSection(id); scrollToSection(id) }} expanded={expandedTopics} onToggle={onToggleTopic} onCollapseAll={onCollapseAll} {...categoryOutline} hidden={!tocExpanded} /> : <nav id="topic-table-of-contents" aria-label="Table of contents" hidden={!tocExpanded}>
          <ol>
            {sections.map(section => (
              <li key={section.id} className={section.level === 3 ? 'toc-subsection' : undefined}>
                <a
                  href={`#${section.id}`}
                  onClick={() => scrollToSection(section.id)}
                  className={activeSection === section.id ? 'active' : ''}
                  aria-current={activeSection === section.id ? 'location' : undefined}
                  aria-label={`Read ${cleanSectionTitle(section.title)}`}
                >
                  {cleanSectionTitle(section.title)}
                </a>
              </li>
            ))}
          </ol>
        </nav>}
      </aside>
      <div className="study-main">
        {mode === 'practice' ? (questions.length ? <InterviewDeck key={`${topicId}:${practiceQuestion || ''}`} scope={`topic:${topicId}`} requestedKey={practiceQuestion} questions={questions} /> : <p role="status">No interview questions are available for this lesson.</p>) : <>
        <div className="reader-toolbar">
          <nav className="tier-navigation" aria-label="Jump to learning level">
            {TIER_HEADINGS.map(tier => (
              <button
                type="button"
                key={tier.id}
                className={`tier-jump tier-jump--${tier.tier}`}
                onClick={() => scrollToSection(tier.id)}
                aria-label={`Jump to ${tier.label} level`}
                aria-current={activeSection === tier.id ? 'location' : undefined}
              >
                <span className="tier-jump-dot" aria-hidden="true" />
                {tier.label}
              </button>
            ))}
          </nav>
          <div className="reader-toolbar-actions">
            {focusReading && <button type="button" className="ui-button ui-button--secondary ui-button--compact" onClick={() => setFocusReading(false)}><Icon name="close" size={16} />Exit focus reading</button>}
            <div className="reading-options" {...readingOptions.containerProps}>
              <button className="ui-button ui-button--quiet ui-button--compact reading-options-trigger" {...readingOptions.triggerProps}>
                <Icon name="sliders" size={16} />
                <span>Reading options</span>
                <Icon name={readingOptions.open ? 'chevronUp' : 'chevronDown'} size={14} />
              </button>
              <div className="reading-options-panel" {...readingOptions.panelProps}>
                <fieldset className="reading-size">
                  <legend>Text size</legend>
                  <div className="segmented-control">
                    {TEXT_SIZES.map(([size, label]) => (
                      <label key={size} className="segmented-option">
                        <input type="radio" name={textSizeName} value={size} checked={learning.preferences.fontSize === size} onChange={() => updateLearning(state => ({ ...state, preferences: { ...state.preferences, fontSize: size } }))} />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <button type="button" className="reading-focus-toggle" aria-pressed={focusReading} onClick={() => setFocusReading(value => !value)}>
                  <Icon name="focus" size={16} />
                  <span>Focus reading</span>
                  <span className="reading-focus-state" aria-hidden="true">{focusReading ? 'On' : 'Off'}</span>
                </button>
                <div className="reading-help">
                  <p className="reading-help-title">How to study</p>
                  <p>Read the mental model, follow a worked example, then explain it in your own words. Explore the Expert section when you are ready for trade-offs.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        <article className="topic-content" ref={articleRef}>
          <Suspense fallback={(
            <div className="reader-loading reader-loading--renderer" role="status">
              <p>Preparing reader…</p>
              <span /><span /><span />
            </div>
          )}>
            <MarkdownRenderer content={content} onReady={handleRendererReady} />
          </Suspense>
        </article>
        {questions.length > 0 && <div className="practice-invitation"><p>Ready to explain this? Practise recalling it in your own words.</p>{onPractice && <button type="button" className="ui-button ui-button--secondary" onClick={onPractice}><Icon name="interview" size={16} />Practise this lesson</button>}</div>}
        </>}
      </div>
    </div>
  )
}
