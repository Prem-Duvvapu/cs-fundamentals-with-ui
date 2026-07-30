import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Navbar from '../Navbar'

describe('Navbar', () => {
  it('renders logo and nav links', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )
    expect(screen.getByText('CS Fundamentals')).toBeInTheDocument()
    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('OS')).toBeInTheDocument()
  })

  it('links have correct href attributes', () => {
    render(
      <MemoryRouter>
        <Navbar />
      </MemoryRouter>
    )
    expect(screen.getByText('CS Fundamentals').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('Home').closest('a')).toHaveAttribute('href', '/')
    expect(screen.getByText('OS').closest('a')).toHaveAttribute('href', '/topic/process-management')
  })
})
