import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import DbmsIntroVisualizer from '../visualizers/dbms/DbmsIntroVisualizer'
import ErModelVisualizer from '../visualizers/dbms/ErModelVisualizer'
import RelationalAlgebraVisualizer from '../visualizers/dbms/RelationalAlgebraVisualizer'
import FunctionalDependencyVisualizer from '../visualizers/dbms/FunctionalDependencyVisualizer'
import NormalizationVisualizer from '../visualizers/dbms/NormalizationVisualizer'
import ConcurrencyControlVisualizer from '../visualizers/dbms/ConcurrencyControlVisualizer'
import StorageIndexingVisualizer from '../visualizers/dbms/StorageIndexingVisualizer'
import QueryOptimizerVisualizer from '../visualizers/dbms/QueryOptimizerVisualizer'
import DistributedDbVisualizer from '../visualizers/dbms/DistributedDbVisualizer'
import TransactionsAcidVisualizer from '../visualizers/dbms/TransactionsAcidVisualizer'
import DbmsArchitectureVisualizer from '../visualizers/dbms/DbmsArchitectureVisualizer'
import BPlusTreeVisualizer from '../visualizers/dbms/BPlusTreeVisualizer'

describe('Individual DBMS Visualizers', () => {
  it('should render DbmsIntroVisualizer with redundancy anomaly scenario', () => {
    const { container } = render(<DbmsIntroVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/DBMS Introduction, Need & Architecture/i)).toBeDefined()
    expect(screen.getAllByText(/Traditional File System/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should render ErModelVisualizer with student-course scenario', () => {
    const { container } = render(<ErModelVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Entity-Relationship \(ER\) Modeling & Relational Table Converter/i)).toBeDefined()
    expect(screen.getAllByText(/STUDENT \[Strong\]/i).length).toBeGreaterThanOrEqual(1)
  })

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

  it('should render StorageIndexingVisualizer with RAID mode', () => {
    const { container } = render(<StorageIndexingVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/File Organization, RAID Storage & Advanced Indexing/i)).toBeDefined()
  })

  it('should render QueryOptimizerVisualizer with initial cost estimation', () => {
    const { container } = render(<QueryOptimizerVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Query Processing, Relational Trees & Cost-Based Optimizer/i)).toBeDefined()
  })

  it('should render DistributedDbVisualizer with 2PC protocol', () => {
    const { container } = render(<DistributedDbVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Distributed DBMS, 2-Phase Commit \(2PC\) & CAP Theorem/i)).toBeDefined()
  })

  it('should render TransactionsAcidVisualizer with state machine scenario', () => {
    const { container } = render(<TransactionsAcidVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Transactions, ACID States & Crash Recovery/i)).toBeDefined()
    expect(screen.getAllByText(/ACID State Machine/i).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/PARTIALLY COMMITTED|Partially Committed/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should render DbmsArchitectureVisualizer with 3-schema diagram', () => {
    const { container } = render(<DbmsArchitectureVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/DBMS Architecture & 3-Schema ANSI-SPARC/i)).toBeDefined()
    expect(screen.getAllByText(/External Level \(User Views\)/i).length).toBeGreaterThanOrEqual(1)
  })

  it('should render BPlusTreeVisualizer with split mechanics', () => {
    const { container } = render(<BPlusTreeVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/B\+ Tree Index — Lookup, Insert & Node Split Mechanics/i)).toBeDefined()
  })
})
