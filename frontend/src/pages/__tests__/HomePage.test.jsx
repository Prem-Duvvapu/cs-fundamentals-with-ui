import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import { BrowserRouter } from 'react-router-dom'
import HomePage from '../HomePage'

describe('HomePage Component', () => {
  it('should render header title and category filter buttons', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )

    expect(screen.getByText(/CS Fundamentals & Visualizations/i)).toBeDefined()
    expect(screen.getByText(/🌟 All Topics/i)).toBeDefined()
    expect(screen.getByText(/💻 Operating Systems/i)).toBeDefined()
    expect(screen.getByText(/🌐 Computer Networks/i)).toBeDefined()
    expect(screen.getByText(/🗄 DBMS & SQL/i)).toBeDefined()
    expect(screen.getByText(/☕ Java & Spring Ecosystem/i)).toBeDefined()
  })

  it('should switch category filter when category buttons are clicked', () => {
    render(
      <BrowserRouter>
        <HomePage />
      </BrowserRouter>
    )

    const dbmsBtn = screen.getByText(/🗄 DBMS & SQL/i)
    fireEvent.click(dbmsBtn)
    expect(dbmsBtn.className).toContain('active-tab')

    const javaBtn = screen.getByText(/☕ Java & Spring Ecosystem/i)
    fireEvent.click(javaBtn)
    expect(javaBtn.className).toContain('active-tab')
  })
})
