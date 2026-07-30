import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import SchedulingVisualizer from '../visualizers/SchedulingVisualizer'

describe('SchedulingVisualizer', () => {
  it('renders simulator title and algorithm selector', () => {
    render(<SchedulingVisualizer />)
    expect(screen.getByText(/CPU Scheduling Simulator/i)).toBeInTheDocument()
    expect(screen.getByText(/Algorithm:/i)).toBeInTheDocument()
  })

  it('allows playing and pausing simulation', () => {
    render(<SchedulingVisualizer />)
    const playBtn = screen.getByText(/Play Simulation/i)
    expect(playBtn).toBeInTheDocument()
    fireEvent.click(playBtn)
    expect(screen.getByText(/Pause/i)).toBeInTheDocument()
  })
})
