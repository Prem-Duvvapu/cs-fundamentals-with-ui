import { render, screen } from '@testing-library/react'
import Footer from '../Footer'

describe('Footer', () => {
  it('renders the developer credit', () => {
    render(<Footer />)

    expect(screen.getByText('Developed by Prem Duvvapu')).toBeInTheDocument()
  })

  it('renders as a footer landmark', () => {
    render(<Footer />)

    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })
})
