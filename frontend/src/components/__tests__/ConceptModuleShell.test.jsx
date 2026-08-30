import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import CodePanel from '../shared/CodePanel'
import ConceptModuleShell from '../shared/ConceptModuleShell'
import QuizCard from '../shared/QuizCard'
import StateInspector from '../shared/StateInspector'

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
    fireEvent.click(screen.getByRole('tab', { name: /theory/i }))
    expect(screen.getByText(/What is WAL\?/i)).toBeDefined()
    expect(screen.getByText(/Log before data pages\./i)).toBeDefined()
    expect(screen.getByText(/Force vs No-force/i)).toBeDefined()
    expect(screen.getByText(/Option A text/i)).toBeDefined()
    expect(screen.getByText(/Plain string failure/i)).toBeDefined()
    expect(screen.getByText(/Structured failure mode/i)).toBeDefined()
  })

  it('exposes an operable tablist with linked tab panels', () => {
    render(
      <ConceptModuleShell title="Accessible Shell" theoryData={theoryData} quizData={mcqQuiz}>
        Simulation content
      </ConceptModuleShell>
    )

    const tabs = screen.getAllByRole('tab')
    expect(screen.getByRole('tablist', { name: /accessible shell learning modes/i })).toBeDefined()
    expect(tabs[0].getAttribute('aria-selected')).toBe('true')
    expect(tabs[0].getAttribute('aria-controls')).toBe(screen.getByRole('tabpanel').id)

    fireEvent.keyDown(tabs[0], { key: 'ArrowRight' })
    expect(screen.getByRole('tab', { name: /theory/i }).getAttribute('aria-selected')).toBe('true')
    expect(screen.getByRole('tabpanel').getAttribute('aria-labelledby')).toBe(
      screen.getByRole('tab', { name: /theory/i }).id
    )
  })
})

describe('QuizCard multiple choice support', () => {
  it('reveals correctness and explanation after selecting an option', () => {
    render(<QuizCard {...mcqQuiz[0]} />)
    fireEvent.click(screen.getByRole('button', { name: 'B. WAL' }))
    expect(screen.getAllByLabelText('Correct').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Correct')).toBeDefined()
    expect(screen.getByText(/Commit records are flushed before dirty pages\./i)).toBeDefined()
  })

  it('marks a wrong selection and still shows the explanation', () => {
    render(<QuizCard {...mcqQuiz[0]} />)
    fireEvent.click(screen.getByRole('button', { name: 'A. Heap files' }))
    expect(screen.getByLabelText('Incorrect')).toBeDefined()
    expect(screen.getByText('Not quite')).toBeDefined()
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
    expect(screen.getByLabelText('Correct')).toBeDefined()
  })

  it('falls back to reveal-answer flow for free-text questions', () => {
    render(<QuizCard question="Free text?" answer="Because." />)
    const reveal = screen.getByText(/Reveal Answer/i)
    fireEvent.click(reveal)
    expect(screen.getByText(/Because\./i)).toBeDefined()
  })

  it('maps named difficulties to semantic pill classes with a non-color glyph', () => {
    const { container } = render(<QuizCard question="Advanced?" answer="Yes." difficulty="Hard" />)
    const pill = container.querySelector('.u-pill-danger')
    expect(pill).not.toBeNull()
    expect(pill.textContent).toContain('✗')
  })
})

describe('shared simulation accessibility', () => {
  it('announces the highlighted state value and marks the tile structurally', () => {
    const { container } = render(
      <StateInspector data={{ queueDepth: 4, status: 'ready' }} highlightKey="queueDepth" />
    )

    expect(screen.getByRole('status').textContent).toMatch(/queue depth changed to 4/i)
    expect(container.querySelector('.metric-tile.is-highlighted')).not.toBeNull()
  })

  it('labels code by title and language and exposes class-based active lines', () => {
    const { container } = render(
      <CodePanel title="Example" language="java" code={'one\ntwo'} activeLine={2} />
    )

    expect(screen.getByRole('region', { name: /example, java code/i })).toBeDefined()
    expect(container.querySelector('.code-panel-line.is-active')?.textContent).toContain('two')
    expect(container.querySelector('.code-panel-body').className).toContain('code-panel-body')
  })
})
