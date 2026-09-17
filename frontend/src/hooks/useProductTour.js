import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TOUR_STEPS } from '../utils/tourSteps'

// Bounded retry for a step's target to mount (e.g. right after a cross-route navigation);
// past this it degrades to a centered, spotlight-less tooltip instead of waiting forever.
const MAX_LOOKUP_ATTEMPTS = 30

export default function useProductTour() {
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetEl, setTargetEl] = useState(null)

  const step = active ? TOUR_STEPS[stepIndex] : null
  const onTargetRoute = !step || !step.path || step.path === location.pathname

  // The tour never opens on its own — it starts only from the navbar's "Take a tour" button.
  // It used to auto-show on a first visit, which meant a stranger's first impression was a
  // 10-step modal over a dimmed page before they had seen any of the actual curriculum. That
  // also made the deep-link regression possible at all (step 1's `path: '/'` yanking a visitor
  // off a shared /topic/... link); with no auto-open, that whole class of bug cannot recur.

  // Navigate ahead of the target lookup when a step lives on a different route.
  useEffect(() => {
    if (active && step?.path && step.path !== location.pathname) {
      navigate(step.path)
    }
    // location.pathname intentionally excluded: this effect drives navigation, not reacts to it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, stepIndex, navigate])

  useEffect(() => {
    if (!active || !step || !step.target || !onTargetRoute) {
      setTargetEl(null)
      return undefined
    }

    let attempts = 0
    let frame
    const tryFind = () => {
      const el = document.querySelector(step.target)
      if (el) {
        setTargetEl(el)
        return
      }
      attempts += 1
      if (attempts < MAX_LOOKUP_ATTEMPTS) {
        frame = requestAnimationFrame(tryFind)
      } else {
        setTargetEl(null)
      }
    }
    tryFind()
    return () => { if (frame) cancelAnimationFrame(frame) }
  }, [active, step, onTargetRoute])

  const finish = useCallback(() => {
    setActive(false)
    setStepIndex(0)
    setTargetEl(null)
  }, [])

  const next = useCallback(() => {
    setStepIndex((index) => {
      if (index + 1 >= TOUR_STEPS.length) return index
      return index + 1
    })
  }, [])

  const back = useCallback(() => {
    setStepIndex((index) => Math.max(0, index - 1))
  }, [])

  const start = useCallback(() => {
    setStepIndex(0)
    setActive(true)
  }, [])

  const isLastStep = stepIndex === TOUR_STEPS.length - 1
  const advanceRef = useRef(next)
  advanceRef.current = isLastStep ? finish : next

  return {
    active,
    step,
    stepNumber: stepIndex + 1,
    totalSteps: TOUR_STEPS.length,
    isLastStep,
    canGoBack: stepIndex > 0,
    targetEl: onTargetRoute ? targetEl : null,
    waitingForRoute: !onTargetRoute,
    next: () => advanceRef.current(),
    back,
    skip: finish,
    finish,
    start
  }
}
