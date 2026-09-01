import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
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
})
