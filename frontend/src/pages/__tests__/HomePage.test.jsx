import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
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
    expect(screen.getByRole('button', { name: 'Full roadmap, 5 topics' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Java & Spring, 1 topic' })).toHaveTextContent('◐JAVA· 1')
    expect(screen.getByRole('list', { name: 'Java & Spring topics' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: '1. Java & Spring' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Operating Systems' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Computer Networks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '4. DBMS' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. AI/ML Systems' })).toBeInTheDocument()
  })

  it('filters a category, reports its count, and preserves the study link', async () => {
    renderPage()

    await screen.findByText('OOP Pillars')
    const osButton = screen.getByRole('button', { name: 'Operating Systems, 1 topic' })
    fireEvent.click(osButton)

    expect(osButton).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('os-heading')).toHaveTextContent('◆ Operating Systems')
    expect(screen.getByText(/1 topic in this path/i)).toBeInTheDocument()
    expect(screen.getByText('Deadlocks')).toBeInTheDocument()
    expect(screen.queryByText('OOP Pillars')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study Deadlocks' })).toHaveAttribute('href', '/topic/deadlocks')
  })

  it('renders the level badge and ordered topic row', async () => {
    renderPage()

    await screen.findByText('OOP Pillars')
    const oopRow = screen.getByRole('link', { name: 'Study OOP Pillars' }).closest('li')
    expect(within(oopRow).getByLabelText('Beginner level')).toHaveTextContent('●Beginner')
    expect(within(oopRow).getByText('01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study OOP Pillars' })).toHaveAttribute('href', '/topic/java-oop-pillars')
  })

  it('combines category and level filters and exposes an accessible empty state', async () => {
    renderPage()

    await screen.findByText('OOP Pillars')
    fireEvent.click(screen.getByRole('button', { name: 'Operating Systems, 1 topic' }))
    fireEvent.click(screen.getByRole('button', { name: 'Expert' }))

    expect(screen.getByRole('button', { name: 'Expert' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('status', { name: 'No topics match these filters' })).toBeInTheDocument()
    expect(screen.queryByText('Deadlocks')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Show all topics' }))

    expect(screen.getByRole('button', { name: 'Full roadmap, 5 topics' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All levels' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('Deadlocks')).toBeInTheDocument()
  })
})
