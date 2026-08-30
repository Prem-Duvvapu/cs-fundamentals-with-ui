import { useCallback, useEffect, useState } from 'react'

const STORAGE_KEY = 'cs-fundamentals-theme'
const THEME_EVENT = 'cs-fundamentals:theme-change'

function getSystemTheme() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: light)').matches
    ? 'light'
    : 'dark'
}

function readTheme() {
  if (typeof window === 'undefined') return 'dark'

  try {
    const savedTheme = window.localStorage.getItem(STORAGE_KEY)
    if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme
  } catch {
    return getSystemTheme()
  }

  const documentTheme = document.documentElement.dataset.theme
  return documentTheme === 'light' || documentTheme === 'dark' ? documentTheme : getSystemTheme()
}

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme
  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }))
}

export default function useTheme() {
  const [theme, setTheme] = useState(readTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-color-scheme: light)')
    if (!media) return undefined

    const followSystemTheme = (event) => {
      try {
        if (window.localStorage.getItem(STORAGE_KEY)) return
      } catch {
        // Storage can be unavailable in privacy modes; keep following the system.
      }
      setTheme(event.matches ? 'light' : 'dark')
    }

    media.addEventListener?.('change', followSystemTheme)
    return () => media.removeEventListener?.('change', followSystemTheme)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme(currentTheme => {
      const nextTheme = currentTheme === 'dark' ? 'light' : 'dark'
      try {
        window.localStorage.setItem(STORAGE_KEY, nextTheme)
      } catch {
        // The visible theme should still change when persistence is unavailable.
      }
      return nextTheme
    })
  }, [])

  return { theme, toggleTheme }
}

export { STORAGE_KEY, THEME_EVENT }
