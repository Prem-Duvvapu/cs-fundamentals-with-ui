// Shared reduced-motion check for simulation auto-play. Per the design system (UI_REVAMP_PLAN.md
// §4.8), `prefers-reduced-motion: reduce` zeroes every CSS duration token *and* must stop
// auto-advancing simulations by default — a user can still step through manually.
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
