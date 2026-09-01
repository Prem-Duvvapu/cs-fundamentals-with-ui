#!/usr/bin/env node
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const REPO_ROOT = path.resolve(__dirname, '..')
const DATA_DIR = path.join(REPO_ROOT, 'frontend/src/data')
const VISUALIZER_DIR = path.join(REPO_ROOT, 'frontend/src/components/visualizers')
const CONTENT_DIR = path.join(REPO_ROOT, 'content')
const TOPIC_SERVICE_PATH = path.join(REPO_ROOT, 'backend/src/main/java/com/csfundamentals/service/TopicService.java')
const LEDGER_PATH = path.join(CONTENT_DIR, 'SIMULATION_QUESTION_MIGRATION.json')

export const LEDGER_SCHEMA_VERSION = 1
export const ALLOWED_DISPOSITIONS = new Set(['pending', 'migrated', 'superseded', 'retained'])

const JSON_SOURCE_TARGETS = new Map([
  ['frontend/src/data/batch-concepts.json#springBatch', 'spring-batch-lifecycle'],
  ['frontend/src/data/concurrency-concepts.json#threadPool', 'java-multithreading-concurrency'],
  ['frontend/src/data/concurrency-concepts.json#virtualThreads', 'java-multithreading-concurrency'],
  ['frontend/src/data/dbms-concepts-architecture.json#$', 'dbms-architecture'],
  ['frontend/src/data/dbms-concepts-bplus-tree.json#bplusTree', 'dbms-indexing'],
  ['frontend/src/data/dbms-concepts-concurrency.json#$', 'concurrency-control'],
  ['frontend/src/data/dbms-concepts-distributed.json#$', 'distributed-databases-cap'],
  ['frontend/src/data/dbms-concepts-er-model.json#$', 'er-model'],
  ['frontend/src/data/dbms-concepts-fd.json#$', 'functional-dependencies-keys'],
  ['frontend/src/data/dbms-concepts-intro.json#$', 'dbms-introduction'],
  ['frontend/src/data/dbms-concepts-normalization.json#$', 'database-normalization'],
  ['frontend/src/data/dbms-concepts-query-optimization.json#$', 'query-optimization'],
  ['frontend/src/data/dbms-concepts-relational-algebra.json#$', 'relational-algebra-calculus'],
  ['frontend/src/data/dbms-concepts-storage.json#$', 'storage-raid-indexing'],
  ['frontend/src/data/dbms-concepts-transactions-acid.json#$', 'transactions-acid'],
  ['frontend/src/data/java-concepts.json#g1Gc', 'jvm-gc'],
  ['frontend/src/data/java-concepts.json#hashMap', 'java-hashmap-internals'],
  ['frontend/src/data/java-concepts.json#jvmMemory', 'jvm-gc'],
  ['frontend/src/data/java-fundamentals-collections.json#$', 'java-collections-framework'],
  ['frontend/src/data/java-fundamentals-execution.json#javaExecution', 'java-execution-pipeline'],
  ['frontend/src/data/java-fundamentals-functional.json#$', 'java-functional-lambdas'],
  ['frontend/src/data/java-fundamentals-generics.json#$', 'java-generics'],
  ['frontend/src/data/java-fundamentals-memory.json#javaMemory', 'java-memory-model'],
  ['frontend/src/data/java-fundamentals-oop.json#javaOop', 'java-oop-pillars'],
  ['frontend/src/data/java-fundamentals-static-records.json#$', 'java-static-final-records'],
  ['frontend/src/data/java-fundamentals-streams.json#$', 'java-streams-optional'],
  ['frontend/src/data/networking-concepts.json#consistentHashing', 'distributed-databases-cap'],
  ['frontend/src/data/networking-concepts.json#tcpCongestion', 'tcp-congestion'],
  ['frontend/src/data/os-concepts.json#virtualMemory', 'memory-management'],
  ['frontend/src/data/spring-jpa-concepts.json#connectionPool', 'spring-testing-production'],
  ['frontend/src/data/spring-jpa-concepts.json#jpaEntity', 'jpa-hibernate-lifecycle'],
  ['frontend/src/data/spring-jpa-concepts.json#springBean', 'spring-bean-lifecycle']
])

const INLINE_SOURCE_TARGETS = new Map([
  ['frontend/src/components/visualizers/java/DesignPatternsVisualizer.jsx', 'design-patterns-solid'],
  ['frontend/src/components/visualizers/os/DiskSchedulingVisualizer.jsx', 'disk-scheduling'],
  ['frontend/src/components/visualizers/os/FileSystemVisualizer.jsx', 'file-systems'],
  ['frontend/src/components/visualizers/os/IoSystemsVisualizer.jsx', 'io-systems']
])

