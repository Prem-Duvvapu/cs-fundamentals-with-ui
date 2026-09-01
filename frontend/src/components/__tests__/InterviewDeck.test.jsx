import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import InterviewDeck from '../shared/InterviewDeck'

const QUESTIONS = [
  { id: 'q1', question: 'Q1. What is a page fault?', difficulty: 'easy', answerMarkdown: 'A **trap** into the kernel.' },
  { id: 'q2', question: 'Q2. What is thrashing?', difficulty: 'hard', answerMarkdown: 'Excessive paging activity.' }
]

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
    await waitFor(() => expect(answer).toHaveTextContent('trap'), { timeout: 15000 })
    expect(answer.querySelector('strong')).toHaveTextContent('trap')
    expect(screen.getByRole('button', { name: /hide answer/i })).toBeInTheDocument()
  }, 15000)

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

  it('clamps the index defensively if a same-keyed list shrinks past the current position', () => {
    const { rerender } = render(<InterviewDeck questions={QUESTIONS} />)
    fireEvent.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('2 / 2')).toBeInTheDocument()

    rerender(<InterviewDeck questions={[QUESTIONS[0]]} />)
    expect(screen.getByText('1 / 1')).toBeInTheDocument()
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
