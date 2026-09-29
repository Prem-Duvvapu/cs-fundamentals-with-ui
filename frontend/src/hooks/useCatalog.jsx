import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { fetchTopics } from '../utils/api'

const CatalogContext = createContext(null)

function useCatalogRequest(enabled) {
  const [state, setState] = useState({ topics: [], status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    setState(previous => ({ ...previous, status: 'loading' }))
    fetchTopics({ signal: controller.signal }).then(topics => {
      if (!Array.isArray(topics)) throw new Error('Invalid catalog')
      if (!controller.signal.aborted) setState({ topics, status: 'ready' })
    }).catch(() => {
      if (!controller.signal.aborted) setState({ topics: [], status: 'error' })
    })
    return () => controller.abort()
  }, [enabled, attempt])
  return { ...state, retry }
}

export function CatalogProvider({ children }) {
  const value = useCatalogRequest(true)
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export default function useCatalog() {
  const shared = useContext(CatalogContext)
  const local = useCatalogRequest(!shared)
  return shared || local
}
