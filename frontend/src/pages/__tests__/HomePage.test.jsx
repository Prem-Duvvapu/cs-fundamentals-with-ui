import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../HomePage'
import { fetchTopics } from '../../utils/api'
import { toggleBookmark } from '../../utils/topicProgress'

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

async function openBrowse() {
  const toggle = await screen.findByRole('button', { name: /Browse all lessons/ })
  if (toggle.getAttribute('aria-expanded') !== 'true') fireEvent.click(toggle)
  return toggle
}

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
    window.localStorage.clear()
    window.history.replaceState({}, '', '/')
  })

  it('renders the prioritized roadmap with semantic category controls', async () => {
    renderPage()

    expect(await screen.findByRole('heading', { name: /Understand the systems behind your code/  })).toBeInTheDocument()
    await openBrowse()
    await screen.findByText('OOP Pillars')
    expect(screen.getByRole('navigation', { name: 'Curriculum categories' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Full roadmap, 5 topics' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Java & Spring, 1 topic' })).toHaveTextContent('◐JAVA· 1')
    expect(screen.getByRole('list', { name: 'Java & Spring topics' })).toBeInTheDocument()

    expect(screen.getByRole('heading', { name: '1. Java & Spring' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '2. Operating Systems' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '3. Computer Networks' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '4. Database Management Systems' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '5. AI & Machine Learning' })).toBeInTheDocument()
  })

  it('filters a category, reports its count, and preserves the study link', async () => {
    renderPage()

    await openBrowse()
    await screen.findByText('OOP Pillars')
    const osButton = screen.getByRole('button', { name: 'Operating Systems, 1 topic' })
    fireEvent.click(osButton)

    expect(osButton).toHaveAttribute('aria-pressed', 'true')
    expect(document.getElementById('os-heading')).toHaveTextContent('◆ Operating Systems')
    expect(screen.getByText(/1 topic in this path/i)).toBeInTheDocument()
    expect(screen.getByText('Deadlocks')).toBeInTheDocument()
    expect(screen.queryByText('OOP Pillars')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Deadlocks' })).toHaveAttribute('href', '/topic/deadlocks')
  })

  it('renders the level badge and ordered topic row', async () => {
    renderPage()

    await openBrowse()
    await screen.findByText('OOP Pillars')
    const oopRow = screen.getByRole('link', { name: 'OOP Pillars' }).closest('li')
    expect(within(oopRow).getByLabelText('Beginner level')).toHaveTextContent('●Beginner')
    expect(within(oopRow).getByText('01')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'OOP Pillars' })).toHaveAttribute('href', '/topic/java-oop-pillars')
  })

  it('combines category and level filters and exposes an accessible empty state', async () => {
    renderPage()

    await openBrowse()
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

  it('shows a recoverable error instead of a fabricated fallback catalog', async () => {
    vi.mocked(fetchTopics).mockRejectedValueOnce(new Error('Offline')).mockResolvedValueOnce(topics)
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load the curriculum")
    expect(screen.queryByRole('link', { name: 'OOP Pillars' })).not.toBeInTheDocument()
    expect(screen.queryByRole('list', { name: 'Java & Spring topics' })).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
    await openBrowse()
    expect(await screen.findByRole('link', { name: 'OOP Pillars' })).toBeInTheDocument()
  })

  it('bookmarks a topic from its row and filters the roadmap to bookmarked-only', async () => {
    renderPage()

    await openBrowse()
    await screen.findByText('OOP Pillars')

    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Deadlocks' }))
    expect(screen.getByRole('button', { name: 'Remove Deadlocks from bookmarks' })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', { name: /^bookmarked$/i }))
    expect(screen.getByText('Deadlocks')).toBeInTheDocument()
    expect(screen.queryByText('OOP Pillars')).not.toBeInTheDocument()
  })

  // A first-time visitor should not be shown a score of zero, a filter that can only ever return
  // nothing, or a card restating the sentence directly above it.
  it('hides zero-state clutter until it means something', async () => {
    renderPage()

    await openBrowse()
    await screen.findByText('OOP Pillars')
    expect(screen.queryByText('0 of 5 topics completed')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^bookmarked$/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Recommended sequence' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Deadlocks' }))
    expect(screen.getByRole('button', { name: /^bookmarked$/i })).toBeInTheDocument()
  })

  // Un-bookmarking the last topic while the filter is on must not strand the visitor: the control
  // has to stay reachable so they can switch it back off.
  it('keeps the bookmarked filter reachable after the last bookmark is removed', async () => {
    renderPage()

    await openBrowse()
    await screen.findByText('OOP Pillars')
    fireEvent.click(screen.getByRole('button', { name: 'Bookmark Deadlocks' }))
    fireEvent.click(screen.getByRole('button', { name: /^bookmarked$/i }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Deadlocks from bookmarks' }))

    const filter = screen.getByRole('button', { name: /^bookmarked$/i })
    expect(filter).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(filter)
    expect(screen.getByText('OOP Pillars')).toBeInTheDocument()
  })

  it('offers one entry point that points at the next uncompleted topic', async () => {
    renderPage()

    const cta = await screen.findByRole('link', { name: /Start here: OOP Pillars/ })
    expect(cta).toHaveAttribute('href', '/topic/java-oop-pillars')
  })

  it('offers six learning paths with lesson and completion counts from the catalog', async () => {
    window.localStorage.setItem('cs-fundamentals-progress', JSON.stringify({ deadlocks: { completed: true } }))
    renderPage()
    const paths = within(await screen.findByRole('region', { name: 'Learning paths' }))
    const links = paths.getAllByRole('link')
    expect(links.map(link => link.getAttribute('href'))).toEqual(['/category/java-spring', '/category/os', '/category/networking', '/category/dbms', '/category/aiml', '/category/devops'])
    expect(paths.getByRole('link', { name: /Operating Systems/ })).toHaveTextContent('1 lesson · 1 completed')
    expect(screen.getByRole('button', { name: /Browse all lessons/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('leads a returning learner with an honest resume action, then the next recommendation', async () => {
    window.localStorage.setItem('cs-fundamentals-learning-v1', JSON.stringify({ version: 1, reading: { 'transactions-acid': { headingId: 'intermediate-level', updatedAt: Date.now() - 5 * 60000 } }, practice: {}, sessions: {}, preferences: { fontSize: 18 } }))
    renderPage()
    const resume = await screen.findByRole('link', { name: 'Resume reading: Transactions' })
    expect(resume).toHaveAttribute('href', '/topic/transactions-acid#intermediate-level')
    expect(screen.getByText(/Reading position saved 5 minutes ago in this browser/)).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Start here/ })).not.toBeInTheDocument()
  })

  it('opens Browse with its selection visible when the URL carries a roadmap filter', async () => {
    window.history.replaceState({}, '', '/?category=os&level=intermediate')
    renderPage()
    const toggle = await screen.findByRole('button', { name: /Browse all lessons/ })
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveTextContent('1 of 5')
    expect(await screen.findByRole('button', { name: 'Operating Systems, 1 topic' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Intermediate' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('link', { name: 'Deadlocks' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Reset filters' }))
    expect(window.location.search).toBe('')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
  })
})
