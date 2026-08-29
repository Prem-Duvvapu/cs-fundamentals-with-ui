import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
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
    expect(screen.getByRole('list', { name: 'Java & Spring topics' })).toBeInTheDocument()

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
    renderPage()

    await screen.findByText('OOP Pillars')
    const osButton = screen.getByRole('button', { name: 'Operating Systems' })
    fireEvent.click(osButton)

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

  it('keeps fallback catalogue counts and study links in sync for planned topics', async () => {
    vi.mocked(fetchTopics).mockRejectedValueOnce(new Error('API unavailable'))
    renderPage()

    await screen.findByText('Spring Boot Internals & Auto-Configuration')

    fireEvent.click(screen.getByRole('button', { name: 'Java & Spring' }))
    expect(screen.getByText(/23 topics in this path/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study Spring Security, Authentication & Authorization' })).toHaveAttribute('href', '/topic/spring-security')
    expect(screen.getByRole('link', { name: 'Study Spring Testing & Production Readiness' })).toHaveAttribute('href', '/topic/spring-testing-production')

    fireEvent.click(screen.getByRole('button', { name: 'DBMS' }))
    expect(screen.getByText(/13 topics in this path/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study SQL Querying, Joins & Window Functions' })).toHaveAttribute('href', '/topic/sql-querying')

    fireEvent.click(screen.getByRole('button', { name: 'AI/ML' }))
    expect(screen.getByText(/7 topics in this path/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Study Machine Learning Fundamentals & Evaluation' })).toHaveAttribute('href', '/topic/ml-fundamentals')
  })
})
