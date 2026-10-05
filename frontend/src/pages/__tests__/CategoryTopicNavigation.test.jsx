import { beforeEach, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import catalog from '../../test/catalog.json'
import { CATEGORY_METADATA } from '../../utils/topicCategories'
import TopicPage from '../TopicPage'
import { TopicExpansionProvider } from '../../hooks/useTopicExpansion'

vi.mock('../../hooks/useCatalog', () => ({ default: () => ({ topics: catalog, status: 'ready', retry: vi.fn() }) }))

const markdown = '# Metadata\n\n## 🟢 Beginner Level\n\n### Mental model\n\nA simple explanation.\n\n## 🟡 Intermediate Level\n\n### Worked example\n\n## 🔴 Expert Level\n\n### Trade-offs'
function Location() { const location = useLocation(); return <output aria-label="Current URL">{location.pathname}{location.search}{location.hash}</output> }
function TestRoutes() { const location = useLocation(); return <Routes key={location.pathname}><Route path="/topic/:topicId" element={<TopicPage />} /></Routes> }
function mount(topic, suffix = '') {
  return render(<MemoryRouter initialEntries={[`/topic/${topic.id}${suffix}`]}><Location /><TopicExpansionProvider><TestRoutes /></TopicExpansionProvider></MemoryRouter>)
}
beforeEach(() => {
  localStorage.clear()
  window.matchMedia = vi.fn().mockReturnValue({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })
  HTMLElement.prototype.scrollIntoView = vi.fn()
  global.fetch = vi.fn(async url => String(url).includes('/outlines?')
    ? { ok: true, json: async () => catalog.filter(topic => topic.category === new URL(String(url), 'http://localhost').searchParams.get('category')).map(topic => ({ topicId: topic.id, headingsMarkdown: markdown })) }
    : { ok: true, text: async () => markdown })
})

it.each(Object.keys(CATEGORY_METADATA))('shows every %s lesson and expands only the active lesson by default', async category => {
  const topics = catalog.filter(topic => topic.category === category).sort((a, b) => a.order - b.order)
  mount(topics[0])
  const nav = await screen.findByRole('navigation', { name: `${CATEGORY_METADATA[category].label} topics` })
  await waitFor(() => expect(within(nav).queryByText('Loading subtopics…')).not.toBeInTheDocument(), { timeout: 10000 })
  expect(nav.querySelectorAll('.category-topic-link')).toHaveLength(topics.length)
  expect(within(nav).getByRole('link', { name: topics[0].title })).toHaveAttribute('aria-current', 'page')
  expect(within(nav).getByRole('button', { name: `Collapse ${topics[0].title}` })).toHaveAttribute('aria-expanded', 'true')
  const expand = within(nav).getByRole('button', { name: `Expand ${topics[1].title}` })
  expect(expand).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(expand)
  const section = within(nav).getByRole('link', { name: `Read Worked example in ${topics[1].title}` })
  expect(section).toHaveAttribute('href', `/topic/${topics[1].id}#worked-example`)
  fireEvent.click(within(nav).getByRole('button', { name: `Collapse ${topics[1].title}` }))
  expect(section.closest('ol')).toHaveAttribute('hidden')
})

it('opens another lesson at its section, preserves expanded lessons and reuses the category request', async () => {
  const topics = catalog.filter(topic => topic.category === 'os').sort((a, b) => a.order - b.order)
  mount(topics[0], '?source=course&section=Mental%20model')
  const nav = await screen.findByRole('navigation', { name: 'Operating Systems topics' })
  fireEvent.click(within(nav).getByRole('button', { name: `Expand ${topics[1].title}` }))
  const section = await within(nav).findByRole('link', { name: `Read Worked example in ${topics[1].title}` })
  fireEvent.click(section)
  expect(await screen.findByRole('heading', { level: 1, name: topics[1].title })).toBeInTheDocument()
  await waitFor(() => expect(HTMLElement.prototype.scrollIntoView.mock.instances.some(element => element.id === 'worked-example')).toBe(true), { timeout: 10000 })
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/topic/${topics[1].id}?source=course#worked-example`)
  expect(within(screen.getByRole('navigation', { name: 'Operating Systems topics' })).getByRole('button', { name: `Collapse ${topics[0].title}` })).toHaveAttribute('aria-expanded', 'true')
  expect(global.fetch.mock.calls.filter(([url]) => String(url).includes('/outlines?')).length).toBeLessThanOrEqual(1)
  expect(global.fetch.mock.calls.filter(([url]) => String(url).includes('/content/')).length).toBe(2)
})

it('provides recovery for failed outlines while current-lesson sections remain usable', async () => {
  const topics = catalog.filter(topic => topic.category === 'aiml')
  // A separate mounted hook category avoids the successful cache from the category tests.
  vi.resetModules()
  const { default: FreshTopicPage } = await import('../TopicPage')
  let failed = true
  global.fetch = vi.fn(async url => String(url).includes('/outlines?')
    ? failed ? { ok: false } : { ok: true, json: async () => topics.map(topic => ({ topicId: topic.id, headingsMarkdown: markdown })) }
    : { ok: true, text: async () => markdown })
  render(<MemoryRouter initialEntries={[`/topic/${topics[0].id}`]}><Routes><Route path="/topic/:topicId" element={<FreshTopicPage />} /></Routes></MemoryRouter>)
  const retry = await screen.findByRole('button', { name: 'Retry subtopics' })
  expect(await screen.findByRole('link', { name: `Read Mental model in ${topics[0].title}` })).toBeInTheDocument()
  failed = false
  fireEvent.click(retry)
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Retry subtopics' })).not.toBeInTheDocument())
  fireEvent.click(screen.getByRole('button', { name: `Expand ${topics[1].title}` }))
  expect(screen.getByRole('link', { name: `Read Mental model in ${topics[1].title}` })).toBeInTheDocument()
})

it('keeps the category tree in Practice and section links return to Study', async () => {
  const topic = catalog.find(topic => topic.id === 'docker-fundamentals')
  mount(topic, '?view=practice&question=docker-fundamentals-q1&source=course')
  const section = await screen.findByRole('link', { name: `Read Worked example in ${topic.title}` })
  expect(section).toHaveAttribute('href', '/topic/docker-fundamentals?source=course#worked-example')
  fireEvent.click(section)
  expect(screen.getByRole('tab', { name: 'Study' })).toHaveAttribute('aria-selected', 'true')
  expect(await screen.findByRole('heading', { name: 'Worked example' })).toBeInTheDocument()
})

const osTopics = () => catalog.filter(topic => topic.category === 'os').sort((a, b) => a.order - b.order)
async function osRail(suffix = '') {
  const topics = osTopics()
  mount(topics[0], suffix)
  const nav = await screen.findByRole('navigation', { name: 'Operating Systems topics' })
  await waitFor(() => expect(within(nav).queryByText('Loading subtopics…')).not.toBeInTheDocument(), { timeout: 10000 })
  return { nav, topics, rail: within(nav) }
}

it('collapses every lesson, keeps that choice through a view change, and reopens the current lesson from its chevron', async () => {
  const { rail, topics } = await osRail()
  fireEvent.click(rail.getByRole('button', { name: `Expand ${topics[2].title}` }))
  fireEvent.click(rail.getByRole('button', { name: 'Collapse all' }))
  for (const topic of topics) expect(rail.getByRole('button', { name: `Expand ${topic.title}` })).toHaveAttribute('aria-expanded', 'false')
  expect(rail.getByRole('button', { name: 'Collapse all' })).toBeDisabled()
  expect(rail.getByRole('link', { name: topics[0].title })).toHaveAttribute('aria-current', 'page')

  fireEvent.click(screen.getByRole('tab', { name: 'Practice' }))
  fireEvent.click(screen.getByRole('tab', { name: 'Study' }))
  const nav = within(await screen.findByRole('navigation', { name: 'Operating Systems topics' }))
  expect(nav.getByRole('button', { name: `Expand ${topics[0].title}` })).toHaveAttribute('aria-expanded', 'false')

  const reopen = nav.getByRole('button', { name: `Expand ${topics[0].title}` })
  reopen.focus()
  fireEvent.click(reopen)
  expect(nav.getByRole('button', { name: `Collapse ${topics[0].title}` })).toHaveAttribute('aria-expanded', 'true')
  expect(nav.getByRole('link', { name: `Read Worked example in ${topics[0].title}` })).toBeInTheDocument()
})

it('searches titles and headings with level context, then restores the prior expansion when cleared', async () => {
  const { rail, topics } = await osRail()
  fireEvent.click(rail.getByRole('button', { name: `Expand ${topics[1].title}` }))
  const input = rail.getByRole('searchbox', { name: /find a lesson or section/i })

  fireEvent.change(input, { target: { value: 'trade' } })
  expect(rail.getByRole('status', { name: '' })).toHaveTextContent(`${topics.length} of ${topics.length} lessons match`)
  const match = rail.getByRole('link', { name: `Read Trade-offs in ${topics[3].title}` })
  expect(match).toHaveTextContent('Expert Level')
  expect(match.querySelector('mark')).toHaveTextContent('Trade')
  expect(rail.queryByRole('link', { name: `Read Mental model in ${topics[3].title}` })).not.toBeInTheDocument()
  fireEvent.click(rail.getAllByRole('button', { name: /^Show all \d+ sections$/ })[3])
  expect(rail.getByRole('link', { name: `Read Mental model in ${topics[3].title}` })).toBeInTheDocument()

  fireEvent.change(input, { target: { value: topics[2].title.slice(0, 10) } })
  expect(rail.getByRole('link', { name: topics[2].title })).toBeInTheDocument()
  expect(rail.getByRole('button', { name: `Expand ${topics[2].title}` })).toHaveAttribute('aria-expanded', 'false')
  fireEvent.click(rail.getByRole('button', { name: `Expand ${topics[2].title}` }))
  expect(rail.getByRole('link', { name: `Read Worked example in ${topics[2].title}` })).toBeInTheDocument()

  fireEvent.click(rail.getByRole('button', { name: 'Clear search' }))
  expect(input).toHaveValue('')
  expect(input).toHaveFocus()
  expect(rail.getByRole('button', { name: `Collapse ${topics[1].title}` })).toHaveAttribute('aria-expanded', 'true')
  expect(rail.getByRole('button', { name: `Expand ${topics[2].title}` })).toHaveAttribute('aria-expanded', 'false')
  expect(rail.getByRole('button', { name: `Collapse ${topics[0].title}` })).toHaveAttribute('aria-expanded', 'true')
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/topic/${topics[0].id}`)
})

it('explains an empty search, clears it with Escape and never navigates while filtering', async () => {
  const { rail, topics } = await osRail()
  const input = rail.getByRole('searchbox', { name: /find a lesson or section/i })
  fireEvent.change(input, { target: { value: 'no such concept here' } })
  const empty = rail.getByText(/No lessons or sections in Operating Systems match/)
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/topic/${topics[0].id}`)
  fireEvent.click(within(empty.parentElement).getByRole('button', { name: 'Clear search' }))
  expect(input).toHaveValue('')
  fireEvent.change(input, { target: { value: 'mental' } })
  fireEvent.keyDown(input, { key: 'Escape' })
  expect(input).toHaveValue('')
  expect(rail.getAllByRole('link').length).toBeGreaterThan(topics.length)
})

