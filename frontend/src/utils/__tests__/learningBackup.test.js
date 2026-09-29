import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  readLearning, savePractice, questionKey, previewLearningImport, mergeLearningImport,
  exportLearningData, isLearningDurable, resetLearningStoreForTests
} from '../learningState'
import { readAll, toggleBookmark, isProgressDurable, subscribeProgress, STORAGE_KEY } from '../topicProgress'

const question = { id: 'java-oop-pillars-q1', topicId: 'java-oop-pillars', question: 'Q1. Why use an interface?' }
const key = questionKey(question)
const backup = (practice, extra = {}) => JSON.stringify({
  app: 'cs-fundamentals-with-ui', version: 2, progress: { 'java-oop-pillars': { completed: true } },
  learning: { version: 1, reading: {}, practice, sessions: {}, preferences: { fontSize: 20 } }, ...extra
})

beforeEach(() => { vi.restoreAllMocks(); localStorage.clear(); resetLearningStoreForTests() })

describe('learning backups', () => {
  it('never replaces a saved draft with a newer imported entry that has no text', () => {
    savePractice(question, { draft: 'Depend on a contract.' })
    const preview = previewLearningImport(backup({ [key]: { draft: '', assessment: 'confident', updatedAt: Date.now() + 60_000 } }))
    expect(preview.ok).toBe(true)
    mergeLearningImport(preview.learning)
    expect(readLearning().practice[key]).toMatchObject({ draft: 'Depend on a contract.', assessment: 'confident' })
  })

  it('keeps both texts when drafts conflict, and does not duplicate the copy on a repeated import', () => {
    savePractice(question, { draft: 'Mine' })
    const text = backup({ [key]: { draft: 'Theirs', assessment: '', updatedAt: 5 } })
    const preview = previewLearningImport(text)
    expect(preview.conflicts).toBe(1)
    mergeLearningImport(preview.learning)
    mergeLearningImport(previewLearningImport(text).learning)
    const drafts = Object.entries(readLearning().practice).map(([, entry]) => entry.draft)
    expect(readLearning().practice[key].draft).toBe('Mine')
    expect(drafts.filter(draft => draft === 'Theirs')).toHaveLength(1)
  })

  it('round-trips an export through preview and merge on a fresh device without changing preferences', () => {
    savePractice(question, { draft: 'Explained', assessment: 'partial' })
    const exported = JSON.stringify(exportLearningData({ 'java-oop-pillars': { bookmarked: true } }))
    localStorage.clear(); resetLearningStoreForTests()
    const preview = previewLearningImport(exported, ['java-oop-pillars'])
    expect(preview).toMatchObject({ ok: true, version: 2, drafts: 1, assessments: 1, lessons: 1, unknownTopics: 0 })
    mergeLearningImport(preview.learning)
    expect(readLearning().practice[key]).toMatchObject({ draft: 'Explained', assessment: 'partial' })
    expect(readLearning().preferences.fontSize).toBe(18)
  })

  it('accepts version 1 progress-only backups', () => {
    const preview = previewLearningImport(JSON.stringify({ app: 'cs-fundamentals-with-ui', version: 1, progress: { 'cpu-scheduling': { bookmarked: true } } }))
    expect(preview).toMatchObject({ ok: true, version: 1, lessons: 1, drafts: 0 })
  })

  it.each([
    ['{', /not valid JSON/],
    ['null', /not a CS Fundamentals backup/],
    ['[]', /not a CS Fundamentals backup/],
    [JSON.stringify({ app: 'other-app', version: 2, progress: {} }), /not a CS Fundamentals backup/],
    [JSON.stringify({ app: 'cs-fundamentals-with-ui', version: 3, progress: {} }), /newer version/],
    [JSON.stringify({ app: 'cs-fundamentals-with-ui', version: 2, progress: {} }), /damaged/]
  ])('rejects %s with an explanation', (text, error) => {
    const preview = previewLearningImport(text)
    expect(preview.ok).toBe(false)
    expect(preview.error).toMatch(error)
  })

  it('counts entries for lessons that are no longer registered without dropping them', () => {
    const preview = previewLearningImport(backup({ 'retired-topic:Old prompt': { draft: 'Kept', assessment: '', updatedAt: 1 } }), ['java-oop-pillars'])
    expect(preview.unknownTopics).toBe(1)
    mergeLearningImport(preview.learning)
    expect(readLearning().practice['retired-topic:Old prompt'].draft).toBe('Kept')
  })

  it('reports session-only storage before any write when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied') })
    expect(isLearningDurable()).toBe(false)
  })
})

describe('lesson progress storage', () => {
  it('lets bookmarks be toggled on and off again when storage is denied', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied') })
    toggleBookmark('cpu-scheduling')
    expect(readAll()['cpu-scheduling'].bookmarked).toBe(true)
    toggleBookmark('cpu-scheduling')
    expect(readAll()['cpu-scheduling'].bookmarked).toBe(false)
    expect(isProgressDurable()).toBe(false)
    vi.restoreAllMocks()
    toggleBookmark('cpu-scheduling')
    expect(isProgressDurable()).toBe(true)
  })

  it('ignores malformed stored progress instead of crashing', () => {
    localStorage.setItem(STORAGE_KEY, 'null')
    expect(readAll()).toEqual({})
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: { bookmarked: 'yes', completed: true }, b: 7 }))
    expect(readAll()).toEqual({ a: { completed: true } })
  })

  it('picks up changes written by another tab', () => {
    const listener = vi.fn()
    const dispose = subscribeProgress(listener)
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ deadlocks: { completed: true } }))
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    expect(listener).toHaveBeenCalledWith({ deadlocks: { completed: true } })
    dispose()
  })
})