function toPosix(value) {
  return value.replace(/\\/g, '/')
}

function normalizeText(value) {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ').toLocaleLowerCase()
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map(key => [key, canonicalize(value[key])])
    )
  }
  return value
}

function canonicalStringify(value) {
  return JSON.stringify(canonicalize(value))
}

function digest(value) {
  return `sha256:${crypto.createHash('sha256').update(value).digest('hex')}`
}

function shortQuestionHash(question) {
  return digest(normalizeText(question)).slice('sha256:'.length, 'sha256:'.length + 12)
}

function slugify(value) {
  return value
    .replace(/\.[^.]+$/, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLocaleLowerCase()
}

function encodeJsonPointerPart(value) {
  return String(value).replace(/~/g, '~0').replace(/\//g, '~1')
}

function readQuestion(payload) {
  if (typeof payload?.question === 'string') return payload.question
  if (typeof payload?.q === 'string') return payload.q
  return null
}

function jsonOwnerPath(pathParts, field) {
  const owner = field === 'interviewQA' && pathParts.at(-1) === 'theoryData'
    ? pathParts.slice(0, -1)
    : pathParts
  return owner.length > 0 ? owner.join('.') : '$'
}

function makeJsonItem({ payload, sourceFile, ownerPath, field, pointer }) {
  const question = readQuestion(payload)
  if (!question) return null
  const kind = field === 'interviewQA' ? 'interview' : 'quiz'
  const sourcePayload = canonicalize(payload)
  const sourceName = slugify(path.basename(sourceFile))
  const ownerName = slugify(ownerPath === '$' ? 'root' : ownerPath)

  return {
    id: `legacy-json:${sourceName}:${ownerName}:${kind}:${shortQuestionHash(question)}`,
    kind,
    sourceType: 'json',
    sourceFile,
    sourceLocator: pointer,
    sourceQuestion: question,
    sourcePayload,
    sourceDigest: digest(canonicalStringify(sourcePayload)),
    targetTopicId: JSON_SOURCE_TARGETS.get(`${sourceFile}#${ownerPath}`) ?? null,
    disposition: 'pending',
    evidence: null
  }
}

export function extractJsonQuestions(data, sourceFile) {
  const items = []
  const errors = []

  function visit(value, pathParts = []) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return

    for (const [field, child] of Object.entries(value)) {
      if ((field === 'interviewQA' || field === 'quizData') && Array.isArray(child)) {
        const ownerPath = jsonOwnerPath(pathParts, field)
        child.forEach((payload, index) => {
          const pointerParts = [...pathParts, field, index].map(encodeJsonPointerPart)
          const item = makeJsonItem({
            payload,
            sourceFile,
            ownerPath,
            field,
            pointer: `/${pointerParts.join('/')}`
          })
          if (item) {
            items.push(item)
          } else {
            errors.push(`${sourceFile}#/${pointerParts.join('/')} has no string question or q field`)
          }
        })
      }

      if (child && typeof child === 'object') {
        visit(child, [...pathParts, field])
      }
    }
  }

  visit(data)
  return { items, errors }
}

function skipLineComment(source, index) {
  const newline = source.indexOf('\n', index + 2)
  return newline === -1 ? source.length : newline
}

function skipBlockComment(source, index) {
  const end = source.indexOf('*/', index + 2)
  return end === -1 ? source.length : end + 2
}

function readJsString(source, start) {
  const quote = source[start]
  if (quote !== "'" && quote !== '"' && quote !== '`') return null

  let value = ''
  for (let index = start + 1; index < source.length; index += 1) {
    const char = source[index]
    if (char === quote) return { value, end: index + 1 }
    if (char !== '\\') {
      value += char
      continue
    }

    const escaped = source[index + 1]
    if (escaped === undefined) break
    const escapes = {
      b: '\b', f: '\f', n: '\n', r: '\r', t: '\t', v: '\v',
      '0': '\0', "'": "'", '"': '"', '`': '`', '\\': '\\'
    }
    if (escaped === 'u' && /^[0-9a-fA-F]{4}$/.test(source.slice(index + 2, index + 6))) {
      value += String.fromCodePoint(Number.parseInt(source.slice(index + 2, index + 6), 16))
      index += 5
    } else if (escaped === 'x' && /^[0-9a-fA-F]{2}$/.test(source.slice(index + 2, index + 4))) {
      value += String.fromCodePoint(Number.parseInt(source.slice(index + 2, index + 4), 16))
      index += 3
    } else {
      value += escapes[escaped] ?? escaped
      index += 1
    }
  }
  return null
}

function findMatchingDelimiter(source, start, open, close) {
  let depth = 0
  for (let index = start; index < source.length; index += 1) {
    const char = source[index]
    if (char === "'" || char === '"' || char === '`') {
      const parsed = readJsString(source, index)
      if (!parsed) return -1
      index = parsed.end - 1
      continue
    }
    if (char === '/' && source[index + 1] === '/') {
      index = skipLineComment(source, index)
      continue
    }
    if (char === '/' && source[index + 1] === '*') {
      index = skipBlockComment(source, index) - 1
      continue
    }
    if (char === open) depth += 1
    if (char === close) depth -= 1
    if (depth === 0) return index
  }
  return -1
}

function findPropertyStart(source, property) {
  const match = new RegExp(`(?:\\b${property}\\b|[\"']${property}[\"'])\\s*:`).exec(source)
  if (!match) return -1
  let index = match.index + match[0].length
  while (/\s/.test(source[index])) index += 1
  return index
}

function readStringProperty(source, property) {
  const start = findPropertyStart(source, property)
  return start === -1 ? null : readJsString(source, start)?.value ?? null
}

function readNumberProperty(source, properties) {
  for (const property of properties) {
    const start = findPropertyStart(source, property)
    if (start === -1) continue
    const match = /^-?\d+(?:\.\d+)?/.exec(source.slice(start))
    if (match) return Number(match[0])
  }
  return null
}

function readStringArrayProperty(source, property) {
  const start = findPropertyStart(source, property)
  if (start === -1 || source[start] !== '[') return null
  const end = findMatchingDelimiter(source, start, '[', ']')
  if (end === -1) return null

  const values = []
  for (let index = start + 1; index < end; index += 1) {
    const char = source[index]
    if (char === "'" || char === '"' || char === '`') {
      const parsed = readJsString(source, index)
      if (!parsed) return null
      values.push(parsed.value)
      index = parsed.end - 1
    }
  }
  return values
}

function parseInlineQuizPayload(objectSource) {
  const question = readStringProperty(objectSource, 'question')
  if (!question) return null

  return canonicalize({
    question,
    ...(readStringArrayProperty(objectSource, 'options') && {
      options: readStringArrayProperty(objectSource, 'options')
    }),
    ...(readNumberProperty(objectSource, ['correctAnswer', 'correct']) !== null && {
      correctAnswer: readNumberProperty(objectSource, ['correctAnswer', 'correct'])
    }),
    ...(readStringProperty(objectSource, 'answer') && {
      answer: readStringProperty(objectSource, 'answer')
    }),
    ...(readStringProperty(objectSource, 'explanation') && {
      explanation: readStringProperty(objectSource, 'explanation')
    }),
    ...(readStringProperty(objectSource, 'difficulty') && {
      difficulty: readStringProperty(objectSource, 'difficulty')
    })
  })
}

function getTopLevelObjects(source, arrayStart, arrayEnd) {
  const objects = []
  for (let index = arrayStart + 1; index < arrayEnd; index += 1) {
    const char = source[index]
    if (char === "'" || char === '"' || char === '`') {
      const parsed = readJsString(source, index)
      if (!parsed) break
      index = parsed.end - 1
      continue
    }
    if (char === '/' && source[index + 1] === '/') {
      index = skipLineComment(source, index)
      continue
    }
    if (char === '/' && source[index + 1] === '*') {
      index = skipBlockComment(source, index) - 1
      continue
    }
    if (char !== '{') continue
    const end = findMatchingDelimiter(source, index, '{', '}')
    if (end === -1 || end > arrayEnd) break
    objects.push({ start: index, end, source: source.slice(index, end + 1) })
    index = end
  }
  return objects
}

export function extractInlineQuizQuestions(source, sourceFile) {
  const items = []
  const errors = []
  const quizArrayPattern = /\bquizData\s*:\s*\[/g
  let arrayMatch
  let groupIndex = 0

  while ((arrayMatch = quizArrayPattern.exec(source)) !== null) {
    const arrayStart = arrayMatch.index + arrayMatch[0].lastIndexOf('[')
    const arrayEnd = findMatchingDelimiter(source, arrayStart, '[', ']')
    if (arrayEnd === -1) {
      errors.push(`${sourceFile}:${source.slice(0, arrayStart).split('\n').length} has an unterminated quizData array`)
      continue
    }

    const objects = getTopLevelObjects(source, arrayStart, arrayEnd)
    objects.forEach((object, itemIndex) => {
      const payload = parseInlineQuizPayload(object.source)
      const line = source.slice(0, object.start).split('\n').length
      if (!payload) {
        errors.push(`${sourceFile}:${line} inline quiz item has no static string question`)
        return
      }

      const question = payload.question
      items.push({
        id: `legacy-inline:${slugify(path.basename(sourceFile))}:quiz:${shortQuestionHash(question)}`,
        kind: 'quiz',
        sourceType: 'inline-jsx',
        sourceFile,
        sourceLocator: `line:${line}:quizData[${groupIndex}][${itemIndex}]`,
        sourceQuestion: question,
        sourcePayload: payload,
        sourceDigest: digest(canonicalStringify(payload)),
        targetTopicId: INLINE_SOURCE_TARGETS.get(sourceFile) ?? null,
        disposition: 'pending',
        evidence: null
      })
    })

    groupIndex += 1
    quizArrayPattern.lastIndex = arrayEnd + 1
  }

  return { items, errors }
}

function findFiles(root, predicate) {
  if (!fs.existsSync(root)) return []
  const files = []
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name)
    if (entry.isDirectory()) files.push(...findFiles(fullPath, predicate))
    if (entry.isFile() && predicate(fullPath)) files.push(fullPath)
  }
  return files.sort()
}