it('keeps the query through the remount after opening a result in another lesson', async () => {
  const { rail, topics } = await osRail('?source=course')
  fireEvent.change(rail.getByRole('searchbox', { name: /find a lesson or section/i }), { target: { value: 'worked' } })
  fireEvent.click(rail.getByRole('link', { name: `Read Worked example in ${topics[4].title}` }))
  expect(await screen.findByRole('heading', { level: 1, name: topics[4].title })).toBeInTheDocument()
  expect(screen.getByLabelText('Current URL')).toHaveTextContent(`/topic/${topics[4].id}?source=course#worked-example`)
  const nav = within(await screen.findByRole('navigation', { name: 'Operating Systems topics' }))
  expect(nav.getByRole('searchbox', { name: /find a lesson or section/i })).toHaveValue('worked')
  fireEvent.click(nav.getByRole('button', { name: 'Clear search' }))
  expect(nav.getByRole('button', { name: `Collapse ${topics[4].title}` })).toHaveAttribute('aria-expanded', 'true')
})

it('scopes a rail query to its category, so another category starts with an empty search', async () => {
  const { useRailSearch } = await import('../../hooks/useTopicExpansion')
  function Probe({ category }) {
    const [query, setQuery] = useRailSearch(category)
    return <><output aria-label={`${category} query`}>{query}</output><button onClick={() => setQuery('locks')}>Search {category}</button></>
  }
  const { rerender } = render(<TopicExpansionProvider><Probe category="os" /></TopicExpansionProvider>)
  fireEvent.click(screen.getByRole('button', { name: 'Search os' }))
  expect(screen.getByLabelText('os query')).toHaveTextContent('locks')
  rerender(<TopicExpansionProvider><Probe category="dbms" /></TopicExpansionProvider>)
  expect(screen.getByLabelText('dbms query')).toHaveTextContent('')
})

