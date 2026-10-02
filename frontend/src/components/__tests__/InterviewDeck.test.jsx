import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import InterviewDeck from '../shared/InterviewDeck'
import { beforeEach } from 'vitest'
import { readLearning, resetLearningStoreForTests, questionKey } from '../../utils/learningState'

// The real Markdown pipeline is exercised exhaustively by
// TopicViewer.markdown.test.jsx. Keep this deck-level suite focused on reveal,
// navigation and accessibility behavior without waiting for a lazy dynamic import.
vi.mock('../markdown/MarkdownRenderer', () => ({
  default: ({ content }) => <div data-testid="markdown-content">{content}</div>
}))

const QUESTIONS = [
  { id: 'q1', question: 'Q1. What is a page fault?', difficulty: 'easy', answerMarkdown: 'A **trap** into the kernel.' },
  { id: 'q2', question: 'Q2. What is thrashing?', difficulty: 'hard', answerMarkdown: 'Excessive paging activity.' }
]

beforeEach(() => { localStorage.clear(); resetLearningStoreForTests() })

describe('InterviewDeck', () => {
  it('renders nothing for an empty question list', () => {
    const { container } = render(<InterviewDeck questions={[]} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows the first question, position counter, and default heading/eyebrow', () => {
    render(<InterviewDeck questions={QUESTIONS} />)
    expect(screen.getByText('Interview practice')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Test your recall' })).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText(/What is a page fault\?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /previous/i })).toBeDisabled()
  })

  it('accepts a custom eyebrow and heading', () => {
    render(<InterviewDeck questions={QUESTIONS} eyebrow="DBMS practice" heading="Interview Mode" />)
    expect(screen.getByText('DBMS practice')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Interview Mode' })).toBeInTheDocument()
  })

  it('reveals the answer as Markdown and toggles aria-expanded', async () => {
    render(<InterviewDeck questions={QUESTIONS} />)
    const reveal = screen.getByRole('button', { name: /reveal answer/i })
    expect(reveal).toHaveAttribute('aria-expanded', 'false')

    fireEvent.click(reveal)
    expect(reveal).toHaveAttribute('aria-expanded', 'true')

    const answer = document.getElementById(reveal.getAttribute('aria-controls'))
    await waitFor(() => expect(answer).toHaveTextContent('trap'))
    expect(answer.querySelector('[data-testid="markdown-content"]')).toHaveTextContent('A **trap** into the kernel.')
    expect(screen.getByRole('button', { name: /hide answer/i })).toBeInTheDocument()
    fireEvent.click(screen.getByText('How to compare your answer'))
    expect(screen.getByText(/mechanism or sequence/)).toBeInTheDocument()
  })

  it('shows authored checks after the model answer without counting them as the answer', async () => {
    const answer = 'The concise answer.\n\n**Answer rubric**\n- **Say it:** State the contract.\n- **Mechanism:** Explain the sequence.\n- **Example:** Give a backend request.\n- **Limit:** Name a trade-off.\n- **Watch for:** Avoid a common mistake.\n- **Follow-up:** What changes at scale?'
    render(<InterviewDeck questions={[{ ...QUESTIONS[0], answerMarkdown: answer }]} />)
    fireEvent.click(screen.getByRole('button', { name: /reveal answer/i }))
    await waitFor(() => expect(screen.getAllByTestId('markdown-content')).toHaveLength(2))
    expect(screen.getAllByTestId('markdown-content')[0]).toHaveTextContent('The concise answer.')
    expect(screen.getAllByTestId('markdown-content')[0]).not.toHaveTextContent('Answer rubric')
    fireEvent.click(screen.getByText('Answer checklist and follow-up'))
    expect(screen.getAllByTestId('markdown-content')[1]).toHaveTextContent('State the contract.')
    expect(screen.getAllByTestId('markdown-content')[1]).toHaveTextContent('What changes at scale?')
  })

  it('steps forward, resets reveal state, and disables Next on the last card', () => {
    render(<InterviewDeck questions={QUESTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /reveal answer/i }))
    fireEvent.click(screen.getByRole('button', { name: /next/i }))

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(screen.getByText(/What is thrashing\?/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reveal answer/i })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: /next/i })).toBeDisabled()
  })

  it('does not lose position when the same-keyed questions array is replaced (e.g. pagination)', () => {
    const { rerender } = render(<InterviewDeck questions={QUESTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    // A new array reference with the same content, no key change — mirrors how
    // InterviewPage appends a "Load more" page without disturbing the reader's position.
    rerender(<InterviewDeck questions={[...QUESTIONS]} />)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('explains when the selected question is no longer loaded instead of silently replacing it', () => {
    const { rerender } = render(<InterviewDeck questions={QUESTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    rerender(<InterviewDeck questions={[QUESTIONS[0]]} />)
    expect(screen.getByText(/saved question is not among/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Start from the first question' }))
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
  })

  it('resumes a question after its later page loads', async () => {
    const laterKey = questionKey(QUESTIONS[1])
    const onFindSavedQuestion = vi.fn(async () => true)
    const { rerender } = render(<InterviewDeck questions={[QUESTIONS[0]]} requestedKey={laterKey} onFindSavedQuestion={onFindSavedQuestion} />)
    expect(screen.getByText(/saved question is not among/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Find saved question' }))
    expect(onFindSavedQuestion).toHaveBeenCalledWith(laterKey)
    rerender(<InterviewDeck questions={QUESTIONS} requestedKey={laterKey} onFindSavedQuestion={onFindSavedQuestion} />)
    expect(screen.getByText('2 / 2')).toBeInTheDocument()
  })

  it('a new key starts a fresh deck at question 1 with the answer hidden', () => {
    const { rerender } = render(<InterviewDeck key="deck-a" questions={QUESTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    fireEvent.click(screen.getByRole('button', { name: /reveal answer/i }))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    const otherQuestions = [{ id: 'q3', question: 'Q1. Different deck', difficulty: 'medium', answerMarkdown: 'Answer.' }]
    rerender(<InterviewDeck key="deck-b" questions={otherQuestions} />)
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
    expect(screen.getByText(/Different deck/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reveal answer/i })).toHaveAttribute('aria-expanded', 'false')
  })

  it('renders optional per-question meta via renderMeta', () => {
    render(
      <InterviewDeck
        questions={QUESTIONS}
        renderMeta={question => <span>Source: {question.id}</span>}
      />
    )
    expect(screen.getByText('Source: q1')).toBeInTheDocument()
  })
})

it('records an unassisted explanation and preserves answer-opening evidence after hiding', () => {
  render(<InterviewDeck questions={QUESTIONS} />)
  fireEvent.change(screen.getByRole('textbox'), { target: { value: 'My explanation before the answer.' } })
  fireEvent.click(screen.getByRole('button', { name: 'Partly recalled' }))
  fireEvent.click(screen.getByRole('button', { name: 'Record this attempt' }))
  const key = questionKey(QUESTIONS[0])
  expect(readLearning().reviews[key].attempts[0]).toMatchObject({ answerViewed: false, draft: 'My explanation before the answer.' })
  fireEvent.click(screen.getByRole('button', { name: 'Reveal answer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Hide answer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Record this attempt' }))
  expect(readLearning().reviews[key].attempts[1].answerViewed).toBe(true)
  fireEvent.click(screen.getByRole('button', { name: 'Next' }))
  fireEvent.click(screen.getByRole('button', { name: 'Needs review' }))
  fireEvent.click(screen.getByRole('button', { name: 'Record this attempt' }))
  expect(readLearning().reviews[questionKey(QUESTIONS[1])].attempts[0].answerViewed).toBe(false)
})
