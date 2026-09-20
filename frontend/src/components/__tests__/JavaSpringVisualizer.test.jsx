import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'
import JavaSpringVisualizer from '../visualizers/JavaSpringVisualizer'

describe('JavaSpringVisualizer Component Hub', () => {
  it('should render JavaSpringVisualizer successfully with default jvm tab', () => {
    const { container } = render(<JavaSpringVisualizer />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Java, Spring Boot & JPA Runtime Engine/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for jvm-gc tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="jvm-gc" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Java, Spring Boot & JPA Runtime Engine/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for spring-mvc-lifecycle tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="spring-mvc-lifecycle" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Spring MVC DispatcherServlet Request Execution Pipeline/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for quartz-scheduler tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="quartz-scheduler" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Quartz Scheduler Execution & Misfire Engine/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for event-driven-messaging tab', () => {
    render(<JavaSpringVisualizer defaultTopicId="event-driven-messaging" />)
    expect(screen.getByText(/Outbox Row/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Happy Path/i })).toHaveClass('is-active')
  })

  it('event-driven-messaging: switching to redelivery-duplicate scenario updates the step view', () => {
    render(<JavaSpringVisualizer defaultTopicId="event-driven-messaging" />)
    fireEvent.click(screen.getByRole('button', { name: /Crash & Redelivery/i }))
    expect(screen.getByRole('button', { name: /Crash & Redelivery/i })).toHaveClass('is-active')
    expect(screen.getByText(/one atomic DB transaction/i)).toBeInTheDocument()
  })

  it('should render JavaSpringVisualizer successfully for microservices-patterns tab', () => {
    render(<JavaSpringVisualizer defaultTopicId="microservices-patterns" />)
    expect(screen.getByText(/Circuit Breaker Inspector/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Healthy Service/i })).toHaveClass('is-active')
  })

  it('circuit-breaker: switching to failure-spike scenario and stepping to call 9 shows OPEN state', () => {
    render(<JavaSpringVisualizer defaultTopicId="microservices-patterns" />)
    fireEvent.click(screen.getByRole('button', { name: /Failure Spike/i }))
    const stepForward = screen.getByRole('button', { name: /step forward/i })
    for (let i = 0; i < 9; i++) fireEvent.click(stepForward)
    expect(screen.getByText('Call 9')).toBeInTheDocument()
    expect(screen.getAllByText('OPEN').length).toBeGreaterThan(0)
  })

  it('does not offer sub-tabs for topics that route directly to their own component', () => {
    // java-hashmap-internals, java-multithreading-concurrency, and spring-testing-production
    // each resolve straight to HashMapVisualizer/VirtualThreadsVisualizer/ConnectionPoolVisualizer
    // via topicVisualizerRegistry.jsx, so duplicating them here as manual-click-only sub-tabs was
    // dead UI reachable from no topic id.
    render(<JavaSpringVisualizer />)
    expect(screen.queryByRole('button', { name: /hashmap/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /virtual threads/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /hikaricp/i })).not.toBeInTheDocument()
  })
})
