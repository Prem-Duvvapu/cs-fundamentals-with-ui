import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TopicPage from '../TopicPage'

beforeEach(() => {
  global.fetch = vi.fn().mockResolvedValue(new Response('# Test Content\n\nContent details.'))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('TopicPage Component', () => {
  it('should render TopicPage with Study active by default', async () => {
    render(
      <MemoryRouter initialEntries={['/topic/dbms-architecture']}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByText(/DBMS Architecture & 3-Schema ANSI-SPARC/i)).toBeDefined()
    const studyBtn = screen.getByRole('button', { name: /study/i })
    expect(studyBtn.className).toContain('active-tab')
    expect(screen.getByRole('button', { name: /simulation/i })).toBeDefined()
  })

  it('should switch between simulation and theory tabs', () => {
    render(
      <MemoryRouter initialEntries={['/topic/relational-algebra-calculus']}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    const studyBtn = screen.getByRole('button', { name: /study/i })
    expect(studyBtn.className).toContain('active-tab')

    const simBtn = screen.getByRole('button', { name: /simulation/i})
    fireEvent.click(simBtn)
    expect(simBtn.className).toContain('active-tab')
  })

  it.each([
    ['sql-querying', 'SQL Querying, Joins & Window Functions'],
    ['spring-boot-internals', 'Spring Boot Internals & Auto-Configuration'],
    ['spring-rest-api-design', 'Spring REST API Design & Error Handling'],
    ['spring-security', 'Spring Security, Authentication & Authorization'],
    ['spring-caching-async', 'Spring Caching, Async Work & Resilience'],
    ['spring-testing-production', 'Spring Testing & Production Readiness'],
    ['ml-fundamentals', 'Machine Learning Fundamentals & Evaluation']
  ])('renders the registered topic title for %s', (topicId, title) => {
    render(
      <MemoryRouter initialEntries={[`/topic/${topicId}`]}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    expect(screen.getByRole('heading', { name: title })).toBeInTheDocument()
  })
})
