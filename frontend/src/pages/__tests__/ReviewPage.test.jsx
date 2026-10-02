import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ReviewPage from '../ReviewPage'
import { savePractice, recordPracticeAttempt, readLearning, resetLearningStoreForTests } from '../../utils/learningState'
import { parseInterviewQuestions } from '../../utils/interviewQuestions'

vi.mock('../../hooks/useCatalog', () => ({ default: () => catalog }))
vi.mock('../../components/markdown/MarkdownRenderer', () => ({ default: ({ content }) => <div>{content}</div> }))
const catalog = { topics: [{ id: 'sample', title: 'Sample lesson', category: 'os' }], status: 'ready', retry: vi.fn() }
const lesson = '### Interview Questions\n\n**Q1. What is memory?** `[easy]`\n\nOne answer.\n\n**Q2. Why wait?** `[medium]`\n\nAnother answer.'
const questions = parseInterviewQuestions(lesson, 'sample').map(question => ({ ...question, topicId: 'sample' }))
beforeEach(() => {
  localStorage.clear(); resetLearningStoreForTests()
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => lesson })))
})
afterEach(() => vi.unstubAllGlobals())
function mount() { return render(<MemoryRouter><ReviewPage /></MemoryRouter>) }
function due(question) {
  savePractice(question, { draft: 'Before', assessment: 'review' })
  recordPracticeAttempt(question, false, 1)
}

it('loads the exact selected question from its canonical lesson and keeps the session fixed after recording', async () => {
  due(questions[1]); mount()
  await screen.findByRole('heading', { name: 'Explain and compare' })
  expect(screen.getByText('Q2. Why wait?')).toBeInTheDocument()
  expect(fetch).toHaveBeenCalledWith('/api/v1/content/os/sample', expect.objectContaining({ signal: expect.any(AbortSignal) }))
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'New reasoning' } })
  fireEvent.click(screen.getByRole('button', { name: 'Recalled confidently' }))
  fireEvent.click(screen.getByRole('button', { name: 'Record this attempt' }))
  expect(screen.getByText('Q2. Why wait?')).toBeInTheDocument()
  expect(screen.getByText('1 of 1 questions recorded in this session.')).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Finish this session' }))
  expect(screen.getByRole('heading', { name: 'Session finished' })).toBeInTheDocument()
  expect(screen.getByText(/1 of 1 questions have a recorded attempt/)).toBeInTheDocument()
})

it('retries the frozen selection rather than substituting another question and preserves saved explanations', async () => {
  due(questions[1]); fetch.mockRejectedValueOnce(new Error('offline')); mount()
  await screen.findByRole('button', { name: 'Retry selected questions' })
  expect(readLearning().practice['sample:Why wait?'].draft).toBe('Before')
  due(questions[0])
  fireEvent.click(screen.getByRole('button', { name: 'Retry selected questions' }))
  await screen.findByText('Q2. Why wait?')
  expect(screen.getByText('1 / 1')).toBeInTheDocument()
  expect(screen.queryByText('Q1. What is memory?')).not.toBeInTheDocument()
})

it('explains an empty session and cancels a pending lesson fetch when leaving', async () => {
  const empty = mount()
  await screen.findByText(/No questions are ready/)
  expect(fetch).not.toHaveBeenCalled()
  empty.unmount()
  due(questions[0]); fetch.mockImplementation(() => new Promise(() => {}))
  const pending = mount()
  await waitFor(() => expect(fetch).toHaveBeenCalledTimes(1))
  const signal = fetch.mock.calls[0][1].signal
  pending.unmount()
  expect(signal.aborted).toBe(true)
})
