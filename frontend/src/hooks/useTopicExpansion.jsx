import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const TopicExpansionContext = createContext(null)
const RailSearchContext = createContext(null)

// Lives in App, outside the pathname-keyed error boundary, so the rail's expansion choices and an
// in-progress category search survive the page remount that follows every lesson navigation.
export function TopicExpansionProvider({ children }) {
  const expansion = useState({})
  const [search, setSearch] = useState({ category: null, query: '' })
  const railSearch = useMemo(() => [search, setSearch], [search])
  return (
    <TopicExpansionContext.Provider value={expansion}>
      <RailSearchContext.Provider value={railSearch}>{children}</RailSearchContext.Provider>
    </TopicExpansionContext.Provider>
  )
}

export default function useTopicExpansion() {
  const shared = useContext(TopicExpansionContext)
  const local = useState({})
  return shared || local
}

// A category-local query. Another category's query is never shown: changing category clears it.
export function useRailSearch(category) {
  const shared = useContext(RailSearchContext)
  const local = useState({ category: null, query: '' })
  const [search, setSearch] = shared || local
  const query = search.category === category ? search.query : ''
  const setQuery = useCallback(value => setSearch({ category, query: value }), [category, setSearch])
  return [query, setQuery]
}
