import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import JavaSpringVisualizer from '../visualizers/JavaSpringVisualizer'

describe('JavaSpringVisualizer Component Hub', () => {
  it('should render JavaSpringVisualizer successfully with default pipeline tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="java-execution-pipeline" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Java, Spring Boot, JPA & Enterprise Batch Engine/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for jvm-gc tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="jvm-gc" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Java, Spring Boot, JPA & Enterprise Batch Engine/i)).toBeDefined()
  })

  it('should render JavaSpringVisualizer successfully for spring-bean-lifecycle tab', () => {
    const { container } = render(<JavaSpringVisualizer defaultTopicId="spring-bean-lifecycle" />)
    expect(container).toBeDefined()
    expect(screen.getByText(/Java, Spring Boot, JPA & Enterprise Batch Engine/i)).toBeDefined()
  })
})
