import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../HomePage'
import { fetchTopics } from '../../utils/api'

vi.mock('../../utils/api', () => ({
  fetchTopics: vi.fn()
}))

const topics = [
  { id: 'java-oop-pillars', category: 'java-spring', title: 'OOP Pillars', level: 'beginner', summary: 'Encapsulation, inheritance, and polymorphism.' },
  { id: 'deadlocks', category: 'os', title: 'Deadlocks', level: 'intermediate', summary: 'Prevention, detection, and recovery.' },
  { id: 'osi-model', category: 'networking', title: 'OSI & TCP/IP Reference Models', level: 'beginner', summary: 'Layers, addressing, and encapsulation.' },
  { id: 'transactions-acid', category: 'dbms', title: 'Transactions', level: 'intermediate', summary: 'ACID, recovery, and isolation.' },
  { id: 'rag-architecture', category: 'aiml', title: 'RAG Architecture', level: 'expert', summary: 'Retrieval and grounded generation.' }
]

function renderPage() {
  return render(
    <BrowserRouter>
      <HomePage />
    </BrowserRouter>
  )
}

describe('HomePage', () => {
  beforeEach(() => {
    vi.mocked(fetchTopics).mockResolvedValue(topics)
  })

  it('renders the prioritized roadmap with semantic category controls', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: 'CS Fundamentals Roadmap' })).toBeInTheDocument()
    await screen.findByText('OOP Pillars')
    expect(screen.getByRole('navigation', { name: 'Curriculum categories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Full roadmap' })).toHaveAttribute('aria-pressed', 'true')

    const headings = screen.getAllByRole('heading', { level: 2 }).map(heading => heading.textContent)
    expect(headings).toEqual(expect.arrayContaining([
      '1. Java & Spring',
      '2. Operating Systems',
      '3. Computer Networks',
      '4. DBMS',
      '5. AI/ML Systems'
    ]))
  })

  it('filters a category, reports its count, and preserves the study link', async () => {
    const user = userEvent.setup()
    renderPage()

    await screen.findByText('OOP Pillars')
    const osButton = screen.getByRole('button', { name: 'Operating Systems' })
    await user.click(osButton)

    expect(osButton).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('heading', { name: 'Operating Systems' })).toBeInTheDocument()
    expect(screen.getByText(/1 topics in this path/i)).toBeInTheDocument()
    expect(screen.getByText('Deadlocks')).toBeInTheDocument()
    expect(screen.queryByText('OOP Pillars')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study Deadlocks' })).toHaveAttribute('href', '/topic/deadlocks')
  })

  it('renders the level badge and ordered topic row', async () => {
    renderPage()

    await screen.findByText('OOP Pillars')
    expect(screen.getByText('Beginner')).toBeInTheDocument()
    expect(screen.getByText('01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study OOP Pillars' })).toHaveAttribute('href', '/topic/java-oop-pillars')
  })
})