export function discoverLegacyQuestions(repoRoot = REPO_ROOT) {
  const dataDir = path.join(repoRoot, 'frontend/src/data')
  const visualizerDir = path.join(repoRoot, 'frontend/src/components/visualizers')
  const items = []
  const errors = []

  for (const file of findFiles(dataDir, value => value.endsWith('.json'))) {
    const sourceFile = toPosix(path.relative(repoRoot, file))
    try {
      const result = extractJsonQuestions(JSON.parse(fs.readFileSync(file, 'utf8')), sourceFile)
      items.push(...result.items)
      errors.push(...result.errors)
    } catch (error) {
      errors.push(`${sourceFile} is not valid JSON: ${error.message}`)
    }
  }

  for (const file of findFiles(visualizerDir, value => value.endsWith('.jsx'))) {
    const sourceFile = toPosix(path.relative(repoRoot, file))
    const result = extractInlineQuizQuestions(fs.readFileSync(file, 'utf8'), sourceFile)
    items.push(...result.items)
    errors.push(...result.errors)
  }

  const seenIds = new Set()
  for (const item of items) {
    if (seenIds.has(item.id)) errors.push(`Duplicate stable source ID: ${item.id}`)
    seenIds.add(item.id)
    if (!item.targetTopicId) errors.push(`${item.id} has no target-topic mapping`)
  }

  return {
    items: items.sort((left, right) => left.id.localeCompare(right.id)),
    errors,
    counts: countItems(items)
  }
}

