import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DbmsVisualizer from '../visualizers/DbmsVisualizer'

describe('DbmsVisualizer Component Hub', () => {
  it('should render DbmsVisualizer with default relational-algebra tab', () => {
    const { container } = render(<DbmsVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })

  it('should render DbmsVisualizer with functional-dependencies-keys tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="functional-dependencies-keys" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })

  it('should render DbmsVisualizer with database-normalization tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="database-normalization" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Interactive DBMS Concept Visualizer Suite/i)).toBeDefined()
  })

  it('should route dbms-indexing to its own dedicated B+ Tree tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="dbms-indexing" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/B\+ Tree Index — Lookup, Insert & Node Split Mechanics/i)).toBeDefined()
  })

  it('should route concurrency-control to its own dedicated tab', () => {
    const { container } = render(<DbmsVisualizer defaultTopicId="concurrency-control" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Concurrency Control, 2PL & Timestamp Ordering/i)).toBeDefined()
  })
})
