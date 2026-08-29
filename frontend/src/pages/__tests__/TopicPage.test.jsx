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
})
