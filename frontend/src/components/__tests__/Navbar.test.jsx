import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'
import { CATEGORY_METADATA, CATEGORY_ORDER } from '../../utils/topicCategories'

function openLearn() {
  fireEvent.click(screen.getByRole('button', { name: /^Learn/ }))
  return within(screen.getByRole('list', { name: 'Curriculum categories' }))
}

function renderNavbar(route = '/', props = {}) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <Navbar {...props} />
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

  it('renders the home logo and every canonical category inside the Learn disclosure', () => {
    renderNavbar()

    expect(screen.getByRole('link', { name: 'CS Fundamentals home' })).toHaveAttribute('href', '/')
    const learn = screen.getByRole('button', { name: /^Learn/ })
    expect(learn).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByRole('list', { name: 'Curriculum categories' })).not.toBeInTheDocument()

    const categories = openLearn()
    expect(learn).toHaveAttribute('aria-expanded', 'true')
    expect(categories.getAllByRole('link').map(link => link.getAttribute('href'))).toEqual(CATEGORY_ORDER.map(id => `/category/${id}`))
    for (const id of CATEGORY_ORDER) expect(categories.getByRole('link', { name: CATEGORY_METADATA[id].label })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All learning paths' })).toHaveAttribute('href', '/')
  })

  it('marks the link for the current topic category', () => {
    renderNavbar('/topic/tcp-congestion')

    const categories = openLearn()
    expect(categories.getByRole('link', { name: 'Computer Networks' })).toHaveAttribute('aria-current', 'page')
    expect(categories.getByRole('link', { name: 'Operating Systems' })).not.toHaveAttribute('aria-current')
  })

  it('marks DevOps active for a devops topic', () => {
    // Deliberately not docker-fundamentals — that topic was already in the old, buggy local
    // TOPIC_CATEGORIES set, so it wouldn't catch a regression of the fix that removed it.
    renderNavbar('/topic/kubernetes-fundamentals')

    const categories = openLearn()
    expect(categories.getByRole('link', { name: 'DevOps & Infrastructure' })).toHaveAttribute('aria-current', 'page')
    expect(categories.getByRole('link', { name: 'Operating Systems' })).not.toHaveAttribute('aria-current')
  })

  it('closes a disclosure with Escape and returns focus to its trigger', () => {
    renderNavbar()
    const learn = screen.getByRole('button', { name: /^Learn/ })
    openLearn()
    const firstCategory = screen.getByRole('link', { name: 'Java & Spring' })
    firstCategory.focus()
    fireEvent.keyDown(firstCategory, { key: 'Escape' })

    expect(learn).toHaveAttribute('aria-expanded', 'false')
    expect(learn).toHaveFocus()
  })

  it('closes only the innermost disclosure when Escape is pressed inside the mobile menu', () => {
    renderNavbar()
    const menu = screen.getByRole('button', { name: 'Menu' })
    fireEvent.click(menu)
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    openLearn()
    fireEvent.keyDown(screen.getByRole('link', { name: 'Java & Spring' }), { key: 'Escape' })

    expect(screen.getByRole('button', { name: /^Learn/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true')
    fireEvent.keyDown(screen.getByRole('button', { name: /^Learn/ }), { key: 'Escape' })
    expect(screen.getByRole('button', { name: 'Menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('closes an open disclosure when the pointer is pressed elsewhere', () => {
    renderNavbar()
    openLearn()
    fireEvent.pointerDown(document.body)
    expect(screen.getByRole('button', { name: /^Learn/ })).toHaveAttribute('aria-expanded', 'false')
  })

  it('links to search and a default interview category, marking whichever is active', () => {
    renderNavbar('/search')

    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('href', '/search')
    expect(screen.getByRole('link', { name: 'Search' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Interview Mode' })).toHaveAttribute('href', '/interview/all')
    expect(screen.getByRole('link', { name: 'Interview Mode' })).not.toHaveAttribute('aria-current')
  })

  it('links to the progress dashboard, marking it active on its own route', () => {
    renderNavbar('/progress')

    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('href', '/progress')
    expect(screen.getByRole('link', { name: 'Progress' })).toHaveAttribute('aria-current', 'page')

    cleanup()
    renderNavbar('/')
    expect(screen.getByRole('link', { name: 'Progress' })).not.toHaveAttribute('aria-current')
  })

  it('marks Interview Mode active for any /interview/:category route', () => {
    renderNavbar('/interview/dbms')

    expect(screen.getByRole('link', { name: 'Interview Mode' })).toHaveAttribute('aria-current', 'page')
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

  it('invokes onStartTour when the tour button is clicked', () => {
    const onStartTour = vi.fn()
    renderNavbar('/', { onStartTour })

    fireEvent.click(screen.getByRole('button', { name: /^Help/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Take a tour of the app' }))

    expect(onStartTour).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: /^Help/ })).toHaveAttribute('aria-expanded', 'false')
  })
})
