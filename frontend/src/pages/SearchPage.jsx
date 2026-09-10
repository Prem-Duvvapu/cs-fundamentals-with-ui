import { useState, useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { fetchSearch } from '../utils/api'
import { CATEGORY_METADATA } from '../utils/topicCategories'

const CATEGORY_ORDER = ['java-spring', 'os', 'networking', 'dbms', 'aiml']
const SEARCH_DEBOUNCE_MS = 300

function categoryFromParams(searchParams) {
  const value = searchParams.get('category') || 'all'
  return value === 'all' || CATEGORY_ORDER.includes(value) ? value : 'all'
}

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [query, setQuery] = useState(() => searchParams.get('q') || '')
  const [category, setCategory] = useState(() => categoryFromParams(searchParams))
  const [results, setResults] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const paramsKey = searchParams.toString()
  const lastWrittenParams = useRef(paramsKey)

  useEffect(() => {
    if (paramsKey === lastWrittenParams.current) return
    const urlQuery = searchParams.get('q') || ''
    const urlCategory = categoryFromParams(searchParams)
    setQuery(current => current === urlQuery ? current : urlQuery)
    setCategory(current => current === urlCategory ? current : urlCategory)
  }, [paramsKey, searchParams])

  useEffect(() => {
    const trimmed = query.trim()
    const urlQuery = searchParams.get('q') || ''
    const urlCategory = categoryFromParams(searchParams)
    if (paramsKey !== lastWrittenParams.current && (query !== urlQuery || category !== urlCategory)) {
      return undefined
    }

    const nextParams = new URLSearchParams()
    if (trimmed) nextParams.set('q', trimmed)
    if (category !== 'all') nextParams.set('category', category)
    const nextParamsKey = nextParams.toString()
    lastWrittenParams.current = nextParamsKey
    if (nextParamsKey !== paramsKey) setSearchParams(nextParams, { replace: true })

    if (!trimmed) {
      setResults([])
      setTotal(0)
      setLoading(false)
      setError(false)
      return undefined
    }

    const controller = new AbortController()
    setLoading(true)
    setError(false)
    const timer = setTimeout(() => {
      fetchSearch(
        { q: trimmed, category: category === 'all' ? null : category, limit: 20 },
        { signal: controller.signal }
      )
        .then(data => {
          if (controller.signal.aborted) return
          setResults(data.results)
          setTotal(data.total)
          setLoading(false)
          setError(false)
        })
        .catch(error => {
          if (error?.name === 'AbortError') return
          setError(true)
          setLoading(false)
        })
    }, SEARCH_DEBOUNCE_MS)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, category, paramsKey, searchParams, setSearchParams])

  const trimmedQuery = query.trim()

  return (
    <div className="search-page roadmap-index">
      <header className="roadmap-header">
        <p className="eyebrow">Cross-topic search</p>
        <h1>Search the curriculum</h1>
        <p>Search titles, headings, and lesson content across all 64 topics.</p>

        <form className="search-form" role="search" onSubmit={event => event.preventDefault()}>
          <label htmlFor="curriculum-search-input" className="sr-only">Search query</label>
          <input
            id="curriculum-search-input"
            type="search"
            className="text-input search-input"
            placeholder="e.g. window functions, page replacement, CAP theorem…"
            value={query}
            onChange={event => setQuery(event.target.value)}
            autoComplete="off"
          />
        </form>

        <nav className="roadmap-selectors" aria-label="Filter search by category">
          <button
            type="button"
            className={`roadmap-selector ${category === 'all' ? 'active' : ''}`}
            aria-pressed={category === 'all'}
            onClick={() => setCategory('all')}
          >
            All categories
          </button>
          {CATEGORY_ORDER.map(id => (
            <button
              key={id}
              type="button"
              className={`roadmap-selector ${category === id ? 'active' : ''}`}
              aria-pressed={category === id}
              onClick={() => setCategory(id)}
              data-category={id}
            >
              <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[id].glyph}</span>
              <span>{CATEGORY_METADATA[id].shortLabel}</span>
            </button>
          ))}
        </nav>
      </header>

      <div aria-live="polite">
        {!trimmedQuery ? (
          <p className="category-overview">Start typing to search across the curriculum.</p>
        ) : loading ? (
          <p className="category-overview" role="status">Searching…</p>
        ) : error ? (
          <section className="roadmap-empty-state" role="alert">
            <h2>Search is unavailable</h2>
            <p>The search API may be unavailable. Try again in a moment.</p>
          </section>
        ) : results.length === 0 ? (
          <section className="roadmap-empty-state" role="status">
            <h2>No matches for “{trimmedQuery}”</h2>
            <p>Try a different term, or clear the category filter.</p>
          </section>
        ) : (
          <section className="category-overview" aria-labelledby="search-results-heading">
            <h2 id="search-results-heading">
              {total} result{total === 1 ? '' : 's'} for “{trimmedQuery}”
            </h2>
            <ol className="topic-rows" aria-label="Search results">
              {results.map(result => (
                <li key={result.topicId} className="topic-row" data-category={result.category}>
                  <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[result.category]?.glyph}</span>
                  <div className="topic-row-body">
                    <h3 className="topic-row-title">{result.title}</h3>
                    {result.matchedHeading && <p className="topic-row-summary">In: {result.matchedHeading}</p>}
                    <p className="topic-row-summary">{result.excerpt || result.summary}</p>
                  </div>
                  <Link to={`/topic/${result.topicId}`} className="roadmap-cta" aria-label={`Study ${result.title}`}>
                    Study topic <span aria-hidden="true">→</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>
        )}
      </div>
    </div>
  )
}