it('keeps title search useful and says so when other outlines fail', async () => {
  const topics = catalog.filter(topic => topic.category === 'devops').sort((a, b) => a.order - b.order)
  vi.resetModules()
  const { default: FreshTopicPage } = await import('../TopicPage')
  global.fetch = vi.fn(async url => String(url).includes('/outlines?') ? { ok: false } : { ok: true, text: async () => markdown })
  render(<MemoryRouter initialEntries={[`/topic/${topics[0].id}`]}><Routes><Route path="/topic/:topicId" element={<FreshTopicPage />} /></Routes></MemoryRouter>)
  await screen.findByRole('button', { name: 'Retry subtopics' })
  await screen.findByRole('link', { name: `Read Mental model in ${topics[0].title}` })
  fireEvent.change(screen.getByRole('searchbox', { name: /find a lesson or section/i }), { target: { value: topics[2].title.slice(0, 8) } })
  expect(screen.getByRole('link', { name: topics[2].title })).toBeInTheDocument()
  expect(screen.getByText(/Search covers lesson titles and this lesson’s sections/)).toBeInTheDocument()
  fireEvent.change(screen.getByRole('searchbox', { name: /find a lesson or section/i }), { target: { value: 'mental' } })
  expect(screen.getByRole('link', { name: `Read Mental model in ${topics[0].title}` })).toBeInTheDocument()
})
