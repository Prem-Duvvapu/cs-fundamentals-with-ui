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

    expect(screen.getByRole('heading', { name: /DBMS Architecture & 3-Schema ANSI-SPARC/i })).toBeDefined()
    const studyBtn = screen.getByRole('tab', { name: /study/i })
    expect(studyBtn.className).toContain('active-tab')
    expect(screen.getByRole('tab', { name: /simulation/i })).toBeDefined()
    expect(screen.getByRole('tablist', { name: /topic view/i })).toBeInTheDocument()
    expect(studyBtn).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'topic-tab-theory')
    expect(document.querySelector('.topic-page-container')).toHaveAttribute('data-category', 'dbms')
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('DB')
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
})
