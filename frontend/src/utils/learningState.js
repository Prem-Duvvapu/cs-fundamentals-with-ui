const KEY = 'cs-fundamentals-learning-v1'
const EVENT = 'cs-fundamentals:learning-change'
const PROBE_KEY = 'cs-fundamentals-storage-probe'
const APP_ID = 'cs-fundamentals-with-ui'
export const LEARNING_BACKUP_VERSION = 2
export const MAX_DRAFT_LENGTH = 20000
export const MAX_IMPORT_BYTES = 8_000_000
const ASSESSMENTS = ['review', 'partial', 'confident']
const empty = () => ({ version: 1, reading: {}, practice: {}, sessions: {}, preferences: { fontSize: 18 } })
let volatileState = null
let durable = null
const safeKey = key => typeof key === 'string' && key.length > 0 && key.length <= 4096 && !['__proto__', 'constructor', 'prototype'].includes(key)
const isRecord = value => Boolean(value) && typeof value === 'object' && !Array.isArray(value)

export function readLearning() {
  if (volatileState) return volatileState
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return empty()
    return validateLearning(JSON.parse(raw))
  } catch { return empty() }
}

export function validateLearning(value) {
  const result = empty()
  if (!isRecord(value) || value.version !== 1) return result
  for (const [id, entry] of Object.entries(isRecord(value.reading) ? value.reading : {})) {
    if (safeKey(id) && isRecord(entry) && typeof entry.headingId === 'string' && entry.headingId.length > 0 && entry.headingId.length < 300 && Number.isFinite(entry.updatedAt)) {
      result.reading[id] = { headingId: entry.headingId, updatedAt: entry.updatedAt }
    }
  }
  for (const [id, entry] of Object.entries(isRecord(value.practice) ? value.practice : {})) {
    if (safeKey(id) && isRecord(entry) && typeof entry.draft === 'string' && entry.draft.length <= MAX_DRAFT_LENGTH) {
      result.practice[id] = { draft: entry.draft, assessment: ASSESSMENTS.includes(entry.assessment) ? entry.assessment : '', updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0 }
    }
  }
  for (const [scope, key] of Object.entries(isRecord(value.sessions) ? value.sessions : {})) {
    if (safeKey(scope) && safeKey(key)) result.sessions[scope] = key
  }
  result.preferences = { fontSize: [16, 18, 20].includes(value.preferences?.fontSize) ? value.preferences.fontSize : 18 }
  return result
}

export function updateLearning(change) {
  const next = validateLearning(change(readLearning()))
  try { localStorage.setItem(KEY, JSON.stringify(next)); volatileState = null; durable = true }
  catch { volatileState = next; durable = false }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: next }))
  return next
}

// Full normalized text avoids ordinal drift and hash collisions. Topic scope separates identical prompts.
// Identical prompts inside one lesson are the same question, so they intentionally share a draft.
export function questionKey(question) {
  const topic = question.topicId || String(question.id).replace(/-q\d+$/, '')
  const prompt = question.question.replace(/^Q\d+\.\s*/i, '').normalize('NFKC').trim().replace(/\s+/g, ' ')
  return `${topic}:${prompt}`
}

export function saveReading(topicId, headingId) {
  if (!safeKey(topicId) || typeof headingId !== 'string' || !headingId || headingId.length >= 300) return
  updateLearning(state => ({ ...state, reading: { ...state.reading, [topicId]: { headingId, updatedAt: Date.now() } } }))
}

export function savePractice(question, patch) {
  const key = questionKey(question)
  if (!safeKey(key)) return
  updateLearning(state => ({ ...state, practice: { ...state.practice, [key]: { draft: '', assessment: '', ...state.practice[key], ...patch, updatedAt: Date.now() } } }))
}

export function deletePractice(key) {
  updateLearning(state => {
    const practice = { ...state.practice }
    delete practice[key]
    return { ...state, practice }
  })
}

export function saveSession(scope, key) {
  if (!safeKey(scope) || !safeKey(key)) return
  if (readLearning().sessions[scope] === key) return
  updateLearning(state => ({ ...state, sessions: { ...state.sessions, [scope]: key } }))
}

export function subscribeLearning(listener) {
  const handleStorage = event => {
    if (event.key === KEY || event.key === null) { volatileState = null; listener() }
  }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', handleStorage)
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', handleStorage) }
}

// Probed once instead of assumed, so the reader is never told work is saved before it can be.
export function isLearningDurable() {
  if (durable !== null) return durable
  try {
    localStorage.setItem(PROBE_KEY, '1')
    localStorage.removeItem(PROBE_KEY)
    durable = true
  } catch { durable = false }
  return durable
}

export function resetLearningStoreForTests() {
  volatileState = null
  durable = null
}

