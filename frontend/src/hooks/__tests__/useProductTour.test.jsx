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
      <div className="progress-transfer-actions" />
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

describe('useProductTour', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('auto-shows on first mount when the tour has not been seen', () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })
    expect(result.current.active).toBe(true)
    expect(result.current.stepNumber).toBe(1)
  })

  it('does not auto-show once the tour has been marked seen', () => {
    window.localStorage.setItem('cs-fundamentals-tour-seen', 'true')
    const { result } = renderHook(() => useProductTour(), { wrapper })
    expect(result.current.active).toBe(false)
  })

  it('start() reopens the tour from step 1 even after it was seen', () => {
    window.localStorage.setItem('cs-fundamentals-tour-seen', 'true')
    const { result } = renderHook(() => useProductTour(), { wrapper })

    act(() => result.current.start())

    expect(result.current.active).toBe(true)
    expect(result.current.stepNumber).toBe(1)
  })

  it('locates the current step target element on the home route', async () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })

    await act(async () => { result.current.next() }) // -> categories
    await waitFor(() => expect(result.current.targetEl).not.toBeNull())
    expect(result.current.targetEl.className).toBe('roadmap-selectors')
  })

  it('steps back and forward without losing track of position', async () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })

    await act(async () => { result.current.next() })
    await act(async () => { result.current.next() })
    expect(result.current.stepNumber).toBe(3)

    await act(async () => { result.current.back() })
    expect(result.current.stepNumber).toBe(2)
    expect(result.current.canGoBack).toBe(true)
  })

  it('never steps back before the first step', () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })
    act(() => result.current.back())
    expect(result.current.stepNumber).toBe(1)
    expect(result.current.canGoBack).toBe(false)
  })

  it('finishing the last step marks the tour seen and closes it', async () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })

    for (let i = 0; i < 9; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { result.current.next() })
    }

    expect(result.current.isLastStep).toBe(true)
    await act(async () => { result.current.next() })

    expect(result.current.active).toBe(false)
    expect(window.localStorage.getItem('cs-fundamentals-tour-seen')).toBe('true')
  })

  it('skip() closes the tour immediately and marks it seen', () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })
    act(() => result.current.skip())

    expect(result.current.active).toBe(false)
    expect(window.localStorage.getItem('cs-fundamentals-tour-seen')).toBe('true')
  })

  it('navigates to the topic-page steps and locates their targets', async () => {
    const { result } = renderHook(() => useProductTour(), { wrapper })

    for (let i = 0; i < 7; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      await act(async () => { result.current.next() })
    }

    expect(result.current.stepNumber).toBe(8)
    await waitFor(() => expect(result.current.targetEl).not.toBeNull())
    expect(result.current.targetEl.className).toBe('topic-page-title')
  })
})
