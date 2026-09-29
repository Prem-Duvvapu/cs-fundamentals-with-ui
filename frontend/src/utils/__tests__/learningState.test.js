import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readLearning, updateLearning, savePractice, questionKey, saveReading, latestReading, validateLearning, subscribeLearning } from '../learningState'
beforeEach(() => { localStorage.clear(); window.dispatchEvent(new StorageEvent('storage', { key: null })) })
describe('learning continuity', () => {
  it('keeps drafts across ordinal changes and separates changed prompts', () => {
    const first = { id: 'java-q1', question: 'Q1. Why use an interface?' }
    savePractice(first, { draft: 'To depend on a contract.' })
    const reordered = { id: 'java-q8', question: 'Q8. Why use an interface?' }
    expect(readLearning().practice[questionKey(reordered)].draft).toBe('To depend on a contract.')
    expect(questionKey({ ...first, question: 'Q1. What is a class?' })).not.toBe(questionKey(first))
  })
  it('resumes only registered topics and retains the latest heading', () => {
    saveReading('removed', 'lost')
    saveReading('java', 'constructors')
    expect(latestReading([{ id: 'java' }]).id).toBe('java')
    expect(readLearning().reading.java.headingId).toBe('constructors')
  })
  it('rejects malformed persisted structures and unsafe keys', () => {
    localStorage.setItem('cs-fundamentals-learning-v1', '{')
    expect(readLearning().reading).toEqual({})
    expect(validateLearning(JSON.parse('{"version":1,"reading":{"__proto__":{"headingId":"x","updatedAt":2}},"preferences":{"fontSize":99}}')).preferences.fontSize).toBe(18)
  })
  it('notifies subscribers of writes and cross-tab resets', () => {
    const listener = vi.fn()
    const dispose = subscribeLearning(listener)
    updateLearning(state => ({ ...state, preferences: { fontSize: 20 } }))
    window.dispatchEvent(new StorageEvent('storage', { key: null }))
    expect(listener).toHaveBeenCalledTimes(2)
    dispose()
  })
  it('retains successive changes when storage writes are denied', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Denied') })
    savePractice({ id: 'a-q1', question: 'Question' }, { draft: 'First' })
    saveReading('a', 'section')
    expect(readLearning().practice['a:Question'].draft).toBe('First')
    expect(readLearning().reading.a.headingId).toBe('section')
    spy.mockRestore()
  })
})
