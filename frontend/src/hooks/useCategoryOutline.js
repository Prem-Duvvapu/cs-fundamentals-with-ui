import { useCallback, useEffect, useState } from 'react'

const cache = new Map()

export default function useCategoryOutline(category, enabled = true) {
  const [state, setState] = useState({ category: null, outlines: {}, status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    if (!enabled) return undefined
    const controller = new AbortController()
    if (cache.has(category)) {
      setState({ category, outlines: cache.get(category), status: 'ready' })
      return () => controller.abort()
    }
    setState({ category, outlines: {}, status: 'loading' })
    async function load() {
      const [response, { parseMarkdownOutline }] = await Promise.all([
        fetch(`/api/v1/topics/outlines?category=${encodeURIComponent(category)}`, { signal: controller.signal }),
        import('../utils/markdownOutline')
      ])
      if (!response.ok) throw new Error('Outline request failed')
      const entries = await response.json()
      if (!Array.isArray(entries) || entries.some(entry => typeof entry.topicId !== 'string' || typeof entry.headingsMarkdown !== 'string')) throw new Error('Invalid outlines')
      const outlines = Object.fromEntries(entries.map(entry => [entry.topicId, parseMarkdownOutline(entry.headingsMarkdown)]))
      if (controller.signal.aborted) return
      cache.set(category, outlines)
      setState({ category, outlines, status: 'ready' })
    }
    load().catch(() => {
      if (!controller.signal.aborted) setState({ category, outlines: {}, status: 'error' })
    })
    return () => controller.abort()
  }, [category, attempt, enabled])
  return { ...(state.category === category ? state : { outlines: {}, status: 'loading' }), retry }
}
