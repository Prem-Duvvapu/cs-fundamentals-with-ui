import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import NotFoundPage from '../NotFoundPage'

it('renders default copy and links back into the curriculum', () => {
  render(
    <MemoryRouter>
      <NotFoundPage />
    </MemoryRouter>
  )

  expect(screen.getByRole('status')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: 'Page not found' })).toBeInTheDocument()
  expect(screen.getByText(/does not exist or may have moved/i)).toBeInTheDocument()
  expect(screen.getByRole('link', { name: /browse all topics/i })).toHaveAttribute('href', '/')
  expect(screen.getByRole('link', { name: /search the curriculum/i })).toHaveAttribute('href', '/search')
})

it('accepts a custom title and message', () => {
  render(
    <MemoryRouter>
      <NotFoundPage title="Unknown category" message="Pick one below." />
    </MemoryRouter>
  )

  expect(screen.getByRole('heading', { name: 'Unknown category' })).toBeInTheDocument()
  expect(screen.getByText('Pick one below.')).toBeInTheDocument()
})
