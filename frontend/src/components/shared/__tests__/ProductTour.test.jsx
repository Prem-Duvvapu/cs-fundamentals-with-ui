import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ProductTour from '../ProductTour'

function makeTour(overrides = {}) {
  return {
    active: true,
    step: { id: 'welcome', target: null, title: 'Welcome', body: 'Body text' },
    stepNumber: 1,
    totalSteps: 3,
    isLastStep: false,
    canGoBack: false,
    targetEl: null,
    next: vi.fn(),
    back: vi.fn(),
    skip: vi.fn(),
    ...overrides
  }
}

describe('ProductTour', () => {
  it('renders nothing when inactive', () => {
    const { container } = render(<ProductTour tour={makeTour({ active: false, step: null })} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('renders the current step as a labelled dialog', () => {
    render(<ProductTour tour={makeTour()} />)

    expect(screen.getByRole('dialog', { name: 'Welcome' })).toBeInTheDocument()
    expect(screen.getByText('Body text')).toBeInTheDocument()
    expect(screen.getByText('1 of 3')).toBeInTheDocument()
  })

  it('hides Back on the first step', () => {
    render(<ProductTour tour={makeTour()} />)
    expect(screen.queryByRole('button', { name: 'Back' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
  })

  it('shows Back once past the first step', () => {
    render(<ProductTour tour={makeTour({ canGoBack: true, stepNumber: 2 })} />)
    expect(screen.getByRole('button', { name: 'Back' })).toBeInTheDocument()
  })

  it('shows Finish instead of Next on the last step', () => {
    render(<ProductTour tour={makeTour({ isLastStep: true })} />)
    expect(screen.getByRole('button', { name: 'Finish' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Next' })).not.toBeInTheDocument()
  })

  it('calls next/back/skip from their buttons', () => {
    const tour = makeTour({ canGoBack: true })
    render(<ProductTour tour={tour} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next' }))
    expect(tour.next).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Back' }))
    expect(tour.back).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: 'Skip tour' }))
    expect(tour.skip).toHaveBeenCalledTimes(1)
  })

  it('calls skip on Escape', () => {
    const tour = makeTour()
    render(<ProductTour tour={tour} />)

    fireEvent.keyDown(window, { key: 'Escape' })
    expect(tour.skip).toHaveBeenCalledTimes(1)
  })

  it('moves focus to the primary action on mount', () => {
    render(<ProductTour tour={makeTour()} />)
    expect(screen.getByRole('button', { name: 'Next' })).toHaveFocus()
  })

  it('renders a spotlight around the step target when one is set', () => {
    const target = document.createElement('div')
    target.getBoundingClientRect = () => ({ top: 100, bottom: 140, left: 50, right: 150, width: 100, height: 40 })
    target.scrollIntoView = vi.fn()
    document.body.appendChild(target)

    const { container } = render(
      <ProductTour tour={makeTour({
        step: { id: 'x', target: '.x', title: 'X', body: 'Y' },
        targetEl: target
      })}
      />
    )

    expect(container.querySelector('.tour-spotlight')).not.toBeNull()
    document.body.removeChild(target)
  })

  it('renders no spotlight for a centered, target-less step', () => {
    const { container } = render(<ProductTour tour={makeTour()} />)
    expect(container.querySelector('.tour-spotlight')).toBeNull()
  })
})
