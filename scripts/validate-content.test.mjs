import assert from 'node:assert/strict'
import test from 'node:test'
import {
  getApplicableCoverageEntries,
  validateCoverageEntries
} from './validate-content.mjs'

test('coverage validation reports unknown IDs, missing files, and missing headings', () => {
  const entries = [
    { id: 'known', topicId: 'known-topic', requiredHeading: '### Present heading', requiredTerms: ['Present'] },
    { id: 'unknown', topicId: 'unknown-topic', requiredHeading: '### Planned heading', requiredTerms: ['Planned'] },
    { id: 'missing-heading', topicId: 'known-topic', requiredHeading: '### Missing heading', requiredTerms: ['Present'] },
    { id: 'missing-term', topicId: 'known-topic', requiredHeading: '### Present heading', requiredTerms: ['Absent'] }
  ]
  const contentByTopic = new Map([
    ['known-topic', {
      file: '/repo/content/test/01-known-topic.md',
      content: '# Topic\n\n### Present heading\n'
    }]
  ])

  const errors = validateCoverageEntries(entries, ['known-topic'], contentByTopic)

  assert.equal(errors.length, 4)
  assert.ok(errors.some(error => error.includes('unknown TopicService ID "unknown-topic"')))
  assert.ok(errors.some(error => error.includes('content file is missing')))
  assert.ok(errors.some(error => error.includes('### Missing heading')))
  assert.ok(errors.some(error => error.includes('missing required coverage term "Absent"')))
})

test('coverage validation accepts any literal alias in a required term group', () => {
  const entries = [{
    id: 'aliases',
    topicId: 'known-topic',
    requiredHeading: '### Present heading',
    requiredTerms: [['canonical term', 'alternate wording']]
  }]
  const contentByTopic = new Map([
    ['known-topic', {
      file: '/repo/content/test/01-known-topic.md',
      content: '# Topic\n\n### Present heading\n\nalternate wording appears in prose.\n```text\ncanonical term only in code\n```\n'
    }]
  ])

  assert.deepEqual(validateCoverageEntries(entries, ['known-topic'], contentByTopic), [])
})

test('coverage validation rejects absent and malformed required terms', () => {
  const entries = [
    { id: 'empty', topicId: 'known-topic', requiredHeading: '### Present heading', requiredTerms: [] },
    { id: 'invalid', topicId: 'known-topic', requiredHeading: '### Present heading', requiredTerms: [42] }
  ]
  const contentByTopic = new Map([
    ['known-topic', { file: '/repo/content/test/01-known-topic.md', content: '### Present heading' }]
  ])

  const errors = validateCoverageEntries(entries, ['known-topic'], contentByTopic)

  assert.ok(errors.some(error => error.includes('non-empty requiredTerms array')))
  assert.ok(errors.some(error => error.includes('requiredTerms[0] must be a non-empty string')))
})

test('specific-file coverage filtering keeps only entries for the selected topic IDs', () => {
  const entries = [
    { id: 'one', topicId: 'first-topic', requiredHeading: '### First', requiredTerms: ['first'] },
    { id: 'two', topicId: 'second-topic', requiredHeading: '### Second', requiredTerms: ['second'] }
  ]

  assert.deepEqual(
    getApplicableCoverageEntries(entries, new Set(['second-topic'])),
    [entries[1]]
  )
  assert.deepEqual(getApplicableCoverageEntries(entries), entries)
})
