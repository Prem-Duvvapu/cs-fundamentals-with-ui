import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { TOUR_STEPS } from '../utils/tourSteps'

const STORAGE_KEY = 'cs-fundamentals-tour-seen'
// Bounded retry for a step's target to mount (e.g. right after a cross-route navigation);
// past this it degrades to a centered, spotlight-less tooltip instead of waiting forever.
const MAX_LOOKUP_ATTEMPTS = 30

function readSeen() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function writeSeen() {
  try {
    window.localStorage.setItem(STORAGE_KEY, 'true')
  } catch {
    // Storage can be unavailable in privacy modes; the tour just won't self-suppress next visit.
  }
}

export default function useProductTour() {
  const navigate = useNavigate()
  const location = useLocation()
  const [active, setActive] = useState(false)
  const [stepIndex, setStepIndex] = useState(0)
  const [targetEl, setTargetEl] = useState(null)

  const step = active ? TOUR_STEPS[stepIndex] : null
  const onTargetRoute = !step || !step.path || step.path === location.pathname

  // Auto-show once, for a first-time visitor who actually landed on the home route. Without the
  // route guard the tour would start anywhere, and its first step's `path: '/'` would immediately
  // navigate the visitor off the deep link they opened (a shared /topic/... link, say) with no
  // way back. Landing deep is a deliberate destination; the tour waits for the navbar button.
  useEffect(() => {
    if (!readSeen() && location.pathname === '/') setActive(true)
    // Mount-only on purpose: this asks where the visitor *arrived*, not where they navigate later.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    writeSeen()
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
