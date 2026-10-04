import { useLayoutEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { CATEGORY_METADATA } from '../../utils/topicCategories'

export default function CategoryTopicNavigation({ category, topics, topicId, sections, activeSection, onSectionClick, expanded, onToggle, outlines, status, retry, hidden }) {
  const location = useLocation()
  const navigationRef = useRef(null)
  useLayoutEffect(() => {
    if (hidden) return
    const nav = navigationRef.current
    const panel = window.matchMedia('(min-width: 1024px)').matches ? nav?.closest('.study-navigation') : nav
    const row = nav?.querySelector('.category-topic-item--current .category-topic-row')
    if (!panel || !row || panel.scrollHeight <= panel.clientHeight) return
    const panelBounds = panel.getBoundingClientRect()
    const rowBounds = row.getBoundingClientRect()
    if (rowBounds.top < panelBounds.top || rowBounds.bottom > panelBounds.bottom) {
      panel.scrollTop += rowBounds.top - panelBounds.top
    }
  }, [topicId, hidden, status])
  const search = new URLSearchParams(location.search)
  for (const key of ['view', 'question', 'section']) search.delete(key)
  const sectionSearch = search.size ? `?${search}` : ''
  return <nav ref={navigationRef} id="topic-table-of-contents" className="category-topic-navigation" aria-label={`${CATEGORY_METADATA[category]?.label || category} topics`} hidden={hidden}>
    <Link className="category-topic-heading" to={`/category/${category}`}>{CATEGORY_METADATA[category]?.label || category}<span>{topics.length} lessons</span></Link>
    {status === 'loading' && <p className="category-outline-status" role="status">Loading subtopics…</p>}
    {status === 'error' && <div className="category-outline-status" role="status"><p>Other lessons’ subtopics couldn’t load.</p><button type="button" onClick={retry}>Retry subtopics</button></div>}
    <ol className="category-topic-list">
      {topics.map(topic => {
        const current = topic.id === topicId
        const open = expanded[topic.id] ?? current
        const headings = current && sections.length ? sections : outlines[topic.id] || []
        const panelId = `topic-outline-${topic.id}`
        return <li key={topic.id} className={`category-topic-item${current ? ' category-topic-item--current' : ''}`}>
          <div className="category-topic-row">
            <Link className="category-topic-link" to={`/topic/${topic.id}`} aria-current={current ? 'page' : undefined}>{topic.title}</Link>
            <button type="button" className="category-topic-toggle" onClick={() => onToggle(topic.id, !open)} aria-expanded={open} aria-controls={panelId} aria-label={`${open ? 'Collapse' : 'Expand'} ${topic.title}`}><svg aria-hidden="true" viewBox="0 0 16 16"><path d={open ? 'M3 10 8 5l5 5' : 'm3 6 5 5 5-5'} /></svg></button>
          </div>
          <ol id={panelId} className="category-topic-sections" hidden={!open}>
            {headings.map(section => <li key={section.id} className={section.level === 3 ? 'toc-subsection' : undefined}>
              <Link to={`/topic/${topic.id}${sectionSearch}#${section.id}`} className={current && activeSection === section.id ? 'active' : undefined} aria-current={current && activeSection === section.id ? 'location' : undefined} aria-label={`Read ${section.title.replace(/^(🟢|🟡|🔴)\s*/, '')} in ${topic.title}`} onClick={() => { if (current) onSectionClick(section.id) }}>{section.title.replace(/^(🟢|🟡|🔴)\s*/, '')}</Link>
            </li>)}
          </ol>
        </li>
      })}
    </ol>
  </nav>
}
