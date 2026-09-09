import { act, fireEvent, render, screen } from '@testing-library/react'
import MermaidBlock from '../markdown/MermaidBlock'

vi.mock('../../generated/diagramManifest.json', () => ({
  default: {
    '0aeb077d': { source: 'content/example.md', width: 640, height: 320 },
    '7d828d65': { source: 'content/example.md', width: 480, height: 240 }
  }
}))

beforeEach(() => {
  document.documentElement.dataset.theme = 'dark'
})

it('uses the pre-rendered dark asset with intrinsic dimensions and accessible text', () => {
  const { container } = render(<MermaidBlock code="flowchart LR; A-->B" />)

  const image = screen.getByRole('img', { name: /flowchart for the surrounding lesson/i })
  expect(image).toHaveAttribute('src', '/diagrams/0aeb077d-dark.svg')
  expect(image).toHaveAttribute('width', '640')
  expect(image).toHaveAttribute('height', '320')
  expect(image).toHaveAttribute('loading', 'lazy')
  expect(container.querySelector('.mermaid-block')).toHaveAttribute('data-diagram-hash', '0aeb077d')
  expect(container.querySelector('.mermaid-block')).toHaveAttribute('tabindex', '0')
  expect(screen.getByRole('link', { name: /open full-size diagram/i })).toHaveAttribute('href', '/diagrams/0aeb077d-dark.svg')
  expect(screen.getByText(/read diagram as text/i)).toBeInTheDocument()
  expect(screen.queryByText(/rendering diagram/i)).not.toBeInTheDocument()
})

it('switches to the matching static asset when the application theme changes', () => {
  render(<MermaidBlock code="flowchart LR; A-->B" />)

  act(() => {
    document.documentElement.dataset.theme = 'light'
    window.dispatchEvent(new CustomEvent('cs-fundamentals:theme-change', { detail: { theme: 'light' } }))
  })

  expect(screen.getByRole('img')).toHaveAttribute('src', '/diagrams/0aeb077d-light.svg')
})

it('shows the source immediately when the generated manifest has no matching diagram', () => {
  render(<MermaidBlock code="stateDiagram-v2\n  Missing --> Asset" />)

  expect(screen.getByRole('figure', { name: /diagram unavailable/i })).toHaveTextContent(/pre-rendered diagram is unavailable/i)
  expect(screen.getByText(/Missing --> Asset/)).toBeInTheDocument()
  expect(screen.queryByRole('img')).not.toBeInTheDocument()
})

it('shows the source when a generated image fails to load', () => {
  render(<MermaidBlock code="flowchart LR; C-->D" />)

  fireEvent.error(screen.getByRole('img'))

  expect(screen.getByRole('figure', { name: /diagram unavailable/i })).toHaveTextContent(/asset could not be loaded/i)
  expect(screen.getByText('flowchart LR; C-->D')).toBeInTheDocument()
})
