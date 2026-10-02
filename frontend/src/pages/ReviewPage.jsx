import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useCatalog from '../hooks/useCatalog'
import useLearningState from '../hooks/useLearningState'
import InterviewDeck from '../components/shared/InterviewDeck'
import { parseInterviewQuestions } from '../utils/interviewQuestions'
import { questionKey, readLearning } from '../utils/learningState'
import { reviewCandidates } from '../utils/reviewSchedule'

export default function ReviewPage() {
  const { topics, status: catalogStatus, retry } = useCatalog()
  const { state, durable } = useLearningState()
  const [mixed, setMixed] = useState(true)
  const [selection, setSelection] = useState(() => reviewCandidates(readLearning()))
  const [startedAt, setStartedAt] = useState(Date.now)
  const [questions, setQuestions] = useState([])
  const [unavailable, setUnavailable] = useState([])
  const [status, setStatus] = useState('loading')
  const [ended, setEnded] = useState(false)
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    if (catalogStatus !== 'ready') return undefined
    const abort = new AbortController()
    setStatus('loading')
    const selectedTopics = [...new Set(selection.map(item => item.key.slice(0, item.key.indexOf(':'))))]
    Promise.allSettled(selectedTopics.map(async id => {
      const topic = topics.find(item => item.id === id)
      if (!topic) return []
      const response = await fetch(`/api/v1/content/${topic.category}/${topic.id}`, { signal: abort.signal })
      if (!response.ok) throw new Error('Lesson could not be loaded.')
      return parseInterviewQuestions(await response.text(), topic.id).map(question => ({ ...question, topicId: id, topicTitle: topic.title }))
    })).then(results => {
      if (abort.signal.aborted) return
      const loaded = results.flatMap(result => result.status === 'fulfilled' ? result.value : [])
      const matched = selection.map(item => loaded.find(question => questionKey(question) === item.key)).filter(Boolean)
      setQuestions(matched)
      setUnavailable(selection.filter(item => !matched.some(question => questionKey(question) === item.key)))
      setStatus('ready')
    })
    return () => abort.abort()
  }, [topics, catalogStatus, selection, loadAttempt])

  const recorded = questions.filter(question => state.reviews[questionKey(question)]?.attempts.some(attempt => attempt.at >= startedAt))
  const rebuild = () => {
    setSelection(reviewCandidates(state, Date.now(), mixed))
    setStartedAt(Date.now())
    setEnded(false)
  }

  return <div className="progress-page roadmap-index">
    <header className="roadmap-header"><p className="eyebrow">Optional recall practice</p><h1>Review session</h1>
      <p>Up to eight questions. Due items come first; you can mix previously recalled answers. Explain each idea before opening its answer, choose your own rating, then record the attempt.</p>
      <p>Dates are suggestions with no streak penalty. Your ratings are not automatic scores or interview-readiness measurements.</p>
      <label><input type="checkbox" checked={mixed} onChange={event => setMixed(event.target.checked)} /> Mix previously recalled answers</label>
      <div className="saved-answer-actions"><button type="button" onClick={rebuild}>Build a new session</button><Link to="/progress">Saved answers and backup</Link></div>
    </header>
    {!durable && <p role="alert">Storage is unavailable. Export your learning data before closing this tab.</p>}
    {catalogStatus === 'error' && <div role="alert"><p>Could not load the lesson catalog.</p><button onClick={retry}>Retry catalog</button></div>}
    {(catalogStatus === 'loading' || status === 'loading') && catalogStatus !== 'error' && <p role="status">Loading selected questions…</p>}
    {status === 'ready' && <>
      {unavailable.length > 0 && <div role="alert"><p>{unavailable.length} selected question(s) could not be matched or loaded. Your drafts and history are still saved. Retry or open Saved answers.</p><button onClick={() => setLoadAttempt(value => value + 1)}>Retry selected questions</button></div>}
      {questions.length === 0 ? <p>No questions are ready in this selection. Record an attempt in <Link to="/interview/all">Interview Mode</Link>, or practise a saved answer from <Link to="/progress">Progress</Link>.</p> : <>
        <section className="category-overview"><h2>Why these questions?</h2><ul>{selection.filter(item => questions.some(question => questionKey(question) === item.key)).map(item => <li key={item.key}>{item.key.slice(item.key.indexOf(':') + 1)} — {item.reason}</li>)}</ul></section>
        {ended ? <section className="category-overview"><h2>Session finished</h2><p>{recorded.length} of {questions.length} questions have a recorded attempt from this session. Earlier drafts remain available; review dates use your self-assessments.</p><Link to="/progress">Return to Progress</Link></section> : <>
          <p role="status">{recorded.length} of {questions.length} questions recorded in this session.</p>
          <InterviewDeck key={`${startedAt}:${selection.map(item => item.key).join('|')}`} questions={questions} requestedKey={questionKey(questions[0])} heading="Explain and compare" renderMeta={question => <Link to={`/topic/${question.topicId}?view=practice&question=${encodeURIComponent(questionKey(question))}`}>{question.topicTitle}</Link>} />
          <button type="button" onClick={() => setEnded(true)}>Finish this session</button>
        </>}
      </>}
    </>}
  </div>
}
