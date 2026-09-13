import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { computeTourPosition } from '../../utils/tourPosition'
import { prefersReducedMotion } from '../../utils/motionPreference'

const FALLBACK_TOOLTIP_SIZE = { width: 320, height: 160 }
const TITLE_ID = 'tour-step-title'

export default function ProductTour({ tour }) {
  const { active, step, stepNumber, totalSteps, isLastStep, canGoBack, targetEl, next, back, skip } = tour
  const tooltipRef = useRef(null)
  const primaryButtonRef = useRef(null)
  const [position, setPosition] = useState(null)

  // Bring the target into view before measuring/positioning against it.
  useLayoutEffect(() => {
    if (!active || !targetEl) return
    targetEl.scrollIntoView({ block: 'center', behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
  }, [active, targetEl])

  useEffect(() => {
    if (!active) return undefined

    const recompute = () => {
      const tooltipSize = tooltipRef.current
        ? { width: tooltipRef.current.offsetWidth, height: tooltipRef.current.offsetHeight }
        : FALLBACK_TOOLTIP_SIZE
      const rect = targetEl ? targetEl.getBoundingClientRect() : null
      setPosition(computeTourPosition({
        rect,
        tooltipSize,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
      }))
    }

    recompute()
    const recomputeSoon = () => window.requestAnimationFrame(recompute)
    // A smooth scrollIntoView keeps moving after this effect runs; re-measure once it settles.
    const settleTimer = window.setTimeout(recompute, 350)
    window.addEventListener('resize', recomputeSoon)
    window.addEventListener('scroll', recomputeSoon, true)

    return () => {
      window.clearTimeout(settleTimer)
      window.removeEventListener('resize', recomputeSoon)
      window.removeEventListener('scroll', recomputeSoon, true)
    }
  }, [active, targetEl, stepNumber])

  useEffect(() => {
    if (active) primaryButtonRef.current?.focus()
  }, [active, stepNumber])

  useEffect(() => {
    if (!active) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        skip()
        return
      }
      if (event.key !== 'Tab' || !tooltipRef.current) return
      const focusable = tooltipRef.current.querySelectorAll('button')
      if (focusable.length === 0) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [active, skip])

  if (!active || !step) return null

  const spotlightRect = targetEl ? targetEl.getBoundingClientRect() : null

  return (
    <div className="tour-overlay" role="presentation">
      {spotlightRect && (
        <div
          className="tour-spotlight"
          style={{
            top: spotlightRect.top - 6,
            left: spotlightRect.left - 6,
            width: spotlightRect.width + 12,
            height: spotlightRect.height + 12
          }}
        />
      )}
      <div
        ref={tooltipRef}
        className={`tour-tooltip ${position ? '' : 'tour-tooltip--measuring'}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={TITLE_ID}
        style={position ? { top: position.top, left: position.left } : undefined}
      >
        <p className="tour-step-count">{stepNumber} of {totalSteps}</p>
        <h2 id={TITLE_ID} className="tour-title">{step.title}</h2>
        <p className="tour-body">{step.body}</p>
        <div className="tour-actions">
          <button type="button" className="tour-btn tour-btn--text" onClick={skip}>
            Skip tour
          </button>
          <div className="tour-actions-nav">
            {canGoBack && (
              <button type="button" className="tour-btn tour-btn--secondary" onClick={back}>
                Back
              </button>
            )}
            <button type="button" className="tour-btn tour-btn--primary" ref={primaryButtonRef} onClick={next}>
              {isLastStep ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
