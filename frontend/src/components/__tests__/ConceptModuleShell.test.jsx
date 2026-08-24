import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import ConceptModuleShell from '../shared/ConceptModuleShell'
import QuizCard from '../shared/QuizCard'

const theoryData = {
  failureModes: ['Plain string failure', { mode: 'Structured failure mode' }],
  tradeOffs: [
    {
      aspect: 'Force vs No-force',
      optionA: 'Option A text',
      optionB: 'Option B text'
    }
  ],
  interviewQA: [
    { question: 'What is WAL?', answer: 'Log before data pages.' }
  ]
}

const mcqQuiz = [
  {
    question: 'Which protocol guarantees durability?',
    options: ['Heap files', 'WAL', 'Bitmaps'],
    correct: 1,
    explanation: 'Commit records are flushed before dirty pages.'
  }
]

describe('ConceptModuleShell theory tab normalization', () => {
  it('renders interviewQA written with question/answer keys and structured trade-offs', () => {
    render(
      <ConceptModuleShell
        title="Shell Test"
        theoryData={theoryData}
        quizData={mcqQuiz}
      />
    )
    fireEvent.click(screen.getByText(/Deep Dive & Interview Theory/i))
    expect(screen.getByText(/What is WAL\?/i)).toBeDefined()
    expect(screen.getByText(/Log before data pages\./i)).toBeDefined()
    expect(screen.getByText(/Force vs No-force/i)).toBeDefined()
    expect(screen.getByText(/Option A text/i)).toBeDefined()
    expect(screen.getByText(/Plain string failure/i)).toBeDefined()
    expect(screen.getByText(/Structured failure mode/i)).toBeDefined()
  })
})

describe('QuizCard multiple choice support', () => {
  it('reveals correctness and explanation after selecting an option', () => {
    render(<QuizCard {...mcqQuiz[0]} />)
    fireEvent.click(screen.getByRole('button', { name: 'B. WAL' }))
    expect(screen.getAllByText(/✅/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Commit records are flushed before dirty pages\./i)).toBeDefined()
  })

  it('marks a wrong selection and still shows the explanation', () => {
    render(<QuizCard {...mcqQuiz[0]} />)
    fireEvent.click(screen.getByRole('button', { name: 'A. Heap files' }))
    expect(screen.getAllByText(/❌/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Commit records are flushed before dirty pages\./i)).toBeDefined()
  })

  it('supports correctAnswer letter keys used by older concept JSONs', () => {
    render(
      <QuizCard
        question="Pick C"
        options={['One', 'Two', 'Three']}
        correctAnswer="C"
        explanation="Letter mapping works."
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'C. Three' }))
    expect(screen.getAllByText(/✅/).length).toBeGreaterThanOrEqual(1)
  })

  it('falls back to reveal-answer flow for free-text questions', () => {
    render(<QuizCard question="Free text?" answer="Because." />)
    const reveal = screen.getByText(/Reveal Answer/i)
    fireEvent.click(reveal)
    expect(screen.getByText(/Because\./i)).toBeDefined()
  })
})
