import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import InterviewPage from '../InterviewPage'

function makeQuestion(n, overrides = {}) {
  return {
    id: `dbms-indexing-q${n}`,
    topicId: 'dbms-indexing',
    topicTitle: 'B/B+ Tree Indexing & Storage Structures',
    category: 'dbms',
    number: n,
    question: `Q${n}. Question number ${n}?`,
    difficulty: 'easy',
    answerMarkdown: `Answer ${n}.`,
    ...overrides
  }
}

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage(initialEntry = '/interview/dbms') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/interview/:category" element={<InterviewPage />} />
      </Routes>
    </MemoryRouter>
  )
}

describe('InterviewPage', () => {
  it('fetches and renders the first page of questions for the routed category', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({
      category: 'dbms',
      difficulty: null,
      total: 1,
      offset: 0,
      limit: 50,
      questions: [makeQuestion(1)]
    })))

    renderPage('/interview/dbms')

    expect(global.fetch.mock.calls[0][0]).toContain('/api/v1/interview/questions?category=dbms')
    expect(await screen.findByText(/Question number 1\?/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /From: B\/B\+ Tree Indexing & Storage Structures/i })).toHaveAttribute('href', '/topic/dbms-indexing')
  })

  it('omits the category param for the "all" pseudo-category', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({
      category: null, difficulty: null, total: 1, offset: 0, limit: 50, questions: [makeQuestion(1)]
    })))

    renderPage('/interview/all')

    await waitFor(() => expect(global.fetch).toHaveBeenCalled())
    expect(global.fetch.mock.calls[0][0]).not.toContain('category=')
  })

  it('shows a category picker for an unknown category id', () => {
    renderPage('/interview/not-a-real-category')
    expect(screen.getByText(/unknown category/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
    expect(screen.getByRole('link', { name: /all categories/i })).toHaveAttribute('href', '/interview/all')
  })

  it('re-fetches from the start when the difficulty filter changes', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({
      category: 'dbms', difficulty: null, total: 1, offset: 0, limit: 50, questions: [makeQuestion(1)]
    })))
    renderPage('/interview/dbms')
    await screen.findByText(/Question number 1\?/)

    fireEvent.click(screen.getByRole('button', { name: 'Hard' }))

    await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2))
    expect(global.fetch.mock.calls[1][0]).toContain('difficulty=hard')
    expect(global.fetch.mock.calls[1][0]).toContain('offset=0')
  })

  it('loads more questions and appends them without losing the current position', async () => {
    global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      category: 'dbms', difficulty: null, total: 2, offset: 0, limit: 50, questions: [makeQuestion(1)]
    })))
    renderPage('/interview/dbms')
    await screen.findByText('1 / 1')

    global.fetch.mockResolvedValueOnce(new Response(JSON.stringify({
      category: 'dbms', difficulty: null, total: 2, offset: 1, limit: 50, questions: [makeQuestion(2)]
    })))
    fireEvent.click(screen.getByRole('button', { name: /load 1 more/i }))

    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument())
    expect(global.fetch.mock.calls[1][0]).toContain('offset=1')
  })

  it('shows an empty state when no questions match the filters', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({
      category: 'dbms', difficulty: 'hard', total: 0, offset: 0, limit: 50, questions: []
    })))
    renderPage('/interview/dbms')
    expect(await screen.findByText(/no questions match this filter/i)).toBeInTheDocument()
  })

  it('shows an error state when the request fails', async () => {
    global.fetch.mockRejectedValue(new Error('network error'))
    renderPage('/interview/dbms')
    expect(await screen.findByText(/couldn't load interview questions/i)).toBeInTheDocument()
  })
})
