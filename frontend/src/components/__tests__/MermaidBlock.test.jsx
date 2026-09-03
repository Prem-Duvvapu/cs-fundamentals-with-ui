import { act, render, screen, waitFor } from '@testing-library/react'
import MermaidBlock from '../markdown/MermaidBlock'

const mermaidMock = vi.hoisted(() => ({
  initialize: vi.fn(),
  render: vi.fn().mockResolvedValue({ svg: '<svg aria-label="Rendered flow"></svg>' })
}))

vi.mock('mermaid', () => ({ default: mermaidMock }))

beforeEach(() => {
  mermaidMock.initialize.mockClear()
  mermaidMock.render.mockClear()
})

it('reinitializes and rerenders mounted diagrams when the theme changes', async () => {
  render(<MermaidBlock code="flowchart LR; A-->B" />)

  await waitFor(() => expect(mermaidMock.render).toHaveBeenCalledTimes(1))
  await act(async () => {
    window.dispatchEvent(new CustomEvent('cs-fundamentals:theme-change', { detail: { theme: 'light' } }))
  })

  await waitFor(() => expect(mermaidMock.render).toHaveBeenCalledTimes(2))
  expect(mermaidMock.initialize).toHaveBeenCalledTimes(2)
  await waitFor(() => expect(screen.queryByText(/rendering diagram/i)).not.toBeInTheDocument())
})

it('serializes concurrent diagrams instead of racing mermaid.render', async () => {
  // Regression test: a topic with several diagrams mounts them all in the same tick, and
  // mermaid.initialize()/render() share module-level state inside the library — firing them
  // unserialized let one diagram's initialize() stomp state another's in-flight render() was
  // reading, and the observed symptom was a diagram stuck forever on "Rendering diagram…".
  const releases = []
  mermaidMock.render.mockImplementation((id) =>
    new Promise((resolve) => {
      releases.push(() => resolve({ svg: `<svg data-testid="${id}"></svg>` }))
    })
  )

  render(
    <>
      <MermaidBlock code="flowchart LR; A-->B" />
      <MermaidBlock code="flowchart LR; C-->D" />
    </>
  )

  await waitFor(() => expect(mermaidMock.render).toHaveBeenCalledTimes(1))
  // The second diagram must not call render() while the first is still in flight.
  expect(mermaidMock.render).toHaveBeenCalledTimes(1)

  await act(async () => releases[0]())
  await waitFor(() => expect(mermaidMock.render).toHaveBeenCalledTimes(2))

  await act(async () => releases[1]())
  await waitFor(() => expect(screen.queryByText(/rendering diagram/i)).not.toBeInTheDocument())
})

it('uses live CSS properties for Mermaid theme variables', async () => {
  const getComputedStyleSpy = vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    getPropertyValue: vi.fn((name) => ({
      '--bg-raised': '#raised',
      '--text-primary': '#primary',
      '--cat-base': '#category'
    })[name] || '')
  })

  render(<MermaidBlock code="flowchart LR; A-->B" />)

  await waitFor(() => expect(mermaidMock.initialize).toHaveBeenCalled())
  expect(mermaidMock.initialize).toHaveBeenLastCalledWith(expect.objectContaining({
    theme: 'base',
    fontFamily: 'var(--font-body)',
    themeVariables: expect.objectContaining({
      primaryColor: '#raised',
      primaryTextColor: '#primary',
      primaryBorderColor: '#category'
    })
  }))
  getComputedStyleSpy.mockRestore()
})
