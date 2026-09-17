import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import App from '../../App'
import AppErrorBoundary from '../AppErrorBoundary'

function BrokenPage() {
  throw new Error('lazy chunk failed')
}

// Reports the live router location so a test can assert the app didn't navigate the user away.
function LocationProbe() {
  const { pathname, search } = useLocation()
  return <div data-testid="location">{pathname + search}</div>
}

function renderApp(route) {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <LocationProbe />
    </MemoryRouter>
  )
}

beforeEach(() => {
  // Every test in this file is a *first-time* visitor: no saved progress of any kind. That is the
  // state deep-link handling has to survive, and the state the tour must not interrupt.
  window.localStorage.clear()
  global.fetch = vi.fn().mockResolvedValue(
    new Response(JSON.stringify([]), { headers: { 'Content-Type': 'application/json' } })
  )
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('application route recovery', () => {
  it('renders actionable recovery links for an unknown route', () => {
    renderApp('/not-a-real-route')

    expect(screen.getByRole('heading', { name: /page not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /browse all topics/i })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: /search the curriculum/i })).toHaveAttribute('href', '/search')
  })

  it('shows a recovery page when a routed component fails to render', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<AppErrorBoundary><BrokenPage /></AppErrorBoundary>)

    expect(screen.getByRole('heading', { name: /couldn't be displayed/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
    consoleError.mockRestore()
  })
})

// Regression guard for the bug where the guided tour's first-visit auto-show fired on every
// route and its `path: '/'` first step immediately navigated the visitor off whatever deep link
// they opened — breaking every shared link for exactly the people most likely to follow one.
// The tour no longer opens by itself at all, so that bug is now structurally impossible; these
// tests stay as the guard that keeps it that way.
describe('deep links survive a first-time visit', () => {
  it.each([
    ['/topic/cpu-scheduling'],
    ['/search?q=tcp'],
    ['/interview/dbms'],
    ['/progress'],
    ['/not-a-real-route']
  ])('keeps %s instead of redirecting to the home page', async (route) => {
    renderApp(route)

    // Give the tour's mount effects a chance to fire before asserting we're still here.
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent(route))
    expect(screen.getByTestId('location')).not.toHaveTextContent(/^\/$/)
  })

  it('does not open the tour overlay on a deep link', async () => {
    renderApp('/topic/cpu-scheduling')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/topic/cpu-scheduling'))
    expect(document.querySelector('.tour-tooltip')).toBeNull()
  })

  it('does not open the tour on the home page either — it is opt-in', async () => {
    renderApp('/')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
    expect(document.querySelector('.tour-tooltip')).toBeNull()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('opens the tour only when the navbar button asks for it', async () => {
    renderApp('/')

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/'))
    fireEvent.click(screen.getByRole('button', { name: 'Take a tour of the app' }))

    await waitFor(() => expect(document.querySelector('.tour-tooltip')).not.toBeNull())
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
