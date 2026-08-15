import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import React from 'react'
import NetworkingVisualizer from '../visualizers/NetworkingVisualizer'

describe('NetworkingVisualizer Component', () => {
  const allNetworkingTopicIds = [
    'network-fundamentals',
    'physical-layer-media',
    'osi-model',
    'data-link-layer',
    'ip-subnetting',
    'routing-algorithms',
    'tcp-ip',
    'tcp-congestion',
    'transport-layer-protocols',
    'application-layer',
    'network-security',
    'network-performance-qos'
  ]

  allNetworkingTopicIds.forEach((topicId) => {
    it(`should render successfully without crashing for defaultTopicId: "${topicId}"`, () => {
      const { container } = render(<NetworkingVisualizer defaultTopicId={topicId} />)
      expect(container).toBeDefined()
      expect(screen.getByText(/Interactive Computer Networks Visualizer Suite/i)).toBeDefined()
    })
  })
})
