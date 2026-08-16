import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DbmsVisualizer from '../visualizers/DbmsVisualizer'

describe('DbmsVisualizer Component Hub', () => {
  it('should render DbmsVisualizer with default architecture tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="dbms-architecture" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })

  it('should render DbmsVisualizer with relational algebra tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="relational-algebra-calculus" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })

  it('should render DbmsVisualizer with concurrency control tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="concurrency-control" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })
})
