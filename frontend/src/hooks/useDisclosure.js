import { useCallback, useEffect, useId, useRef, useState } from 'react'

/**
 * Nonmodal disclosure (menu-style panel without a focus trap). Escape closes the innermost open
 * disclosure and returns focus to its trigger; a pointer press or keyboard focus outside the
 * container closes it quietly. Spread `containerProps` on the element wrapping trigger and panel.
 */
export default function useDisclosure() {
  const [open, setOpen] = useState(false)
  const panelId = useId()
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) return undefined
    const outside = target => target instanceof Node && !containerRef.current?.contains(target)
    const handlePointer = event => { if (outside(event.target)) close(false) }
    const handleFocus = event => { if (outside(event.target)) close(false) }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('focusin', handleFocus)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('focusin', handleFocus)
    }
  }, [open, close])

  return {
    open,
    setOpen,
    close,
    containerProps: {
      ref: containerRef,
      onKeyDown: event => {
        if (!open || event.key !== 'Escape' || event.defaultPrevented) return
        event.preventDefault()
        close(true)
      }
    },
    triggerProps: {
      ref: triggerRef,
      type: 'button',
      'aria-expanded': open,
      'aria-controls': panelId,
      onClick: () => setOpen(value => !value)
    },
    panelProps: { id: panelId, hidden: !open }
  }
}
