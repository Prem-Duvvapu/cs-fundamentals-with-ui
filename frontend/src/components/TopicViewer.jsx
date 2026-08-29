import { useState, useEffect, lazy, Suspense } from 'react'

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

const CATEGORY_MAP = {
  'process-management': 'os', 'memory-management': 'os', 'cpu-scheduling': 'os', 'synchronization': 'os', 'deadlocks': 'os', 'file-systems': 'os', 'io-systems': 'os', 'disk-scheduling': 'os',
  'network-fundamentals': 'networking', 'physical-layer-media': 'networking', 'osi-model': 'networking', 'data-link-layer': 'networking', 'ip-subnetting': 'networking', 'routing-algorithms': 'networking', 'tcp-ip': 'networking', 'tcp-congestion': 'networking', 'transport-layer-protocols': 'networking', 'application-layer': 'networking', 'network-security': 'networking', 'network-performance-qos': 'networking',
  'dbms-introduction': 'dbms', 'dbms-architecture': 'dbms', 'er-model': 'dbms', 'relational-algebra-calculus': 'dbms', 'functional-dependencies-keys': 'dbms', 'database-normalization': 'dbms', 'dbms-indexing': 'dbms', 'storage-raid-indexing': 'dbms', 'transactions-acid': 'dbms', 'concurrency-control': 'dbms', 'query-optimization': 'dbms', 'distributed-databases-cap': 'dbms',
  'embeddings-vector-db': 'aiml', 'rag-architecture': 'aiml', 'model-serving': 'aiml', 'llm-parameters': 'aiml', 'feature-stores': 'aiml', 'recommendation-systems': 'aiml',
  'java-execution-pipeline': 'java-spring', 'java-memory-model': 'java-spring', 'java-oop-pillars': 'java-spring', 'java-static-final-records': 'java-spring', 'java-functional-lambdas': 'java-spring', 'java-generics': 'java-spring', 'java-collections-framework': 'java-spring', 'java-hashmap-internals': 'java-spring', 'java-streams-optional': 'java-spring', 'java-reflection-exceptions': 'java-spring', 'java-multithreading-concurrency': 'java-spring', 'jvm-gc': 'java-spring', 'spring-bean-lifecycle': 'java-spring', 'spring-mvc-lifecycle': 'java-spring', 'jpa-hibernate-lifecycle': 'java-spring', 'spring-batch-lifecycle': 'java-spring', 'quartz-scheduler': 'java-spring', 'design-patterns-solid': 'java-spring'
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
    const cat = category || CATEGORY_MAP[topicId] || 'os'

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

  if (loading) return <div className="topic-content"><p>Loading...</p></div>

  if (notFound) return <div className="topic-content"><p>Content not available yet.</p></div>

  const sections = getSections(content)
  const questions = getQuestions(content)
  const currentSection = sections.find(section => section.id === activeSection) || sections[0]
  const currentLabel = currentSection?.title.replace(/^[🟢🟡🔴]\s*/, '') || 'the first section'

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
                    aria-label={`Read ${section.title.replace(/^[🟢🟡🔴]\s*/, '')}`}
                  >
                    {section.title.replace(/^[🟢🟡🔴]\s*/, '')}
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
          <Suspense fallback={<p>Loading...</p>}>
            <MarkdownRenderer content={content} />
          </Suspense>
        </div>
        <InterviewDeck questions={questions} />
      </div>
    </div>
  )
}
