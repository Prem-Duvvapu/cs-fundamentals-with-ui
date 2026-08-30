import { useState, useEffect, lazy, Suspense } from 'react'
import { getTopicCategory } from '../utils/topicCategories'

// react-markdown + KaTeX + highlight.js are ~600KB and are only needed once
// a topic's content is actually being read, so they get their own chunk
// rather than loading with the app shell.
const MarkdownRenderer = lazy(() => import('./markdown/MarkdownRenderer'))

const TIER_HEADINGS = [
  { label: 'Beginner', id: 'beginner-level' },
  { label: 'Intermediate', id: 'intermediate-level' },
  { label: 'Expert', id: 'expert-level' }
]

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

function getSections(content) {
  return [...content.matchAll(/^## (?!#)(.+)$/gm)]
    .map(([, title]) => ({ title, id: slugify(title) }))
}

function getQuestions(content) {
  const questionPattern = /(?:^|\n)\*\*(Q\d+\. .+?)\*\*\s*`?\[(easy|medium|hard)\]`?\s*\n+([\s\S]*?)(?=\n\*\*Q\d+\.|$)/g
  return [...content.matchAll(questionPattern)].map(([, question, difficulty, answer]) => ({
    question,
    difficulty,
    answer: answer.trim()
  }))
}

function cleanSectionTitle(title) {
  return title.replace(/^(?:🟢|🟡|🔴)\s*/u, '')
}

function scrollToSection(id) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function InterviewDeck({ questions }) {
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)

  if (questions.length === 0) return null
  const current = questions[index]
  const move = (nextIndex) => {
    setIndex(nextIndex)
    setRevealed(false)
  }

  return (
    <section className="interview-deck" aria-labelledby="interview-practice-title">
      <div className="interview-deck-heading">
        <div>
          <p className="study-eyebrow">Interview practice</p>
          <h2 id="interview-practice-title">Test your recall</h2>
        </div>
        <span>{index + 1} / {questions.length}</span>
      </div>
      <p className="interview-question"><strong>{current.question}</strong> <code>[{current.difficulty}]</code></p>
      {revealed && <p className="interview-answer">{current.answer}</p>}
      <div className="interview-deck-actions">
        <button type="button" onClick={() => setRevealed(value => !value)}>{revealed ? 'Hide answer' : 'Reveal answer'}</button>
        <button type="button" onClick={() => move(Math.max(0, index - 1))} disabled={index === 0}>Previous</button>
        <button type="button" onClick={() => move(Math.min(questions.length - 1, index + 1))} disabled={index === questions.length - 1}>Next</button>
      </div>
    </section>
  )
}

export default function TopicViewer({ topicId, category }) {
  const [content, setContent] = useState('')
  const [notFound, setNotFound] = useState(false)
  const [loading, setLoading] = useState(true)
  const [activeSection, setActiveSection] = useState('')
  const [readingProgress, setReadingProgress] = useState(0)
  const [tocExpanded, setTocExpanded] = useState(true)

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
  const questions = getQuestions(content)
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
        {tocExpanded && (
          <nav id="topic-table-of-contents" aria-label="Table of contents">
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
        )}
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
        <InterviewDeck questions={questions} />
      </div>
    </div>
  )
}
