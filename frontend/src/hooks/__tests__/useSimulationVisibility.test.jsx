import { useState } from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import useSimulationVisibility, { SimulationVisibility } from '../useSimulationVisibility'
function Demo() {
  const [playing, setPlaying] = useState(false)
  useSimulationVisibility(setPlaying)
  return <button onClick={() => setPlaying(true)}>{playing ? 'Playing' : 'Paused'}</button>
}
it('pauses when hidden and requires an explicit restart when shown', () => {
  const { rerender } = render(<SimulationVisibility.Provider value={true}><Demo /></SimulationVisibility.Provider>)
  fireEvent.click(screen.getByRole('button', { name: 'Paused' }))
  expect(screen.getByRole('button', { name: 'Playing' })).toBeInTheDocument()
  rerender(<SimulationVisibility.Provider value={false}><Demo /></SimulationVisibility.Provider>)
  expect(screen.getByRole('button', { name: 'Paused' })).toBeInTheDocument()
  rerender(<SimulationVisibility.Provider value={true}><Demo /></SimulationVisibility.Provider>)
  expect(screen.getByRole('button', { name: 'Paused' })).toBeInTheDocument()
})
