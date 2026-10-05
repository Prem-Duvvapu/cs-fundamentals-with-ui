import { useEffect } from 'react'

const SELECTOR = '.viz-card, .viz-controls-card'
const MARK = 'data-scroll-region'

// Simulator cards contain wide teaching surfaces and scroll locally on narrow screens. A scroll
// container must be keyboard reachable (WCAG 2.1.1), so a card that actually overflows becomes a
// named, focusable region; the attributes are removed again once it no longer scrolls.
function sync(root) {
  for (const element of root.querySelectorAll(SELECTOR)) {
    const scrolls = element.scrollWidth > element.clientWidth + 1
    const marked = element.hasAttribute(MARK)
    if (scrolls && !marked && !element.hasAttribute('tabindex')) {
      const heading = element.querySelector('h2, h3, h4')?.textContent.replace(/\s+/g, ' ').trim()
      element.setAttribute(MARK, '')
      element.setAttribute('tabindex', '0')
      element.setAttribute('role', 'region')
      element.setAttribute('aria-label', heading ? `${heading} (scrollable)` : 'Scrollable simulation area')
    } else if (!scrolls && marked) {
      for (const name of [MARK, 'tabindex', 'role', 'aria-label']) element.removeAttribute(name)
    }
  }
}

export default function useScrollRegionAccess(ref, active = true) {
  useEffect(() => {
    const root = ref.current
    if (!root || !active || typeof window === 'undefined') return undefined
    let frame = 0
    const schedule = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => sync(root))
    }
    schedule()
    const mutations = typeof MutationObserver === 'function' ? new MutationObserver(schedule) : null
    mutations?.observe(root, { childList: true, subtree: true })
    const sizes = typeof ResizeObserver === 'function' ? new ResizeObserver(schedule) : null
    sizes?.observe(root)
    window.addEventListener('resize', schedule)
    return () => {
      cancelAnimationFrame(frame)
      mutations?.disconnect()
      sizes?.disconnect()
      window.removeEventListener('resize', schedule)
    }
  }, [ref, active])
}
