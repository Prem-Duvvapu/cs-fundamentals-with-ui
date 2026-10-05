import { useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CATEGORY_METADATA } from '../../utils/topicCategories'
import { useRailSearch } from '../../hooks/useTopicExpansion'
import Icon from './Icon'

const TIER_EMOJI = /^(🟢|🟡|🔴)\s*/

function cleanTitle(title) {
  return title.replace(TIER_EMOJI, '')
}

export function normalizeRailText(value) {
  return value.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

// Each heading carries the level heading (Beginner/Intermediate/Expert or other h2) it sits under.
function withGroups(headings) {
  let group = ''
  return headings.map(heading => {
    if (heading.level === 2) group = cleanTitle(heading.title)
    return { ...heading, group: heading.level === 2 ? '' : group }
  })
}

function Highlight({ text, query }) {
  if (!query) return text
  const index = normalizeRailText(text).indexOf(query)
  // Normalization can change length (e.g. accents); only highlight when offsets still line up.
  if (index < 0 || normalizeRailText(text.slice(0, index)).length !== index) return text
  return <>{text.slice(0, index)}<mark>{text.slice(index, index + query.length)}</mark>{text.slice(index + query.length)}</>
}

export default function CategoryTopicNavigation({ category, topics, topicId, sections, activeSection, onSectionClick, expanded, onToggle, onCollapseAll, outlines, status, retry, hidden }) {
  const location = useLocation()
  const navigationRef = useRef(null)
  const searchInputId = useId()
  const [query, setQuery] = useRailSearch(category)
  const normalizedQuery = normalizeRailText(query)
  const searching = normalizedQuery.length > 0
  // Temporary expansion while searching; never written to the user's saved expansion choices.
  const [searchState, setSearchState] = useState({ query: '', open: {}, showAll: {} })
  const overlay = searchState.query === normalizedQuery ? searchState : { query: normalizedQuery, open: {}, showAll: {} }
  const updateOverlay = change => setSearchState(() => {
    const base = overlay
    return { ...base, ...change(base) }
  })

  useLayoutEffect(() => {
    if (hidden) return
    const nav = navigationRef.current
    const panel = window.matchMedia('(min-width: 1024px)').matches ? nav?.closest('.study-navigation') : nav
    const row = nav?.querySelector('.category-topic-item--current .category-topic-row')
    if (!panel || !row || panel.scrollHeight <= panel.clientHeight) return
    const panelBounds = panel.getBoundingClientRect()
    const rowBounds = row.getBoundingClientRect()
    const tools = nav.querySelector('.category-rail-tools')
    const offset = tools && getComputedStyle(tools).position === 'sticky' ? tools.getBoundingClientRect().height : 0
    if (rowBounds.top < panelBounds.top + offset || rowBounds.bottom > panelBounds.bottom) {
      panel.scrollTop += rowBounds.top - panelBounds.top - offset
    }
  }, [topicId, hidden, status])

  const search = new URLSearchParams(location.search)
  for (const key of ['view', 'question', 'section']) search.delete(key)
  const sectionSearch = search.size ? `?${search}` : ''
  const categoryLabel = CATEGORY_METADATA[category]?.label || category

  const rows = useMemo(() => topics.map(topic => {
    const current = topic.id === topicId
    const headings = withGroups(current && sections.length ? sections : outlines[topic.id] || [])
    if (!searching) return { topic, current, headings, matches: [], titleMatch: false }
    const titleMatch = normalizeRailText(topic.title).includes(normalizedQuery)
    const matches = headings.filter(heading => normalizeRailText(cleanTitle(heading.title)).includes(normalizedQuery))
    return { topic, current, headings, matches, titleMatch }
  }), [topics, topicId, sections, outlines, searching, normalizedQuery])

  const visibleRows = searching ? rows.filter(row => row.titleMatch || row.matches.length > 0) : rows
  const openState = row => searching ? (overlay.open[row.topic.id] ?? row.matches.length > 0) : (expanded[row.topic.id] ?? row.current)
  const anyOpen = visibleRows.some(openState)
  const outlinesUnavailable = status !== 'ready'

  const collapseAll = () => {
    if (searching) updateOverlay(base => ({ open: Object.fromEntries([...Object.keys(base.open), ...visibleRows.map(row => row.topic.id)].map(id => [id, false])) }))
    else onCollapseAll?.()
  }

  return <nav ref={navigationRef} id="topic-table-of-contents" className="category-topic-navigation" aria-label={`${categoryLabel} topics`} hidden={hidden}>
    <div className="category-rail-tools">
      <Link className="category-topic-heading" to={`/category/${category}`}>{categoryLabel}<span>{topics.length} lessons</span></Link>
      <div className="category-rail-search" role="search">
        <label htmlFor={searchInputId} className="sr-only">Find a lesson or section in {categoryLabel}</label>
        <Icon name="search" size={16} className="category-rail-search-icon" />
        <input
          id={searchInputId}
          type="search"
          value={query}
          placeholder="Find a lesson or section"
          autoComplete="off"
          onChange={event => setQuery(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Escape' && query) { event.preventDefault(); event.stopPropagation(); setQuery('') }
          }}
        />
        {query && <button type="button" className="category-rail-clear" onClick={() => { setQuery(''); document.getElementById(searchInputId)?.focus() }} aria-label="Clear search"><Icon name="close" size={14} /></button>}
      </div>
      <div className="category-rail-actions">
        <p className="category-rail-count" role="status">{searching ? `${visibleRows.length} of ${topics.length} lessons match` : ''}</p>
        <button type="button" className="category-rail-collapse" onClick={collapseAll} disabled={!anyOpen}><Icon name="collapse" size={14} />Collapse all</button>
      </div>
      {status === 'loading' && <p className="category-outline-status" role="status">Loading subtopics…</p>}
      {status === 'error' && <div className="category-outline-status" role="status"><p>Other lessons’ subtopics couldn’t load.{searching && ' Search covers lesson titles and this lesson’s sections until they do.'}</p><button type="button" className="ui-button ui-button--secondary ui-button--compact" onClick={retry}>Retry subtopics</button></div>}
      {searching && outlinesUnavailable && status === 'loading' && <p className="category-outline-status">Searching lesson titles and this lesson’s sections while other outlines load.</p>}
    </div>
    {searching && visibleRows.length === 0 && <div className="category-rail-empty">
      <p>No lessons or sections in {categoryLabel} match “{query.trim()}”.</p>
      <button type="button" className="ui-button ui-button--secondary ui-button--compact" onClick={() => setQuery('')}>Clear search</button>
    </div>}
    <ol className="category-topic-list">
      {visibleRows.map(row => {
        const { topic, current } = row
        const open = openState(row)
        const panelId = `topic-outline-${topic.id}`
        const showingMatches = searching && row.matches.length > 0 && !overlay.showAll[topic.id]
        const headings = showingMatches ? row.matches : row.headings
        const toggle = () => searching
          ? updateOverlay(base => ({ open: { ...base.open, [topic.id]: !open } }))
          : onToggle(topic.id, !open)
        return <li key={topic.id} className={`category-topic-item${current ? ' category-topic-item--current' : ''}`}>
          <div className="category-topic-row">
            <Link className="category-topic-link" to={`/topic/${topic.id}`} aria-current={current ? 'page' : undefined}><Highlight text={topic.title} query={searching && row.titleMatch ? normalizedQuery : ''} /></Link>
            <button type="button" className="category-topic-toggle" onClick={toggle} aria-expanded={open} aria-controls={panelId} aria-label={`${open ? 'Collapse' : 'Expand'} ${topic.title}`}><svg aria-hidden="true" viewBox="0 0 16 16"><path d={open ? 'M3 10 8 5l5 5' : 'm3 6 5 5 5-5'} /></svg></button>
          </div>
          <ol id={panelId} className={`category-topic-sections${showingMatches ? ' category-topic-sections--matches' : ''}`} hidden={!open}>
            {headings.map(section => {
              const label = cleanTitle(section.title)
              return <li key={section.id} className={section.level === 3 ? 'toc-subsection' : undefined}>
                <Link to={`/topic/${topic.id}${sectionSearch}#${section.id}`} className={current && activeSection === section.id ? 'active' : undefined} aria-current={current && activeSection === section.id ? 'location' : undefined} aria-label={`Read ${label} in ${topic.title}`} onClick={() => { if (current) onSectionClick(section.id) }}>
                  {showingMatches && section.group && <span className="category-topic-context">{section.group}</span>}
                  <span><Highlight text={label} query={showingMatches ? normalizedQuery : ''} /></span>
                </Link>
              </li>
            })}
            {showingMatches && row.headings.length > row.matches.length && <li className="category-topic-more"><button type="button" onClick={() => updateOverlay(base => ({ showAll: { ...base.showAll, [topic.id]: true } }))}>Show all {row.headings.length} sections</button></li>}
            {open && headings.length === 0 && !current && status !== 'ready' && <li className="category-topic-pending">{status === 'error' ? 'Sections unavailable' : 'Loading sections…'}</li>}
          </ol>
        </li>
      })}
    </ol>
  </nav>
}
