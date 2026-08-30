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
