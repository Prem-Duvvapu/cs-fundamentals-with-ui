import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PracticeReview from '../shared/PracticeReview'
import { readLearning, updateLearning } from '../../utils/learningState'

beforeEach(() => {
  localStorage.clear()
  window.dispatchEvent(new StorageEvent('storage', { key: null }))
})

it('links to the exact question and makes later and imported answers reachable', () => {
  updateLearning(state => {
    const practice = {}
    for (let number = 1; number <= 21; number += 1) {
      practice[`java-execution-pipeline:Question ${number}?`] = { draft: `Answer ${number}`, assessment: 'review', updatedAt: number }
    }
    practice['java-execution-pipeline:Question 1? [imported 12]'] = { draft: 'Imported answer', assessment: '', updatedAt: 30 }
    return { ...state, practice }
  })
  render(<MemoryRouter><PracticeReview topics={[{ id: 'java-execution-pipeline', title: 'Java Execution' }]} /></MemoryRouter>)
  expect(screen.queryByRole('status')).not.toBeInTheDocument()
  expect(screen.getByText('Imported answer')).toBeInTheDocument()
  const links = screen.getAllByRole('link', { name: 'Practice this exact question' })
  expect(links[0].getAttribute('href')).toContain('question=java-execution-pipeline%3AQuestion')
  expect(screen.getByRole('button', { name: 'Show more saved answers' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show more saved answers' }))
  expect(screen.getAllByRole('link', { name: 'Practice this exact question' })).toHaveLength(21)
})

it('keeps both drafts when an imported alternative is adopted and confirms deletion', () => {
  const base = 'java-execution-pipeline:Why does this work?'
  const alternative = base + ' [imported 123]'
  updateLearning(state => ({ ...state, practice: {
    [base]: { draft: 'Current reasoning', assessment: 'review', updatedAt: 1 },
    [alternative]: { draft: 'Different reasoning', assessment: '', updatedAt: 2 },
    'java-execution-pipeline:Already known?': { draft: 'Confident answer', assessment: 'confident', updatedAt: 3 }
  } }))
  render(<MemoryRouter><PracticeReview topics={[{ id: 'java-execution-pipeline', title: 'Java Execution' }]} /></MemoryRouter>)

  const alternativeItem = screen.getByRole('button', { name: 'Use this version for practice' }).closest('li')
  fireEvent.click(within(alternativeItem).getByText('Compare this version with your current answer'))
  expect(within(alternativeItem).getByText('Current reasoning')).toBeInTheDocument()
  expect(within(alternativeItem).getByText('Different reasoning')).toBeInTheDocument()
  fireEvent.click(within(alternativeItem).getByRole('button', { name: 'Use this version for practice' }))
  expect(readLearning().practice[base].draft).toBe('Current reasoning')
  fireEvent.click(within(alternativeItem).getByRole('button', { name: 'Confirm use of this version' }))
  expect(readLearning().practice[base].draft).toBe('Different reasoning')
  expect(readLearning().practice[alternative].draft).toBe('Current reasoning')

  fireEvent.click(screen.getByRole('button', { name: 'All answers (3)' }))
  expect(screen.getByText('Confident answer')).toBeInTheDocument()
  const adoptedAlternative = screen.getByRole('button', { name: 'Use this version for practice' }).closest('li')
  fireEvent.click(within(adoptedAlternative).getByRole('button', { name: 'Delete this saved answer' }))
  fireEvent.click(within(adoptedAlternative).getByRole('button', { name: 'Cancel' }))
  expect(readLearning().practice[alternative].draft).toBe('Current reasoning')
  fireEvent.click(within(adoptedAlternative).getByRole('button', { name: 'Delete this saved answer' }))
  fireEvent.click(within(adoptedAlternative).getByRole('button', { name: 'Confirm delete this answer' }))
  expect(readLearning().practice[alternative]).toBeUndefined()
  expect(readLearning().practice[base].draft).toBe('Different reasoning')
})

it('keeps an empty state and focus target after the last answer is deleted', async () => {
  const key = 'java-execution-pipeline:What is bytecode?'
  updateLearning(state => ({ ...state, practice: { [key]: { draft: 'Compiled instructions', assessment: 'review', updatedAt: 1 } } }))
  render(<MemoryRouter><PracticeReview topics={[{ id: 'java-execution-pipeline', title: 'Java Execution' }]} /></MemoryRouter>)
  fireEvent.click(screen.getByRole('button', { name: 'Delete this saved answer' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm delete this answer' }))
  expect(screen.getByText('No saved interview answers yet. Save an answer in Interview Mode to see it here.')).toBeInTheDocument()
  await waitFor(() => expect(screen.getByRole('status')).toHaveFocus())
})
