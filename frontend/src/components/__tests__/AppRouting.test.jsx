import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../App'
import AppErrorBoundary from '../AppErrorBoundary'

function BrokenPage() {
  throw new Error('lazy chunk failed')
}

describe('application route recovery', () => {
  it('renders actionable recovery links for an unknown route', () => {
    render(
      <MemoryRouter initialEntries={['/not-a-real-route']}>
        <App />
      </MemoryRouter>
    )

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