function countItems(items) {
  const jsonInterview = items.filter(item => item.sourceType === 'json' && item.kind === 'interview').length
  const jsonQuiz = items.filter(item => item.sourceType === 'json' && item.kind === 'quiz').length
  const inlineQuiz = items.filter(item => item.sourceType === 'inline-jsx' && item.kind === 'quiz').length
  return {
    total: items.length,
    jsonInterview,
    jsonQuiz,
    inlineQuiz,
    interview: items.filter(item => item.kind === 'interview').length,
    quiz: items.filter(item => item.kind === 'quiz').length
  }
}

function readLedger(ledgerPath = LEDGER_PATH) {
  if (!fs.existsSync(ledgerPath)) return null
  return JSON.parse(fs.readFileSync(ledgerPath, 'utf8'))
}

function createEmptyLedger() {
  return {
    schemaVersion: LEDGER_SCHEMA_VERSION,
    purpose: 'Immutable provenance for interview and quiz questions owned by legacy simulator data.',
    workflow: {
      refresh: 'node scripts/audit-simulation-questions.mjs --write-inventory',
      check: 'node scripts/audit-simulation-questions.mjs --check',
      rule: 'A source may disappear only after every owned item is migrated or superseded with verified lesson evidence. Retained items require their source owner to remain present.'
    },
    dispositions: {
      pending: 'Not yet verified; always fails the gate.',
      migrated: 'Represented in the target lesson; evidence.contains must occur in that lesson.',
      superseded: 'Intentionally replaced by stronger target-lesson coverage; evidence.contains and evidence.note are required.',
      retained: 'Intentionally kept in its simulator; evidence.owner must continue to exist.'
    },
    items: []
  }
}

