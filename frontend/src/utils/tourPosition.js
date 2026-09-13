const EDGE_MARGIN = 12
const TARGET_GAP = 12

// Pure so placement math is unit-testable without real layout: pass synthetic rects/sizes in,
// get a top/left/placement back. `rect` is the spotlighted element's getBoundingClientRect()
// (or null for a centered, target-less step); `tooltipSize` is the tooltip's own measured size.
function computeTourPosition({ rect, tooltipSize, viewportWidth, viewportHeight }) {
  const { width: tw, height: th } = tooltipSize

  if (!rect) {
    return {
      placement: 'center',
      top: Math.max(EDGE_MARGIN, (viewportHeight - th) / 2),
      left: Math.max(EDGE_MARGIN, (viewportWidth - tw) / 2)
    }
  }

  const spaceBelow = viewportHeight - rect.bottom
  const spaceAbove = rect.top
  let placement = 'below'
  let top

  if (spaceBelow >= th + TARGET_GAP) {
    placement = 'below'
    top = rect.bottom + TARGET_GAP
  } else if (spaceAbove >= th + TARGET_GAP) {
    placement = 'above'
    top = rect.top - th - TARGET_GAP
  } else {
    // Neither side fits: pin to whichever edge leaves more room and let the tooltip's own
    // max-height/scroll handle overflow rather than overlapping the target.
    placement = spaceBelow >= spaceAbove ? 'below' : 'above'
    top = placement === 'below' ? rect.bottom + TARGET_GAP : EDGE_MARGIN
  }

  // The upper clamp bound can fall below EDGE_MARGIN when the tooltip is taller/wider than the
  // viewport allows; fall back to EDGE_MARGIN itself rather than pushing off-screen negative.
  const maxTop = Math.max(EDGE_MARGIN, viewportHeight - th - EDGE_MARGIN)
  top = Math.min(Math.max(top, EDGE_MARGIN), maxTop)

  const maxLeft = Math.max(EDGE_MARGIN, viewportWidth - tw - EDGE_MARGIN)
  let left = Math.min(Math.max(rect.left, EDGE_MARGIN), maxLeft)

  return { placement, top, left }
}

export { computeTourPosition }
