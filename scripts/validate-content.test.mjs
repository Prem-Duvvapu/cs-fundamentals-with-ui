import assert from 'node:assert/strict'
import test from 'node:test'
import {
  countAnswerClauses,
  findThinAnswers,
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


test('clause counting treats sentence terminators and semicolons as clause boundaries', () => {
  assert.equal(countAnswerClauses('One thing.'), 1)
  assert.equal(countAnswerClauses('One thing. Two things.'), 2)
  assert.equal(countAnswerClauses('One thing; two things. Three things.'), 3)
  assert.equal(countAnswerClauses('Does it work? It does! And then some.'), 3)
})

test('clause counting is not inflated by code, math, decimals or abbreviations', () => {
  // A fenced block is a single unit of evidence, not a pile of clauses.
  assert.equal(
    countAnswerClauses('Run it.\n\n```sh\na. b. c. d.\n```\n\nThen check the output.'),
    2
  )
  assert.equal(countAnswerClauses('Call `obj.method()` first. Then wait.'), 2)
  assert.equal(countAnswerClauses('Latency rose to 1.5 ms. That is the cost.'), 2)
  assert.equal(countAnswerClauses('Some caches, e.g. the page cache, are shared. That matters.'), 2)
  assert.equal(countAnswerClauses('The math is $a.b$ here. Done.'), 2)
})

test('a terminator followed by a closing quote still ends a clause', () => {
  assert.equal(countAnswerClauses('He said "it restarts things for you." Then it did not.'), 2)
  assert.equal(countAnswerClauses('First (as noted.) Second.'), 2)
})

test('thin-answer detection reports the question id and its clause count', () => {
  const interviewText = [
    '**Q1. A short one?** `[easy]`',
    'Only two clauses here. That is all it says.',
    '',
    '**Q2. A deeper one?** `[medium]`',
    'A direct answer. Then the mechanism behind it. Then the trade-off it forces.',
    ''
  ].join('\n')

  assert.deepEqual(findThinAnswers(interviewText), [{ question: 'Q1', clauses: 2 }])
  assert.deepEqual(findThinAnswers(interviewText, 4), [
    { question: 'Q1', clauses: 2 },
    { question: 'Q2', clauses: 3 }
  ])
})

test('thin-answer detection measures the last answer to the end of the section', () => {
  const interviewText = '**Q1. The only one?** `[hard]`\nA single clause and nothing more'

  assert.deepEqual(findThinAnswers(interviewText), [{ question: 'Q1', clauses: 1 }])
})
