import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import { MemoryRouter } from 'react-router-dom'
import SearchPage from '../SearchPage'

const SEARCH_RESPONSE = {
  query: 'window functions',
  category: null,
  total: 1,
  results: [{
    topicId: 'sql-querying',
    title: 'SQL Querying, Joins & Window Functions',
    category: 'dbms',
    level: 'intermediate',
    summary: 'Joins, aggregates, window functions',
    matchedHeading: 'Window functions preserve row detail',
    excerpt: 'Window functions compute a value per row without collapsing the result set.',
    matchedTerms: ['window', 'functions'],
    score: 200
  }]
}

beforeEach(() => {
  global.fetch = vi.fn()
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderPage(initialEntry = '/search') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SearchPage />
    </MemoryRouter>
  )
}

describe('SearchPage', () => {
  it('shows a prompt before any query is typed and issues no request', () => {
    renderPage()
    expect(screen.getByText(/start typing to search/i)).toBeInTheDocument()
    expect(global.fetch).not.toHaveBeenCalled()
  })

  it('debounces the query, calls the search API, and renders results', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify(SEARCH_RESPONSE)))
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'window functions' } })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 5000 })
    expect(global.fetch.mock.calls[0][0]).toContain('/api/v1/search?q=window+functions')

    expect(await screen.findByText(/1 result for/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /SQL Querying, Joins & Window Functions/i })).toHaveAttribute('href', '/topic/sql-querying')
    expect(screen.getByText(/Window functions preserve row detail/i)).toBeInTheDocument()
  })

  it('includes the category filter in the request when one is selected', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({ ...SEARCH_RESPONSE, category: 'dbms' })))
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: 'DB' }))
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'joins' } })

    await waitFor(() => expect(global.fetch).toHaveBeenCalled(), { timeout: 5000 })
    expect(global.fetch.mock.calls[0][0]).toContain('category=dbms')
  })

  it('shows a no-results state for an empty result set', async () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify({ query: 'zzz', category: null, total: 0, results: [] })))
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'zzz' } })

    expect(await screen.findByText(/no matches for/i)).toBeInTheDocument()
  })

  it('shows an error state when the search request fails', async () => {
    global.fetch.mockRejectedValue(new Error('network error'))
    renderPage()

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'anything' } })

    expect(await screen.findByText(/search is unavailable/i)).toBeInTheDocument()
  })

  it('seeds the query and category from the URL', () => {
    global.fetch.mockResolvedValue(new Response(JSON.stringify(SEARCH_RESPONSE)))
    renderPage('/search?q=window+functions&category=dbms')

    expect(screen.getByRole('searchbox')).toHaveValue('window functions')
    expect(screen.getByRole('button', { name: 'DB' })).toHaveClass('active')
  })
})
