import { useState, useEffect, useMemo, lazy, Suspense } from 'react'
import { getTopicCategory } from '../utils/topicCategories'
import { parseInterviewQuestions } from '../utils/interviewQuestions'
import InterviewDeck from './shared/InterviewDeck'

// react-markdown + KaTeX + highlight.js are ~600KB and are only needed once
// a topic's content is actually being read, so they get their own chunk
// rather than loading with the app shell.
const MarkdownRenderer = lazy(() => import('./markdown/MarkdownRenderer'))

const TIER_HEADINGS = [
  { label: 'Beginner', id: 'beginner-level' },
  { label: 'Intermediate', id: 'intermediate-level' },
  { label: 'Expert', id: 'expert-level' }
]

const DESKTOP_TOC_QUERY = '(min-width: 1024px)'

function prefersExpandedToc() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true
  return window.matchMedia(DESKTOP_TOC_QUERY).matches
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getSections(content) {
  return [...content.matchAll(/^## (?!#)(.+)$/gm)]
    .map(([, title]) => ({ title, id: slugify(title) }))
}

function cleanSectionTitle(title) {
  return title.replace(/^(?:🟢|🟡|🔴)\s*/u, '')
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

export default function TopicViewer({ topicId, category }) {
  const [content, setContent] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('')
  const [readingProgress, setReadingProgress] = useState(0)
  const [tocExpanded, setTocExpanded] = useState(prefersExpandedToc)

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
    setNotFound(false)
    setActiveSection('')
    setReadingProgress(0)
    const cat = category || getTopicCategory(topicId)

    fetch(`/api/v1/content/${cat}/${topicId}`)
      .then(res => {
        if (!res.ok) throw new Error('Not found')
        return res.text()
      })
      .then(text => {
        setContent(text)
        setActiveSection(getSections(text)[0]?.id || '')
        setLoading(false)
      })
      .catch(() => {
        setNotFound(true)
        setLoading(false)
      })
  }, [topicId, category])

  useEffect(() => {
    if (!content || typeof IntersectionObserver === 'undefined') return undefined
    const sectionIds = getSections(content).map(section => section.id)
    const observer = new IntersectionObserver(
      entries => {
        const visible = entries.find(entry => entry.isIntersecting)
        if (visible) setActiveSection(visible.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    sectionIds.forEach(id => {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    })
    return () => observer.disconnect()
  }, [content])

  useEffect(() => {
    const updateProgress = () => {
      const documentHeight = document.documentElement.scrollHeight - window.innerHeight
      setReadingProgress(documentHeight > 0 ? Math.min(100, Math.round((window.scrollY / documentHeight) * 100)) : 0)
    }
    updateProgress()
    window.addEventListener('scroll', updateProgress, { passive: true })
    return () => window.removeEventListener('scroll', updateProgress)
  }, [content])

  const questions = useMemo(() => parseInterviewQuestions(content, topicId), [content, topicId])

  if (loading) {
    return (
      <div className="reader-loading" role="status" aria-label="Loading topic">
        <p>Loading topic…</p>
        <span /><span /><span />
      </div>
    )
  }

  if (notFound) return <div className="topic-content"><p>Content not available yet.</p></div>

  const sections = getSections(content)
  const currentSection = sections.find(section => section.id === activeSection) || sections[0]
  const currentLabel = currentSection ? cleanSectionTitle(currentSection.title) : 'the first section'

  return (
    <div className="study-layout">
      <aside className="study-navigation" aria-label="Study navigation">
        <div className="reading-progress-label"><p className="study-eyebrow">On this page</p><span>{readingProgress}% read</span></div>
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
          {tocExpanded ? 'Hide table of contents' : 'Show table of contents'}
        </button>
        <nav id="topic-table-of-contents" aria-label="Table of contents" hidden={!tocExpanded}>
          <ol>
            {sections.map(section => (
              <li key={section.id}>
                <button
                  type="button"
                  onClick={() => scrollToSection(section.id)}
                  className={activeSection === section.id ? 'active' : ''}
                  aria-current={activeSection === section.id ? 'location' : undefined}
                  aria-label={`Read ${cleanSectionTitle(section.title)}`}
                >
                  {cleanSectionTitle(section.title)}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <div className="study-main">
        <section className="reader-orientation" aria-labelledby="reader-orientation-title">
          <p className="study-eyebrow">Study guide</p>
          <h2 id="reader-orientation-title">Read in three passes</h2>
          <p>Start with the mental model, build the mechanism, then use the expert section to test trade-offs and interview reasoning.</p>
          {currentSection && (
            <button
              type="button"
              className="continue-reading"
              onClick={() => scrollToSection(currentSection.id)}
              aria-label={`Continue reading at ${currentLabel}`}
            >
              Continue: {currentLabel}
            </button>
          )}
        </section>
        <nav className="tier-navigation" aria-label="Jump to learning level">
          {TIER_HEADINGS.map(tier => (
            <button
              type="button"
              key={tier.id}
              onClick={() => scrollToSection(tier.id)}
              aria-label={`Jump to ${tier.label} level`}
              aria-current={activeSection === tier.id ? 'location' : undefined}
            >
              {tier.label}
            </button>
          ))}
        </nav>
        <div className="topic-content">
          <Suspense fallback={(
            <div className="reader-loading reader-loading--renderer" role="status">
              <p>Preparing reader…</p>
              <span /><span /><span />
            </div>
          )}>
            <MarkdownRenderer content={content} />
          </Suspense>
        </div>
        <InterviewDeck key={topicId} questions={questions} />
      </div>
    </div>
  )
}
