import { render, screen } from '@testing-library/react'
import AppErrorBoundary from '../AppErrorBoundary'

function Bomb() {
  throw new Error('boom')
}

it('renders children when nothing has thrown', () => {
  render(
    <AppErrorBoundary>
      <p>All good</p>
    </AppErrorBoundary>
  )

  expect(screen.getByText('All good')).toBeInTheDocument()
})

it('renders a recovery alert instead of crashing when a child throws', () => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

  render(
    <AppErrorBoundary>
      <Bomb />
    </AppErrorBoundary>
  )

  expect(screen.getByRole('alert')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /couldn't be displayed/i })).toBeInTheDocument()
  expect(screen.getByRole('button', { name: /reload page/i })).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /browse all topics/i })).toHaveAttribute('href', '/')

  consoleError.mockRestore()
})