export function mergeInventory(existingLedger, currentItems) {
  const ledger = existingLedger ? structuredClone(existingLedger) : createEmptyLedger()
  const errors = []
  const existingById = new Map((ledger.items ?? []).map(item => [item.id, item]))

  for (const current of currentItems) {
    const existing = existingById.get(current.id)
    if (!existing) {
      existingById.set(current.id, current)
      continue
    }
    if (existing.sourceDigest !== current.sourceDigest) {
      errors.push(`${current.id} payload changed; review it manually instead of refreshing its immutable digest`)
      continue
    }
    existing.sourceLocator = current.sourceLocator
    existing.sourceFile = current.sourceFile
  }

  ledger.schemaVersion = LEDGER_SCHEMA_VERSION
  ledger.items = [...existingById.values()].sort((left, right) => left.id.localeCompare(right.id))
  return { ledger, errors }
}

function getRegisteredTopicIds(topicServicePath = TOPIC_SERVICE_PATH) {
  const source = fs.readFileSync(topicServicePath, 'utf8')
  return new Set([...source.matchAll(/new\s+Topic\(\s*"([^"]+)"/g)].map(match => match[1]))
}

function getContentByTopic(contentDir = CONTENT_DIR) {
  const result = new Map()
  const topicFilePattern = /^\d+[a-z]?-([a-z0-9-]+)\.md$/
  for (const file of findFiles(contentDir, value => topicFilePattern.test(path.basename(value)))) {
    const match = path.basename(file).match(topicFilePattern)
    result.set(match[1], { file, content: fs.readFileSync(file, 'utf8') })
  }
  return result
}

function evidenceError(item, contentByTopic, fileExists) {
  const evidence = item.evidence
  if (item.disposition === 'retained') {
    if (evidence?.type !== 'source-retained') return `${item.id} retained evidence.type must be "source-retained"`
    if (typeof evidence.owner !== 'string' || evidence.owner.length === 0) return `${item.id} retained evidence.owner is required`
    if (!fileExists(evidence.owner)) return `${item.id} retained owner is missing: ${evidence.owner}`
    if (typeof evidence.note !== 'string' || evidence.note.trim().length < 20) return `${item.id} retained evidence.note must explain ownership in at least 20 characters`
    return null
  }

  if (evidence?.type !== 'lesson-content') return `${item.id} ${item.disposition} evidence.type must be "lesson-content"`
  if (typeof evidence.contains !== 'string' || evidence.contains.trim().length < 12) {
    return `${item.id} lesson evidence.contains must be at least 12 characters`
  }
  if (item.disposition === 'superseded' && (typeof evidence.note !== 'string' || evidence.note.trim().length < 20)) {
    return `${item.id} superseded evidence.note must explain the replacement in at least 20 characters`
  }

  const target = contentByTopic.get(item.targetTopicId)
  if (!target) return `${item.id} cannot verify evidence because target lesson content is missing`
  if (!normalizeText(target.content).includes(normalizeText(evidence.contains))) {
    return `${item.id} evidence was not found in ${toPosix(target.file)}`
  }
  return null
}

export function validateMigrationLedger({
  ledger,
  currentItems,
  discoveryErrors = [],
  registeredTopicIds,
  contentByTopic,
  fileExists = value => fs.existsSync(path.resolve(REPO_ROOT, value))
}) {
  const errors = [...discoveryErrors]
  if (!ledger || typeof ledger !== 'object') {
    return { errors: [...errors, 'Migration ledger is missing or invalid'], stats: null }
  }
  if (ledger.schemaVersion !== LEDGER_SCHEMA_VERSION) {
    errors.push(`Migration ledger schemaVersion must be ${LEDGER_SCHEMA_VERSION}`)
  }
  if (!Array.isArray(ledger.items)) {
    return { errors: [...errors, 'Migration ledger must contain an items array'], stats: null }
  }

  const currentById = new Map(currentItems.map(item => [item.id, item]))
  const ledgerById = new Map()

  for (const item of ledger.items) {
    if (typeof item?.id !== 'string' || item.id.length === 0) {
      errors.push('Ledger item has no stable string id')
      continue
    }
    if (ledgerById.has(item.id)) errors.push(`Duplicate ledger item ID: ${item.id}`)
    ledgerById.set(item.id, item)

    if (typeof item.targetTopicId !== 'string' || !registeredTopicIds.has(item.targetTopicId)) {
      errors.push(`${item.id} targets unknown lesson "${item.targetTopicId}"`)
    } else if (!contentByTopic.has(item.targetTopicId)) {
      errors.push(`${item.id} target lesson content is missing: ${item.targetTopicId}`)
    }

    if (!ALLOWED_DISPOSITIONS.has(item.disposition)) {
      errors.push(`${item.id} has invalid disposition "${item.disposition}"`)
      continue
    }

    const current = currentById.get(item.id)
    if (current && current.sourceDigest !== item.sourceDigest) {
      errors.push(`${item.id} source payload differs from the immutable ledger snapshot`)
    }
    if (!current && (item.disposition === 'pending' || item.disposition === 'retained')) {
      errors.push(`${item.id} source disappeared before migration evidence was complete`)
    }

    if (item.disposition === 'pending') {
      errors.push(`${item.id} is unresolved (pending)`)
      continue
    }
    const itemEvidenceError = evidenceError(item, contentByTopic, fileExists)
    if (itemEvidenceError) errors.push(itemEvidenceError)
  }

  for (const item of currentItems) {
    if (!ledgerById.has(item.id)) errors.push(`${item.id} is newly discovered but absent from the ledger`)
  }

  const dispositionCounts = Object.fromEntries(
    [...ALLOWED_DISPOSITIONS].map(disposition => [
      disposition,
      ledger.items.filter(item => item.disposition === disposition).length
    ])
  )

  return {
    errors,
    stats: {
      discovered: countItems(currentItems),
      ledger: ledger.items.length,
      ...dispositionCounts,
      resolved: ledger.items.length - dispositionCounts.pending
    }
  }
}

function printCounts(label, counts) {
  console.log(`${label}: ${counts.total} total (${counts.jsonInterview} JSON interview, ${counts.jsonQuiz} JSON quiz, ${counts.inlineQuiz} inline quiz)`)
}

function printHelp() {
  console.log(`Usage:
  node scripts/audit-simulation-questions.mjs --write-inventory
  node scripts/audit-simulation-questions.mjs --check

--write-inventory  Add newly discovered source items as pending without overwriting prior evidence.
--check            Fail on inventory drift, unknown targets, missing sources, pending items, or invalid evidence.`)
}

function main() {
  const args = new Set(process.argv.slice(2))
  if (args.has('--help') || args.has('-h')) {
    printHelp()
    return
  }
  if (args.size > 1 || (args.size === 1 && !args.has('--check') && !args.has('--write-inventory'))) {
    printHelp()
    process.exitCode = 2
    return
  }

  const discovery = discoverLegacyQuestions()
  printCounts('Discovered legacy questions', discovery.counts)
  if (discovery.errors.length > 0) {
    discovery.errors.forEach(error => console.error(`ERROR: ${error}`))
    process.exitCode = 1
    return
  }

  if (args.has('--write-inventory')) {
    const merged = mergeInventory(readLedger(), discovery.items)
    if (merged.errors.length > 0) {
      merged.errors.forEach(error => console.error(`ERROR: ${error}`))
      process.exitCode = 1
      return
    }
    fs.writeFileSync(LEDGER_PATH, `${JSON.stringify(merged.ledger, null, 2)}\n`, 'utf8')
    const pending = merged.ledger.items.filter(item => item.disposition === 'pending').length
    console.log(`Wrote ${toPosix(path.relative(REPO_ROOT, LEDGER_PATH))}: ${merged.ledger.items.length} entries, ${pending} pending.`)
    return
  }

  let ledger
  try {
    ledger = readLedger()
  } catch (error) {
    console.error(`ERROR: migration ledger is not valid JSON: ${error.message}`)
    process.exitCode = 1
    return
  }

  const result = validateMigrationLedger({
    ledger,
    currentItems: discovery.items,
    registeredTopicIds: getRegisteredTopicIds(),
    contentByTopic: getContentByTopic()
  })
  if (result.stats) {
    console.log(`Ledger: ${result.stats.ledger} items; ${result.stats.resolved} resolved; ${result.stats.pending} pending.`)
  }
  if (result.errors.length > 0) {
    result.errors.slice(0, 25).forEach(error => console.error(`ERROR: ${error}`))
    if (result.errors.length > 25) console.error(`ERROR: ${result.errors.length - 25} additional issue(s) omitted.`)
    process.exitCode = 1
    return
  }
  console.log('Simulation-question migration gate passed.')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
}
