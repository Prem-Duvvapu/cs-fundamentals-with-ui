import { beforeEach, describe, expect, it } from 'vitest'
import { DAY, nextInterval, normalizeReviews, mergeReviews, reviewCandidates } from '../reviewSchedule'
import { readLearning, savePractice, questionKey, recordPracticeAttempt, moveReview, previewLearningImport, exportLearningData, mergeLearningImport, resetLearningStoreForTests, deletePractice } from '../learningState'
const question = { id: 'task-q1', topicId: 'task', question: 'Q1. Why a transaction?' }
beforeEach(() => { localStorage.clear(); resetLearningStoreForTests() })

describe('transparent review scheduling and preserved attempts', () => {
  it('records the actual saved explanation and whether the answer was opened', () => {
    savePractice(question, { draft: 'Atomic database work.', assessment: 'review' })
    expect(recordPracticeAttempt(question, false, 1000)).toBe(true)
    const key = questionKey(question)
    expect(readLearning().reviews[key]).toMatchObject({ dueAt: 1000 + DAY, intervalDays: 1, attempts: [{ draft: 'Atomic database work.', answerViewed: false }] })
    savePractice(question, { draft: 'Atomicity does not unsend an email.', assessment: 'confident' })
    recordPracticeAttempt(question, true, 2000)
    expect(readLearning().reviews[key].attempts).toHaveLength(2)
    expect(readLearning().reviews[key].attempts[0].draft).toBe('Atomic database work.')
    expect(readLearning().reviews[key].dueAt).toBe(2000 + 7 * DAY)
  })
  it('uses fixed explained intervals and caps confident spacing', () => {
    expect(nextInterval('partial')).toBe(3)
    expect(nextInterval('confident', 7)).toBe(14)
    expect(nextInterval('confident', 28)).toBe(30)
    expect(nextInterval('review', 30)).toBe(1)
    expect(() => nextInterval('unknown')).toThrow()
    expect(recordPracticeAttempt(question, false, 1)).toBe(false)
  })
  it('postpones or resets only the date while keeping attempt history', () => {
    savePractice(question, { draft: 'A', assessment: 'partial' })
    recordPracticeAttempt(question, false, 1000)
    const key = questionKey(question)
    moveReview(key, 'postpone', 2000)
    expect(readLearning().reviews[key].dueAt).toBe(1000 + 4 * DAY)
    moveReview(key, 'reset', 3000)
    expect(readLearning().reviews[key]).toMatchObject({ dueAt: 3000, intervalDays: 0 })
    expect(readLearning().reviews[key].attempts).toHaveLength(1)
  })
  it('exports and merges history without duplicating an imported attempt or replacing the local draft', () => {
    savePractice(question, { draft: 'First', assessment: 'review' })
    recordPracticeAttempt(question, false, 1000)
    const file = exportLearningData({})
    expect(file.version).toBe(3)
    const preview = previewLearningImport(JSON.stringify(file))
    expect(preview.ok).toBe(true)
    savePractice(question, { draft: 'Second', assessment: 'partial' })
    recordPracticeAttempt(question, true, 2000)
    mergeLearningImport(preview.learning)
    const key = questionKey(question)
    expect(readLearning().reviews[key].attempts).toHaveLength(2)
    expect(readLearning().practice[key].draft).toBe('Second')
    expect(readLearning().reviews[key].dueAt).toBe(2000 + 3 * DAY)
    deletePractice(key)
    expect(readLearning().reviews[key]).toBeUndefined()
  })
  it('validates unsafe input and bounds history to the ten newest distinct attempts', () => {
    const attempts = Array.from({ length: 15 }, (_, at) => ({ id: String(at), at, draft: 'A', assessment: 'partial', answerViewed: false }))
    const result = normalizeReviews({ key: { attempts: [...attempts, attempts[14], { id: 'bad', at: -1 }] } })
    expect(result.key.attempts).toHaveLength(10)
    expect(result.key.attempts[0].at).toBe(5)
    expect(normalizeReviews(JSON.parse('{"__proto__":{"attempts":[]}}'))).toEqual({})
    expect(mergeReviews({}, {})).toEqual({})
  })
  it('mixes due and previously recalled concepts, excludes conflict copies, and never exceeds eight', () => {
    const practice = Object.fromEntries(Array.from({ length: 20 }, (_, index) => [`task:q${index}`, { draft: '', assessment: index < 10 ? 'review' : 'confident', updatedAt: 0 }]))
    practice['task:q1 [imported 1]'] = { assessment: 'review', updatedAt: 0 }
    const state = { practice, reviews: {} }
    const mixed = reviewCandidates(state, 2 * DAY, true)
    expect(mixed).toHaveLength(8)
    expect(mixed.filter(item => item.reason === 'Due for review')).toHaveLength(5)
    expect(mixed.slice(5).every(item => item.assessment === 'confident')).toBe(true)
    expect(reviewCandidates(state, 2 * DAY, false)).toHaveLength(8)
    expect(mixed.some(item => item.key.includes('[imported'))).toBe(false)
  })
})
