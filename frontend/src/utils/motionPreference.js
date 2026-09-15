// Shared reduced-motion check for simulation auto-play. App.css's own
// `@media (prefers-reduced-motion: reduce)` rules zero every CSS duration token; this check
// covers the other half of that contract — auto-advancing simulations must also stop by
// default, since that isn't something CSS alone can express. A user can still step through
// manually.
export function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
