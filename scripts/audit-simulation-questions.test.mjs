import assert from 'node:assert/strict'
import test from 'node:test'
import {
  extractInlineQuizQuestions,
  extractJsonQuestions,
  mergeInventory,
  validateMigrationLedger
} from './audit-simulation-questions.mjs'

const JSON_SOURCE = 'frontend/src/data/os-concepts.json'

function registeredContent(content = 'The lesson contains verified migration evidence.') {
  return {
    registeredTopicIds: new Set(['memory-management']),
    contentByTopic: new Map([
      ['memory-management', { file: '/repo/content/os/02-memory-management.md', content }]
    ])
  }
}

test('JSON inventory IDs are stable when source arrays are reordered', () => {
  const first = {
    virtualMemory: {
      theoryData: {
        interviewQA: [
          { q: 'How does a TLB reduce address-translation cost?', a: 'It caches translations.' },
          { q: 'What triggers thrashing?', a: 'The working set exceeds memory.' }
        ]
      },
      quizData: [
        { question: 'What is a page fault?', answer: 'A missing resident mapping.' }
      ]
    }
  }
  const reordered = structuredClone(first)
  reordered.virtualMemory.theoryData.interviewQA.reverse()

  const original = extractJsonQuestions(first, JSON_SOURCE)
  const changedOrder = extractJsonQuestions(reordered, JSON_SOURCE)

  assert.deepEqual(original.errors, [])
  assert.deepEqual(changedOrder.errors, [])
  assert.deepEqual(
    original.items.map(item => item.id).sort(),
    changedOrder.items.map(item => item.id).sort()
  )
  assert.equal(original.items.filter(item => item.kind === 'interview').length, 2)
  assert.equal(original.items.filter(item => item.kind === 'quiz').length, 1)
  assert.ok(original.items.every(item => item.targetTopicId === 'memory-management'))
})

test('inline inventory captures the complete static quiz payload without evaluating JSX', () => {
  const source = `
    const conceptData = {
      quizData: [
        {
          question: 'Which policy can starve distant requests?',
          "options": ['FCFS', 'SSTF', 'SCAN'],
          "correctAnswer": 1,
          "explanation": 'SSTF repeatedly chooses the closest request.'
        }
      ]
    }
  `
  const file = 'frontend/src/components/visualizers/os/DiskSchedulingVisualizer.jsx'
  const result = extractInlineQuizQuestions(source, file)

  assert.deepEqual(result.errors, [])
  assert.equal(result.items.length, 1)
  assert.equal(result.items[0].targetTopicId, 'disk-scheduling')
  assert.deepEqual(result.items[0].sourcePayload, {
    correctAnswer: 1,
    explanation: 'SSTF repeatedly chooses the closest request.',
    options: ['FCFS', 'SSTF', 'SCAN'],
    question: 'Which policy can starve distant requests?'
  })
})

test('inventory refresh preserves reviewed disposition and rejects payload drift', () => {
  const current = extractJsonQuestions({
    virtualMemory: {
      quizData: [{ question: 'What is a page fault?', answer: 'A missing resident mapping.' }]
    }
  }, JSON_SOURCE).items
  const initial = mergeInventory(null, current).ledger
  initial.items[0].disposition = 'migrated'
  initial.items[0].evidence = {
    type: 'lesson-content',
    contains: 'verified migration evidence'
  }

  const refreshed = mergeInventory(initial, current)
  assert.deepEqual(refreshed.errors, [])
  assert.equal(refreshed.ledger.items[0].disposition, 'migrated')

  const drifted = structuredClone(current)
  drifted[0].sourceDigest = 'sha256:changed'
  const drift = mergeInventory(initial, drifted)
  assert.equal(drift.errors.length, 1)
  assert.match(drift.errors[0], /payload changed/)
})

test('migration validation rejects pending items and newly discovered items', () => {
  const items = extractJsonQuestions({
    virtualMemory: {
      quizData: [{ question: 'What is a page fault?', answer: 'A missing resident mapping.' }]
    }
  }, JSON_SOURCE).items
  const ledger = mergeInventory(null, items).ledger
  const extra = { ...items[0], id: `${items[0].id}:new` }
  const result = validateMigrationLedger({
    ledger,
    currentItems: [...items, extra],
    ...registeredContent(),
    fileExists: () => true
  })

  assert.ok(result.errors.some(error => error.includes('is unresolved (pending)')))
  assert.ok(result.errors.some(error => error.includes('newly discovered but absent')))
  assert.equal(result.stats.pending, 1)
})

test('verified lesson evidence permits removal while retained ownership does not', () => {
  const items = extractJsonQuestions({
    virtualMemory: {
      quizData: [{ question: 'What is a page fault?', answer: 'A missing resident mapping.' }]
    }
  }, JSON_SOURCE).items
  const migratedLedger = mergeInventory(null, items).ledger
  migratedLedger.items[0].disposition = 'migrated'
  migratedLedger.items[0].evidence = {
    type: 'lesson-content',
    contains: 'verified migration evidence'
  }

  const removedAfterMigration = validateMigrationLedger({
    ledger: migratedLedger,
    currentItems: [],
    ...registeredContent(),
    fileExists: () => false
  })
  assert.deepEqual(removedAfterMigration.errors, [])

  const retainedLedger = structuredClone(migratedLedger)
  retainedLedger.items[0].disposition = 'retained'
  retainedLedger.items[0].evidence = {
    type: 'source-retained',
    owner: 'frontend/src/data/os-concepts.json',
    note: 'Owned by the retained virtual-memory simulator dataset.'
  }
  const removedWhileRetained = validateMigrationLedger({
    ledger: retainedLedger,
    currentItems: [],
    ...registeredContent(),
    fileExists: () => false
  })

  assert.ok(removedWhileRetained.errors.some(error => error.includes('source disappeared')))
  assert.ok(removedWhileRetained.errors.some(error => error.includes('retained owner is missing')))
})

test('superseded evidence requires both lesson text and a meaningful rationale', () => {
  const items = extractJsonQuestions({
    virtualMemory: {
      quizData: [{ question: 'What is a page fault?', answer: 'A missing resident mapping.' }]
    }
  }, JSON_SOURCE).items
  const ledger = mergeInventory(null, items).ledger
  ledger.items[0].disposition = 'superseded'
  ledger.items[0].evidence = {
    type: 'lesson-content',
    contains: 'verified migration evidence',
    note: 'too short'
  }

  const invalid = validateMigrationLedger({
    ledger,
    currentItems: items,
    ...registeredContent(),
    fileExists: () => true
  })
  assert.ok(invalid.errors.some(error => error.includes('must explain the replacement')))

  ledger.items[0].evidence.note = 'The lesson scenario is broader and includes the original mechanism.'
  const valid = validateMigrationLedger({
    ledger,
    currentItems: items,
    ...registeredContent(),
    fileExists: () => true
  })
  assert.deepEqual(valid.errors, [])
})
