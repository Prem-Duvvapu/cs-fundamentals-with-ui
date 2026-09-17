import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import ProgressPage from '../ProgressPage'
import { fetchTopics } from '../../utils/api'
import { toggleBookmark, toggleCompleted, exportProgress } from '../../utils/topicProgress'

vi.mock('../../utils/api', () => ({
  fetchTopics: vi.fn()
}))

const topics = [
  { id: 'java-oop-pillars', category: 'java-spring', title: 'OOP Pillars', level: 'beginner', summary: 'Pillars of OOP.' },
  { id: 'deadlocks', category: 'os', title: 'Deadlocks', level: 'intermediate', summary: 'Prevention and recovery.' },
  { id: 'osi-model', category: 'networking', title: 'OSI Model', level: 'beginner', summary: 'Layered reference model.' }
]

function renderPage() {
  return render(
    <MemoryRouter>
      <ProgressPage />
    </MemoryRouter>
  )
}

describe('ProgressPage', () => {
  beforeEach(() => {
    window.localStorage.clear()
    vi.mocked(fetchTopics).mockResolvedValue(topics)
  })

  it('shows a loading state before topics arrive', () => {
    vi.mocked(fetchTopics).mockReturnValue(new Promise(() => {})) // never resolves
    renderPage()
    expect(screen.getByRole('status')).toHaveTextContent('Loading your progress…')
  })

  it('shows an error state when topics fail to load', async () => {
    vi.mocked(fetchTopics).mockRejectedValue(new Error('offline'))
    renderPage()
    expect(await screen.findByRole('alert')).toHaveTextContent(/couldn't load your progress/i)
  })

  it('reports overall completion once topics load, with nothing completed yet', async () => {
    renderPage()
    expect(await screen.findByText('0 of 3 topics completed (0%)')).toBeInTheDocument()
  })

  it('reflects completed topics in the overall count and the category/level breakdowns', async () => {
    toggleCompleted('java-oop-pillars')
    toggleCompleted('deadlocks')
    renderPage()

    expect(await screen.findByText('2 of 3 topics completed (67%)')).toBeInTheDocument()

    const categorySection = screen.getByRole('heading', { name: 'By category' }).closest('section')
    const javaRow = within(categorySection).getByText('Java & Spring').closest('li')
    expect(within(javaRow).getByText('1 of 1')).toBeInTheDocument()

    const levelSection = screen.getByRole('heading', { name: 'By level' }).closest('section')
    const beginnerRow = within(levelSection).getByText('Beginner').closest('li')
    expect(within(beginnerRow).getByText('1 of 2')).toBeInTheDocument()
  })

  it('suggests the first not-completed topic in curriculum order to continue with', async () => {
    renderPage()
    const nextSection = await screen.findByRole('heading', { name: 'Continue where you left off' })
    expect(nextSection.closest('section')).toHaveTextContent('OOP Pillars')
    expect(within(nextSection.closest('section')).getByRole('link', { name: 'Study OOP Pillars' })).toHaveAttribute('href', '/topic/java-oop-pillars')
  })

  it('omits the continue section once every topic is completed', async () => {
    topics.forEach((topic) => toggleCompleted(topic.id))
    renderPage()

    await screen.findByText('3 of 3 topics completed (100%)')
    expect(screen.queryByRole('heading', { name: 'Continue where you left off' })).not.toBeInTheDocument()
  })

  it('shows an empty state when nothing is bookmarked', async () => {
    renderPage()
    expect(await screen.findByText(/no bookmarks yet/i)).toBeInTheDocument()
  })

  it('lists bookmarked topics with working study links', async () => {
    toggleBookmark('deadlocks')
    renderPage()

    expect(await screen.findByRole('link', { name: 'Study Deadlocks' })).toHaveAttribute('href', '/topic/deadlocks')
  })

  it('exports progress as a downloaded JSON file', async () => {
    if (!URL.createObjectURL) URL.createObjectURL = vi.fn()
    if (!URL.revokeObjectURL) URL.revokeObjectURL = vi.fn()
    const createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    const revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    renderPage()
    await screen.findByRole('heading', { name: 'Progress Dashboard' })
    fireEvent.click(screen.getByRole('button', { name: 'Export progress' }))

    expect(createObjectURL).toHaveBeenCalledTimes(1)
    const [blob] = createObjectURL.mock.calls[0]
    expect(blob.type).toBe('application/json')
    expect(clickSpy).toHaveBeenCalledTimes(1)
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    clickSpy.mockRestore()
  })

  it('imports a progress file and reports how many topics were merged', async () => {
    toggleBookmark('deadlocks')
    const fixture = exportProgress()
    window.localStorage.clear()

    renderPage()
    await screen.findByRole('heading', { name: 'Progress Dashboard' })

    const file = new File([JSON.stringify(fixture)], 'progress.json', { type: 'application/json' })
    const input = document.querySelector('.progress-transfer-input')
    await fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('Imported progress for 1 topic.')).toBeInTheDocument()
    expect(await screen.findByRole('link', { name: 'Study Deadlocks' })).toHaveAttribute('href', '/topic/deadlocks')
  })

  it('rejects an invalid progress file without changing any state', async () => {
    renderPage()
    await screen.findByRole('heading', { name: 'Progress Dashboard' })

    const file = new File(['not json'], 'progress.json', { type: 'application/json' })
    const input = document.querySelector('.progress-transfer-input')
    await fireEvent.change(input, { target: { files: [file] } })

    expect(await screen.findByText('That file is not valid JSON.')).toBeInTheDocument()
  })
})
