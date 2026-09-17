import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import useProductTour from '../useProductTour'

function HomeStub() {
  return (
    <div>
      <div className="roadmap-selectors" />
      <div className="level-selectors" />
      <div className="topic-row" />
    </div>
  )
}

function TopicStub() {
  return (
    <div>
      <h1 className="topic-page-title">CPU Scheduling</h1>
      <div className="main-tab-switcher" />
    </div>
  )
}

// The hook host (`children`) is a sibling of `<Routes>`, matching how App.jsx mounts
// useProductTour once at the layout level so its state survives route changes — the Route
// elements themselves are free to unmount/remount as the location changes.
function wrapper({ children }) {
  return (
    <MemoryRouter initialEntries={['/']}>
      {children}
      <Routes>
        <Route path="/" element={<HomeStub />} />
        <Route path="/topic/:topicId" element={<TopicStub />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderTour() {
  const rendered = renderHook(() => useProductTour(), { wrapper })
  act(() => rendered.result.current.start())
  return rendered
}

describe('useProductTour', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  // The tour is opt-in: it must never interrupt a visitor who did not ask for it.
  it('never opens on its own', () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })
    expect(result.current.active).toBe(false)
  })

  it('start() opens the tour at step 1, every time', () => {
    const { result } = renderTour()

    expect(result.current.active).toBe(true)
    expect(result.current.stepNumber).toBe(1)

    act(() => result.current.skip())
    act(() => result.current.start())

    expect(result.current.active).toBe(true)
    expect(result.current.stepNumber).toBe(1)
  })

  it('locates the current step target element on the home route', async () => {
    const { result } = renderTour()

    await act(async () => { result.current.next() }) // -> categories
    await waitFor(() => expect(result.current.targetEl).not.toBeNull())
    expect(result.current.targetEl.className).toBe('roadmap-selectors')
  })

  it('steps back and forward without losing track of position', async () => {
    const { result } = renderTour()

    await act(async () => { result.current.next() })
    await act(async () => { result.current.next() })
    expect(result.current.stepNumber).toBe(3)

    await act(async () => { result.current.back() })
    expect(result.current.stepNumber).toBe(2)
    expect(result.current.canGoBack).toBe(true)
  })

  it('never steps back before the first step', () => {
    const { result } = renderTour()
    act(() => result.current.back())
    expect(result.current.stepNumber).toBe(1)
    expect(result.current.canGoBack).toBe(false)
  })

  it('finishing the last step closes the tour', async () => {
    const { result } = renderTour()

    for (let i = 0; i < 8; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { result.current.next() })
    }

    expect(result.current.isLastStep).toBe(true)
    await act(async () => { result.current.next() })

    expect(result.current.active).toBe(false)
  })

  it('skip() closes the tour immediately', () => {
    const { result } = renderTour()
    act(() => result.current.skip())

    expect(result.current.active).toBe(false)
  })

  it('navigates to the topic-page steps and locates their targets', async () => {
    const { result } = renderTour()

    for (let i = 0; i < 6; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { result.current.next() })
    }

    expect(result.current.stepNumber).toBe(7)
    await waitFor(() => expect(result.current.targetEl).not.toBeNull())
    expect(result.current.targetEl.className).toBe('topic-page-title')
  })
})
