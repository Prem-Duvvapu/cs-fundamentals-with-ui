import { render } from '@testing-library/react'
import { useRef } from 'react'
import { vi } from 'vitest'
import useScrollRegionAccess from '../useScrollRegionAccess'

function Panel({ active = true }) {
  const ref = useRef(null)
  useScrollRegionAccess(ref, active)
  return <div ref={ref}><div className="viz-card" data-testid="card"><h3>Gantt chart</h3></div><div className="viz-card" data-testid="named" tabIndex={0} aria-label="Own name" /></div>
}

function setWidths(element, scrollWidth, clientWidth) {
  Object.defineProperty(element, 'scrollWidth', { configurable: true, value: scrollWidth })
  Object.defineProperty(element, 'clientWidth', { configurable: true, value: clientWidth })
}

it('makes an overflowing simulator card a named focusable region and undoes it when it fits', async () => {
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(); return 1 })
  const { getByTestId, rerender } = render(<Panel active={false} />)
  const card = getByTestId('card')
  setWidths(card, 600, 300)
  setWidths(getByTestId('named'), 600, 300)
  rerender(<Panel active />)
  expect(card).toHaveAttribute('tabindex', '0')
  expect(card).toHaveAttribute('role', 'region')
  expect(card).toHaveAttribute('aria-label', 'Gantt chart (scrollable)')
  expect(getByTestId('named')).toHaveAttribute('aria-label', 'Own name')
  expect(getByTestId('named')).not.toHaveAttribute('role')

  setWidths(card, 300, 300)
  window.dispatchEvent(new Event('resize'))
  expect(card).not.toHaveAttribute('tabindex')
  expect(card).not.toHaveAttribute('role')
  vi.restoreAllMocks()
})
