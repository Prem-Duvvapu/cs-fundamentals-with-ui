import { describe, it, expect } from 'vitest'
import { computeTourPosition } from '../tourPosition'

const VIEWPORT = { viewportWidth: 1280, viewportHeight: 800 }
const TOOLTIP = { width: 320, height: 160 }

describe('computeTourPosition', () => {
  it('centers a target-less step in the viewport', () => {
    const result = computeTourPosition({ rect: null, tooltipSize: TOOLTIP, ...VIEWPORT })

    expect(result.placement).toBe('center')
    expect(result.left).toBeCloseTo((1280 - 320) / 2)
    expect(result.top).toBeCloseTo((800 - 160) / 2)
  })

  it('places the tooltip below the target when there is room', () => {
    const rect = { top: 100, bottom: 140, left: 200, right: 400 }
    const result = computeTourPosition({ rect, tooltipSize: TOOLTIP, ...VIEWPORT })

    expect(result.placement).toBe('below')
    expect(result.top).toBeGreaterThan(rect.bottom)
  })

  it('places the tooltip above the target when there is no room below', () => {
    const rect = { top: 700, bottom: 780, left: 200, right: 400 }
    const result = computeTourPosition({ rect, tooltipSize: TOOLTIP, ...VIEWPORT })

    expect(result.placement).toBe('above')
    expect(result.top + TOOLTIP.height).toBeLessThanOrEqual(rect.top)
  })

  it('clamps the tooltip within the viewport horizontally for a target near the right edge', () => {
    const rect = { top: 100, bottom: 140, left: 1200, right: 1270 }
    const result = computeTourPosition({ rect, tooltipSize: TOOLTIP, ...VIEWPORT })

    expect(result.left + TOOLTIP.width).toBeLessThanOrEqual(1280)
    expect(result.left).toBeGreaterThanOrEqual(0)
  })

  it('clamps the tooltip within the viewport for a target near the left edge', () => {
    const rect = { top: 100, bottom: 140, left: -20, right: 40 }
    const result = computeTourPosition({ rect, tooltipSize: TOOLTIP, ...VIEWPORT })

    expect(result.left).toBeGreaterThanOrEqual(0)
  })

  it('never places the tooltip off the top or bottom edge', () => {
    const rect = { top: 400, bottom: 420, left: 200, right: 400 }
    const result = computeTourPosition({
      rect,
      tooltipSize: { width: 320, height: 900 },
      viewportWidth: 1280,
      viewportHeight: 800
    })

    expect(result.top).toBeGreaterThanOrEqual(0)
  })
})
