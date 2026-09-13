import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  PROGRESS_EVENT,
  readAll,
  isBookmarked,
  isCompleted,
  toggleBookmark,
  toggleCompleted,
  getCompletedCount,
  getBookmarkedIds
} from '../topicProgress'

describe('topicProgress', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('starts with no bookmarks or completions recorded', () => {
    expect(readAll()).toEqual({})
    expect(isBookmarked('cpu-scheduling')).toBe(false)
    expect(isCompleted('cpu-scheduling')).toBe(false)
  })

  it('toggles bookmark state independently of completed state', () => {
    toggleBookmark('cpu-scheduling')
    expect(isBookmarked('cpu-scheduling')).toBe(true)
    expect(isCompleted('cpu-scheduling')).toBe(false)

    toggleCompleted('cpu-scheduling')
    expect(isBookmarked('cpu-scheduling')).toBe(true)
    expect(isCompleted('cpu-scheduling')).toBe(true)

    toggleBookmark('cpu-scheduling')
    expect(isBookmarked('cpu-scheduling')).toBe(false)
    expect(isCompleted('cpu-scheduling')).toBe(true)
  })

  it('persists to localStorage under the documented key', () => {
    toggleCompleted('memory-management')
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY))
    expect(stored['memory-management'].completed).toBe(true)
  })

  it('dispatches a change event with the updated progress on every toggle', () => {
    let received = null
    const listener = (event) => { received = event.detail }
    window.addEventListener(PROGRESS_EVENT, listener)

    toggleBookmark('deadlocks')

    window.removeEventListener(PROGRESS_EVENT, listener)
    expect(received.deadlocks.bookmarked).toBe(true)
  })

  it('counts completed topics across the whole progress map', () => {
    toggleCompleted('cpu-scheduling')
    toggleCompleted('memory-management')
    toggleBookmark('deadlocks')

    expect(getCompletedCount()).toBe(2)
  })

  it('lists only the bookmarked topic ids', () => {
    toggleBookmark('cpu-scheduling')
    toggleBookmark('deadlocks')
    toggleCompleted('memory-management')

    expect(getBookmarkedIds().sort()).toEqual(['cpu-scheduling', 'deadlocks'])
  })

  it('tolerates an unavailable localStorage without throwing', () => {
    const originalGetItem = window.localStorage.getItem
    window.localStorage.getItem = () => { throw new Error('blocked') }

    expect(() => readAll()).not.toThrow()
    expect(readAll()).toEqual({})

    window.localStorage.getItem = originalGetItem
  })
})
