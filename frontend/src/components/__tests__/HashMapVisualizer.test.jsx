import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import HashMapVisualizer from '../visualizers/java/HashMapVisualizer'

vi.mock('../shared/ConceptModuleShell', () => ({
  default: ({ subtitle, mentalModel, theoryData, quizData, simulationComponent }) => <>
    <p>{subtitle}</p><p>{mentalModel}</p>
    <p>{theoryData.interviewQA[0].a}</p><p>{quizData[0].answer}</p>
    {simulationComponent}
  </>
}))
afterEach(cleanup)

describe('HashMap teaching boundaries', () => {
  it('explains the modeled put threshold and corrects immutable legacy answers in the display copy', () => {
    render(<HashMapVisualizer />)
    expect(screen.getByText(/tree search and ConcurrentHashMap execution are not simulated/)).toBeInTheDocument()
    expect(screen.getByText(/eight entries can remain a list at capacity 32/)).toBeInTheDocument()
    expect(screen.getByText(/Math.floorMod/)).toBeInTheDocument()
    expect(screen.queryByText('🌳 Tree bin (modeled)')).not.toBeInTheDocument()
  })
})
