import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'

function renderNavbar(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Navbar />
    </MemoryRouter>
  )
}

describe('Navbar', () => {
  beforeEach(() => {
    localStorage.clear()
    delete document.documentElement.dataset.theme
    window.matchMedia = vi.fn().mockImplementation(query => ({
      matches: query === '(prefers-color-scheme: light)' ? false : false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    }))
  })

  it('renders the home logo and all five curriculum category links', () => {
    renderNavbar()

    expect(screen.getByRole('link', { name: 'CS Fundamentals home' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /OS/ })).toHaveAttribute('href', '/topic/process-management')
    expect(screen.getByRole('link', { name: /NET/ })).toHaveAttribute('href', '/topic/network-fundamentals')
    expect(screen.getByRole('link', { name: /DB/ })).toHaveAttribute('href', '/topic/dbms-introduction')
    expect(screen.getByRole('link', { name: /JAVA/ })).toHaveAttribute('href', '/topic/java-execution-pipeline')
    expect(screen.getByRole('link', { name: /AI\/ML/ })).toHaveAttribute('href', '/topic/embeddings-vector-db')
  })

  it('marks the link for the current topic category', () => {
    renderNavbar('/topic/tcp-congestion')

    expect(screen.getByRole('link', { name: /NET/ })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: /OS/ })).not.toHaveAttribute('aria-current')
  })

  it('uses the system preference when no theme has been saved', () => {
    window.matchMedia = vi.fn().mockReturnValue({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })

    renderNavbar()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
  })

  it('toggles, persists, and announces the theme change for mounted diagrams', () => {
    const onThemeChange = vi.fn()
    window.addEventListener('cs-fundamentals:theme-change', onThemeChange)
    renderNavbar()

    fireEvent.click(screen.getByRole('button', { name: /switch to light theme/i }))

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(localStorage.getItem('cs-fundamentals-theme')).toBe('light')
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
    expect(onThemeChange).toHaveBeenLastCalledWith(expect.objectContaining({ detail: { theme: 'light' } }))
    window.removeEventListener('cs-fundamentals:theme-change', onThemeChange)
  })

  it('restores a saved theme before offering the opposite theme', () => {
    localStorage.setItem('cs-fundamentals-theme', 'light')

    renderNavbar()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    expect(screen.getByRole('button', { name: /switch to dark theme/i })).toBeInTheDocument()
  })
})
