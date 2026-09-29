const KEY = 'cs-fundamentals-learning-v1'
const EVENT = 'cs-fundamentals:learning-change'
const empty = () => ({ version: 1, reading: {}, practice: {}, sessions: {}, preferences: { fontSize: 18 } })
let volatileState = null
let durable = true
const safeKey = key => typeof key === 'string' && key.length <= 4096 && !['__proto__', 'constructor', 'prototype'].includes(key)

export function readLearning() {
  try {
    const raw = localStorage.getItem(KEY)
    if (volatileState) return volatileState
    if (!raw) return empty()
    return validateLearning(JSON.parse(raw))
  } catch { return volatileState || empty() }
}

export function validateLearning(value) {
  const result = empty()
  if (!value || value.version !== 1) return result
  for (const [id, entry] of Object.entries(value.reading || {})) {
    if (safeKey(id) && entry && typeof entry.headingId === 'string' && entry.headingId.length < 300 && Number.isFinite(entry.updatedAt)) {
      result.reading[id] = { headingId: entry.headingId, updatedAt: entry.updatedAt }
    }
  }
  for (const [id, entry] of Object.entries(value.practice || {})) {
    if (safeKey(id) && entry && typeof entry.draft === 'string' && entry.draft.length <= 20000) {
      result.practice[id] = { draft: entry.draft, assessment: ['review', 'partial', 'confident'].includes(entry.assessment) ? entry.assessment : '', updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : 0 }
    }
  }
  for (const [scope, key] of Object.entries(value.sessions || {})) {
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
export function questionKey(question) {
  const topic = question.topicId || String(question.id).replace(/-q\d+$/, '')
  const prompt = question.question.replace(/^Q\d+\.\s*/i, '').normalize('NFKC').trim().replace(/\s+/g, ' ')
  return `${topic}:${prompt}`
}

export function saveReading(topicId, headingId) {
  if (!safeKey(topicId) || !headingId) return
  updateLearning(state => ({ ...state, reading: { ...state.reading, [topicId]: { headingId, updatedAt: Date.now() } } }))
}

export function savePractice(question, patch) {
  const key = questionKey(question)
  if (!safeKey(key)) return
  updateLearning(state => ({ ...state, practice: { ...state.practice, [key]: { draft: '', assessment: '', ...state.practice[key], ...patch, updatedAt: Date.now() } } }))
}

export function subscribeLearning(listener) {
  const handleStorage = event => {
    if (event.key === KEY || event.key === null) { volatileState = null; listener() }
  }
  window.addEventListener(EVENT, listener)
  window.addEventListener('storage', handleStorage)
  return () => { window.removeEventListener(EVENT, listener); window.removeEventListener('storage', handleStorage) }
}
export function isLearningDurable() { return durable }
export function latestReading(topics, state = readLearning()) {
  return topics.filter(topic => state.reading[topic.id]).sort((a, b) => state.reading[b.id].updatedAt - state.reading[a.id].updatedAt)[0] || null
}
export function readingUrl(topic, state = readLearning()) {
  return `/topic/${topic.id}#${encodeURIComponent(state.reading[topic.id]?.headingId || '')}`
}

export function exportLearningData(progress) {
  return { app: 'cs-fundamentals-with-ui', version: 2, exportedAt: new Date().toISOString(), progress, learning: readLearning() }
}

export function previewLearningImport(text) {
  if (typeof text !== 'string' || text.length > 8_000_000) return { ok: false, error: 'File is too large.' }
  try {
    const value = JSON.parse(text)
    if (value.app !== 'cs-fundamentals-with-ui' || value.version !== 2 || !value.progress || typeof value.progress !== 'object' || Array.isArray(value.progress) || value.learning?.version !== 1) return { ok: false, error: 'Choose a version 2 learning-data backup from this app.' }
    const learning = validateLearning(value.learning)
    const current = readLearning()
    const conflicts = Object.entries(learning.practice).filter(([key, incoming]) => current.practice[key]?.draft && incoming.draft && current.practice[key].draft !== incoming.draft).length
    return { ok: true, value, learning, conflicts, drafts: Object.keys(learning.practice).length, readings: Object.keys(learning.reading).length }
  } catch { return { ok: false, error: 'This file is not valid JSON.' } }
}

export function mergeLearningImport(incoming) {
  return updateLearning(current => {
    const practice = { ...current.practice }
    for (const [key, entry] of Object.entries(incoming.practice)) {
      if (practice[key]?.draft && entry.draft && practice[key].draft !== entry.draft) {
        const base = `${key} [imported ${entry.updatedAt}]`
        let copy = base, count = 2
        while (practice[copy] && practice[copy].draft !== entry.draft) copy = `${base} ${count++}`
        practice[copy] = entry
      } else if (!practice[key] || practice[key].updatedAt < entry.updatedAt) practice[key] = entry
    }
    const reading = { ...current.reading }
    for (const [key, entry] of Object.entries(incoming.reading)) if (!reading[key] || reading[key].updatedAt < entry.updatedAt) reading[key] = entry
    return { ...current, reading, practice, sessions: { ...incoming.sessions, ...current.sessions } }
  })
}