export function latestReading(topics, state = readLearning()) {
  return topics.filter(topic => state.reading[topic.id]).sort((a, b) => state.reading[b.id].updatedAt - state.reading[a.id].updatedAt)[0] || null
}
export function readingUrl(topic, state = readLearning()) {
  const headingId = state.reading[topic.id]?.headingId
  return headingId ? `/topic/${topic.id}#${encodeURIComponent(headingId)}` : `/topic/${topic.id}`
}

export function exportLearningData(progress) {
  return { app: APP_ID, version: LEARNING_BACKUP_VERSION, exportedAt: new Date().toISOString(), progress, learning: readLearning() }
}

function topicOfKey(key) {
  return key.slice(0, Math.max(0, key.indexOf(':')))
}

/**
 * Validates a backup without changing anything. Accepts the v1 lesson-progress export and the v2
 * learning-data export, so older backups keep working. `knownTopicIds` only affects the counts shown
 * to the learner: entries for lessons no longer in the curriculum are still kept.
 */
export function previewLearningImport(text, knownTopicIds = null) {
  if (typeof text !== 'string') return { ok: false, error: 'Could not read this file.' }
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'Choose a file smaller than 8 MB.' }
  let value
  try { value = JSON.parse(text) } catch { return { ok: false, error: 'This file is not valid JSON.' } }
  if (!isRecord(value) || (value.app !== undefined && value.app !== APP_ID) || !Number.isInteger(value.version)) {
    return { ok: false, error: 'This is not a CS Fundamentals backup file.' }
  }
  if (value.version > LEARNING_BACKUP_VERSION) {
    return { ok: false, error: 'This backup was made by a newer version of the app. Update the app, then import it again.' }
  }
  if (!isRecord(value.progress)) return { ok: false, error: 'This backup has no readable lesson progress.' }
  if (value.version === 2 && (!isRecord(value.learning) || value.learning.version !== 1)) {
    return { ok: false, error: 'This backup is damaged: its learning data is missing or unreadable.' }
  }
  if (value.version !== 1 && value.version !== 2) return { ok: false, error: 'This backup version is not supported.' }

  const learning = value.version === 2 ? validateLearning(value.learning) : empty()
  const current = readLearning()
  const conflicts = Object.entries(learning.practice)
    .filter(([key, incoming]) => current.practice[key]?.draft && incoming.draft && current.practice[key].draft !== incoming.draft).length
  const known = knownTopicIds ? new Set(knownTopicIds) : null
  const unknownTopics = known
    ? new Set([...Object.keys(value.progress), ...Object.keys(learning.reading), ...Object.keys(learning.practice).map(topicOfKey)]
      .filter(id => id && !known.has(id))).size
    : 0
  const lessons = Object.values(value.progress).filter(entry => isRecord(entry) && (entry.bookmarked === true || entry.completed === true)).length
  return {
    ok: true,
    version: value.version,
    progress: value.progress,
    learning,
    lessons,
    conflicts,
    unknownTopics,
    drafts: Object.values(learning.practice).filter(entry => entry.draft).length,
    assessments: Object.values(learning.practice).filter(entry => entry.assessment).length,
    readings: Object.keys(learning.reading).length
  }
}

function mergePracticeEntry(current, incoming) {
  if (!current) return incoming
  const newer = incoming.updatedAt > current.updatedAt ? incoming : current
  return {
    draft: current.draft || incoming.draft,
    assessment: newer.assessment || current.assessment || incoming.assessment,
    updatedAt: Math.max(current.updatedAt, incoming.updatedAt)
  }
}

/**
 * Merges field by field, so an import never erases text on this device. When both copies hold a
 * different written explanation, this device's draft stays attached to the question and the
 * imported one is kept under a separate key that later backups continue to carry.
 */
export function mergeLearningImport(incoming) {
  return updateLearning(current => {
    const practice = { ...current.practice }
    for (const [key, entry] of Object.entries(incoming.practice)) {
      const existing = practice[key]
      if (existing?.draft && entry.draft && existing.draft !== entry.draft) {
        const alreadyKept = Object.entries(practice).some(([other, value]) => other.startsWith(`${key} [imported `) && value.draft === entry.draft)
        if (alreadyKept) continue
        const base = `${key} [imported ${entry.updatedAt}]`
        let copy = base, count = 2
        while (practice[copy]) copy = `${base} ${count++}`
        practice[copy] = { ...entry, assessment: '' }
        if (entry.assessment && !existing.assessment) practice[key] = { ...existing, assessment: entry.assessment }
      } else {
        practice[key] = mergePracticeEntry(existing, entry)
      }
    }
    const reading = { ...current.reading }
    for (const [key, entry] of Object.entries(incoming.reading)) if (!reading[key] || reading[key].updatedAt < entry.updatedAt) reading[key] = entry
    return { ...current, reading, practice, sessions: { ...incoming.sessions, ...current.sessions } }
  })
}

export function isImportedCopyKey(key) {
  return / \[imported \d+\]( \d+)?$/.test(key)
}
