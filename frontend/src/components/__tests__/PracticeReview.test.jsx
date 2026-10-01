import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import PracticeReview from '../shared/PracticeReview'
import { updateLearning } from '../../utils/learningState'

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
  expect(screen.getByText('Imported answer')).toBeInTheDocument()
  const links = screen.getAllByRole('link', { name: /Practice this question/ })
  expect(links[0].getAttribute('href')).toContain('question=java-execution-pipeline%3AQuestion')
  expect(screen.getByRole('button', { name: 'Show more saved answers' })).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Show more saved answers' }))
  expect(screen.getByText('Answer 1')).toBeInTheDocument()
})
