import { describe, it, expect, beforeEach } from 'vitest'
import {
  STORAGE_KEY,
  PROGRESS_EVENT,
  PROGRESS_FILE_VERSION,
  readAll,
  isBookmarked,
  isCompleted,
  toggleBookmark,
  toggleCompleted,
  getCompletedCount,
  getBookmarkedIds,
  exportProgress,
  importProgress
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

  describe('export/import', () => {
    it('exports a versioned envelope wrapping the current progress', () => {
      toggleBookmark('cpu-scheduling')
      toggleCompleted('deadlocks')

      const file = exportProgress()

      expect(file.app).toBe('cs-fundamentals-with-ui')
      expect(file.version).toBe(PROGRESS_FILE_VERSION)
      expect(typeof file.exportedAt).toBe('string')
      expect(file.progress).toEqual({
        'cpu-scheduling': { bookmarked: true },
        deadlocks: { completed: true }
      })
    })

    it('round-trips export -> import back to the same state', () => {
      toggleBookmark('cpu-scheduling')
      toggleCompleted('deadlocks')
      const file = exportProgress()
      window.localStorage.clear()

      const result = importProgress(file)

      expect(result).toEqual({ ok: true, importedCount: 2 })
      expect(isBookmarked('cpu-scheduling')).toBe(true)
      expect(isCompleted('deadlocks')).toBe(true)
    })

    it('accepts a raw JSON string, not just a parsed object', () => {
      toggleBookmark('cpu-scheduling')
      const json = JSON.stringify(exportProgress())
      window.localStorage.clear()

      expect(importProgress(json)).toEqual({ ok: true, importedCount: 1 })
      expect(isBookmarked('cpu-scheduling')).toBe(true)
    })

    it('merges without ever demoting an existing true flag to false', () => {
      toggleBookmark('cpu-scheduling')
      toggleCompleted('cpu-scheduling')

      const result = importProgress({
        version: 1,
        progress: { 'cpu-scheduling': { bookmarked: false, completed: false } }
      })

      expect(result).toEqual({ ok: true, importedCount: 1 })
      expect(isBookmarked('cpu-scheduling')).toBe(true)
      expect(isCompleted('cpu-scheduling')).toBe(true)
    })

    it('merges a new field onto an existing entry without touching the other field', () => {
      toggleCompleted('cpu-scheduling')

      importProgress({ version: 1, progress: { 'cpu-scheduling': { bookmarked: true } } })

      expect(isBookmarked('cpu-scheduling')).toBe(true)
      expect(isCompleted('cpu-scheduling')).toBe(true)
    })

    it('rejects malformed JSON', () => {
      expect(importProgress('{not json')).toEqual({ ok: false, error: 'invalid-json' })
      expect(readAll()).toEqual({})
    })

    it('rejects a non-object payload', () => {
      expect(importProgress('[]')).toEqual({ ok: false, error: 'invalid-format' })
      expect(importProgress(null)).toEqual({ ok: false, error: 'invalid-format' })
    })

    it('rejects a payload missing a numeric version', () => {
      expect(importProgress({ progress: {} })).toEqual({ ok: false, error: 'invalid-format' })
    })

    it('rejects a payload from a newer, unsupported schema version', () => {
      expect(importProgress({ version: PROGRESS_FILE_VERSION + 1, progress: {} }))
        .toEqual({ ok: false, error: 'unsupported-version' })
    })

    it('rejects a payload whose progress field is missing or malformed', () => {
      expect(importProgress({ version: 1 })).toEqual({ ok: false, error: 'invalid-format' })
      expect(importProgress({ version: 1, progress: [] })).toEqual({ ok: false, error: 'invalid-format' })
    })

    it('skips entries with no valid boolean fields instead of writing garbage', () => {
      const result = importProgress({
        version: 1,
        progress: { 'cpu-scheduling': { bookmarked: 'yes' }, deadlocks: null, valid: { completed: true } }
      })

      expect(result).toEqual({ ok: true, importedCount: 1 })
      expect(isBookmarked('cpu-scheduling')).toBe(false)
      expect(isCompleted('valid')).toBe(true)
    })
  })
})
