import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import TopicPage from '../TopicPage'

vi.mock('../../components/TopicViewer', () => ({
  default: ({ topicId }) => <div data-testid="topic-viewer">Study content for {topicId}</div>
}))

vi.mock('../../components/visualizers/DbmsVisualizer', () => ({
  default: () => <div>DBMS simulation</div>
}))

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

    expect(screen.getByRole('heading', { name: /DBMS Architecture & 3-Schema ANSI-SPARC/i })).toBeDefined()
    const studyBtn = screen.getByRole('tab', { name: /study/i })
    expect(studyBtn.className).toContain('active-tab')
    expect(screen.getByRole('tab', { name: /simulation/i })).toBeDefined()
    expect(screen.getByRole('tablist', { name: /topic view/i })).toBeInTheDocument()
    expect(studyBtn).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'topic-tab-theory')
    expect(document.querySelector('.topic-page-container')).toHaveAttribute('data-category', 'dbms')
    const breadcrumb = screen.getByRole('navigation', { name: /breadcrumb/i })
    expect(breadcrumb).toHaveTextContent('All topics')
    expect(breadcrumb).toHaveTextContent('Database Management Systems')
    expect(breadcrumb).not.toHaveTextContent('DBMS Architecture & 3-Schema ANSI-SPARC')
    expect(screen.getAllByText('DBMS Architecture & 3-Schema ANSI-SPARC', { exact: true })).toHaveLength(1)
    expect(screen.queryByText(/back to all topics/i)).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Home' })).not.toBeInTheDocument()
  })

  it('uses the compact topic header after the page is scrolled', () => {
    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })

    const { container } = render(
      <MemoryRouter initialEntries={['/topic/process-management']}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    const header = container.querySelector('.topic-page-header')
    expect(header).not.toHaveClass('topic-page-header--compact')

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 121 })
    fireEvent.scroll(window)
    expect(header).toHaveClass('topic-page-header--compact')

    Object.defineProperty(window, 'scrollY', { configurable: true, value: 0 })
    fireEvent.scroll(window)
    expect(header).not.toHaveClass('topic-page-header--compact')
  })

  it('should switch between simulation and theory tabs', () => {
    render(
      <MemoryRouter initialEntries={['/topic/relational-algebra-calculus']}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    const studyBtn = screen.getByRole('tab', { name: /study/i })
    expect(studyBtn.className).toContain('active-tab')

    const simBtn = screen.getByRole('tab', { name: /simulation/i})
    fireEvent.click(simBtn)
    expect(simBtn.className).toContain('active-tab')
    expect(simBtn).toHaveAttribute('aria-selected', 'true')
  })

  it('supports arrow-key navigation between the topic tabs', () => {
    render(
      <MemoryRouter initialEntries={['/topic/process-management']}>
        <Routes>
          <Route path="/topic/:topicId" element={<TopicPage />} />
        </Routes>
      </MemoryRouter>
    )

    const studyTab = screen.getByRole('tab', { name: /study/i })
    fireEvent.keyDown(studyTab, { key: 'ArrowRight' })

    const simulationTab = screen.getByRole('tab', { name: /simulation/i })
    expect(simulationTab).toHaveAttribute('aria-selected', 'true')
    expect(simulationTab).toHaveFocus()

    fireEvent.keyDown(simulationTab, { key: 'ArrowLeft' })
    expect(studyTab).toHaveAttribute('aria-selected', 'true')
    expect(studyTab).toHaveFocus()
  })

  it.each([
    ['sql-querying', 'Practical SQL, Joins, CTEs & Window Functions'],
    ['spring-boot-internals', 'Spring Boot Internals, Auto-configuration & Profiles'],
    ['spring-rest-api-design', 'Spring REST API Design, Validation & Error Contracts'],
    ['spring-security', 'Spring Security, JWT & OAuth2 Fundamentals'],
    ['spring-caching-async', 'Spring Caching, Async Work & Scheduling'],
    ['spring-testing-production', 'Spring Testing & Production Operations'],
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
