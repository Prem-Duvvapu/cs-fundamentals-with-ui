import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import RelationalAlgebraVisualizer from '../visualizers/dbms/RelationalAlgebraVisualizer'
import FunctionalDependencyVisualizer from '../visualizers/dbms/FunctionalDependencyVisualizer'
import NormalizationVisualizer from '../visualizers/dbms/NormalizationVisualizer'
import ConcurrencyControlVisualizer from '../visualizers/dbms/ConcurrencyControlVisualizer'
import BPlusTreeVisualizer from '../visualizers/dbms/BPlusTreeVisualizer'

describe('Individual DBMS Visualizers', () => {
  it('should render RelationalAlgebraVisualizer with initial selection operation', () => {
    const { container } = render(<RelationalAlgebraVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Relational Algebra, Tuple Calculus & Joins/i)).toBeDefined()
    expect(screen.getByText(/Selection \(σ\)/i)).toBeDefined()
  })

  it('should render FunctionalDependencyVisualizer with closure mode', () => {
    const { container } = render(<FunctionalDependencyVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Keys, Functional Dependencies & Minimal Canonical Cover/i)).toBeDefined()
    expect(screen.getAllByText(/Attribute Closure \(X\)⁺/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should render NormalizationVisualizer with 3NF violation scenario', () => {
    const { container } = render(<NormalizationVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Database Normalization \(1NF to BCNF\) & Decompositions/i)).toBeDefined()
  })

  it('should render ConcurrencyControlVisualizer with Strict 2PL', () => {
    const { container } = render(<ConcurrencyControlVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Concurrency Control, 2PL & Timestamp Ordering/i)).toBeDefined()
  })

  it('should render BPlusTreeVisualizer with split mechanics', () => {
    const { container } = render(<BPlusTreeVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/B\+ Tree Index — Lookup, Insert & Node Split Mechanics/i)).toBeDefined()
  })
})
