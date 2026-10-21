import fs from 'node:fs'
import path from 'node:path'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import catalog from '../../test/catalog.json'
import JavaCourseRevision from '../JavaCourseRevision'
import CategoryPage from '../../pages/CategoryPage'
import { parseMarkdownOutline } from '../../utils/markdownOutline'
import { readLearning, resetLearningStoreForTests, savePractice, saveReading } from '../../utils/learningState'

const lessons = catalog.filter(topic => topic.category === 'java-spring')
const files = {
  'java-oop-pillars': '01d-java-oop-pillars.md',
  'java-execution-pipeline': '01b-java-execution-pipeline.md'
}

beforeEach(() => {
  localStorage.clear()
  resetLearningStoreForTests()
  global.fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(catalog)))
})

afterEach(() => vi.restoreAllMocks())

function renderRevision(topics = lessons) {
  return render(<MemoryRouter><JavaCourseRevision topics={topics} progress={{}} learning={readLearning()} onToggleBookmark={vi.fn()} /></MemoryRouter>)
}

function openRevision(container) {
  const details = container.querySelector('.course-revision')
  expect(details.open).toBe(false)
  details.open = true
  fireEvent(details, new Event('toggle'))
  return within(details)
}

it('starts closed and uses course order with canonical catalog titles and existing topic IDs', () => {
  const { container } = renderRevision()
  const revision = openRevision(container)
  const list = revision.getByRole('list', { name: 'Java-by-Shrayansh revision order' })
  expect(within(list).getAllByRole('heading', { level: 3 }).map(heading => heading.textContent)).toEqual(
    ['java-oop-pillars', 'java-execution-pipeline'].map(id => lessons.find(topic => topic.id === id).title)
  )
  expect(within(list).getAllByRole('listitem').filter(item => item.classList.contains('lesson-row'))).toHaveLength(2)
  for (const [id, file] of Object.entries(files)) {
    const outline = parseMarkdownOutline(fs.readFileSync(path.resolve(process.cwd(), '../content/java-spring', file), 'utf8'))
    const anchors = revision.getAllByRole('link').filter(link => link.getAttribute('href')?.startsWith(`/topic/${id}#`))
    expect(anchors).toHaveLength(3)
    for (const anchor of anchors) expect(outline.some(heading => `#${heading.id}` === new URL(anchor.href).hash)).toBe(true)
    expect(revision.getByRole('link', { name: lessons.find(topic => topic.id === id).title })).toHaveAttribute('href', `/topic/${id}`)
  }
  for (const link of revision.getAllByRole('link', { name: /Original notes/ })) {
    expect(link).not.toHaveAttribute('target')
    expect(link).toHaveAttribute('href', expect.stringMatching(/^https:\/\/drive\.google\.com\/file\/d\//))
  }
})

it('does not invent lessons when the canonical catalog is incomplete or belongs to another category', () => {
  const { container, rerender } = renderRevision(lessons.filter(topic => topic.id !== 'java-oop-pillars'))
  expect(container.querySelector('details')).toBeNull()
  rerender(<MemoryRouter><JavaCourseRevision topics={lessons.map(topic => ({ ...topic, category: 'os' }))} progress={{}} learning={readLearning()} onToggleBookmark={vi.fn()} /></MemoryRouter>)
  expect(container.querySelector('details')).toBeNull()
})

it('shares bookmarks and completion with the main lesson list and preserves saved learning data', async () => {
  const topic = lessons.find(topic => topic.id === 'java-oop-pillars')
  localStorage.setItem('cs-fundamentals-progress', JSON.stringify({ [topic.id]: { bookmarked: false, completed: true } }))
  saveReading(topic.id, 'the-four-oop-pillars')
  savePractice({ id: `${topic.id}-q1`, question: 'Explain encapsulation.' }, { draft: 'Protect invariants through valid operations.', assessment: 'partial' })
  const saved = localStorage.getItem('cs-fundamentals-learning-v1')
  const { container } = render(<MemoryRouter initialEntries={['/category/java-spring']}><Routes><Route path="/category/:categoryId" element={<CategoryPage />} /></Routes></MemoryRouter>)
  await screen.findByText('Revisit Java-by-Shrayansh')
  const revision = openRevision(container)
  expect(revision.getByText('Completed')).toBeInTheDocument()
  expect(revision.getByRole('link', { name: `Continue reading: ${topic.title}` })).toHaveAttribute('href', `/topic/${topic.id}#the-four-oop-pillars`)
  fireEvent.click(revision.getByRole('button', { name: `Bookmark ${topic.title}` }))
  expect(screen.getAllByRole('button', { name: `Remove ${topic.title} from bookmarks` })).toHaveLength(2)
  expect(JSON.parse(localStorage.getItem('cs-fundamentals-progress'))[topic.id]).toEqual({ bookmarked: true, completed: true })
  fireEvent.click(screen.getAllByRole('button', { name: `Remove ${topic.title} from bookmarks` })[1])
  expect(revision.getByRole('button', { name: `Bookmark ${topic.title}` })).toHaveAttribute('aria-pressed', 'false')
  expect(localStorage.getItem('cs-fundamentals-learning-v1')).toBe(saved)
  expect(revision.getByRole('link', { name: 'Practice: OOP pillars' })).toHaveAttribute('href', `/topic/${topic.id}?view=practice`)
})

it('only adds the familiar-course disclosure to the Java category', async () => {
  render(<MemoryRouter initialEntries={['/category/aiml']}><Routes><Route path="/category/:categoryId" element={<CategoryPage />} /></Routes></MemoryRouter>)
  await screen.findByRole('list', { name: 'AI & Machine Learning lessons' })
  expect(screen.queryByText('Revisit Java-by-Shrayansh')).not.toBeInTheDocument()
})
