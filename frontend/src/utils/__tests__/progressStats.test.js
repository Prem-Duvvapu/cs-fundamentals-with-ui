import { describe, it, expect } from 'vitest'
import {
  computeOverallStats,
  computeCategoryStats,
  computeLevelStats,
  getNextTopic,
  getBookmarkedTopics
} from '../progressStats'

const TOPICS = [
  { id: 'java-oop-pillars', category: 'java-spring', title: 'OOP Pillars', level: 'beginner' },
  { id: 'spring-security', category: 'java-spring', title: 'Spring Security', level: 'expert' },
  { id: 'process-management', category: 'os', title: 'Process Management', level: 'beginner' },
  { id: 'deadlocks', category: 'os', title: 'Deadlocks', level: 'intermediate' },
  { id: 'osi-model', category: 'networking', title: 'OSI Model', level: 'beginner' }
]

describe('progressStats', () => {
  describe('computeOverallStats', () => {
    it('reports zero completion with no progress recorded', () => {
      expect(computeOverallStats(TOPICS, {})).toEqual({ completed: 0, total: 5, percent: 0 })
    })

    it('counts only completed topics and rounds the percentage', () => {
      const progress = {
        'java-oop-pillars': { completed: true },
        'process-management': { completed: true }
      }
      expect(computeOverallStats(TOPICS, progress)).toEqual({ completed: 2, total: 5, percent: 40 })
    })

    it('never divides by zero for an empty topic list', () => {
      expect(computeOverallStats([], {})).toEqual({ completed: 0, total: 0, percent: 0 })
    })
  })

  describe('computeCategoryStats', () => {
    it('breaks completion down per category, including zero-topic categories', () => {
      const progress = { 'java-oop-pillars': { completed: true } }
      const stats = computeCategoryStats(TOPICS, progress)

      expect(stats['java-spring']).toEqual({ completed: 1, total: 2, percent: 50 })
      expect(stats.os).toEqual({ completed: 0, total: 2, percent: 0 })
      expect(stats.networking).toEqual({ completed: 0, total: 1, percent: 0 })
      expect(stats.dbms).toEqual({ completed: 0, total: 0, percent: 0 })
    })
  })

  describe('computeLevelStats', () => {
    it('breaks completion down per level', () => {
      const progress = { 'osi-model': { completed: true }, deadlocks: { completed: true } }
      const stats = computeLevelStats(TOPICS, progress)

      expect(stats.beginner).toEqual({ completed: 1, total: 3, percent: 33 })
      expect(stats.intermediate).toEqual({ completed: 1, total: 1, percent: 100 })
      expect(stats.expert).toEqual({ completed: 0, total: 1, percent: 0 })
    })
  })

  describe('getNextTopic', () => {
    it('returns the first not-completed topic in curriculum order', () => {
      const next = getNextTopic(TOPICS, {})
      expect(next.id).toBe('java-oop-pillars')
    })

    it('skips completed topics to find the next one', () => {
      const progress = { 'java-oop-pillars': { completed: true } }
      const next = getNextTopic(TOPICS, progress)
      expect(next.id).toBe('spring-security')
    })

    it('returns null once every topic is completed', () => {
      const progress = Object.fromEntries(TOPICS.map((topic) => [topic.id, { completed: true }]))
      expect(getNextTopic(TOPICS, progress)).toBeNull()
    })

    it('returns null for an empty topic list', () => {
      expect(getNextTopic([], {})).toBeNull()
    })
  })

  describe('getBookmarkedTopics', () => {
    it('returns only bookmarked topics, in curriculum order', () => {
      const progress = {
        deadlocks: { bookmarked: true },
        'java-oop-pillars': { bookmarked: true }
      }
      const bookmarked = getBookmarkedTopics(TOPICS, progress)
      expect(bookmarked.map((topic) => topic.id)).toEqual(['java-oop-pillars', 'deadlocks'])
    })

    it('returns an empty array when nothing is bookmarked', () => {
      expect(getBookmarkedTopics(TOPICS, {})).toEqual([])
    })
  })
})
