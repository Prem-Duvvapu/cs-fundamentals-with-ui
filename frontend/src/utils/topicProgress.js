const STORAGE_KEY = 'cs-fundamentals-progress'
const PROGRESS_EVENT = 'cs-fundamentals:progress-change'
const PROGRESS_FILE_APP_ID = 'cs-fundamentals-with-ui'
const PROGRESS_FILE_VERSION = 1

const UNSAFE_KEYS = ['__proto__', 'constructor', 'prototype']

// Used only after a write has failed, so successive toggles keep working for this session
// instead of every read falling back to an empty map.
let sessionOnlyProgress = null

function sanitizeProgress(value) {
  const result = {}
  if (!value || typeof value !== 'object' || Array.isArray(value)) return result
  for (const [topicId, entry] of Object.entries(value)) {
    if (UNSAFE_KEYS.includes(topicId) || topicId.length > 200) continue
    const sanitized = sanitizeEntry(entry)
    if (sanitized) result[topicId] = sanitized
  }
  return result
}

function readAll() {
  if (typeof window === 'undefined') return {}
  if (sessionOnlyProgress) return { ...sessionOnlyProgress }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? sanitizeProgress(JSON.parse(raw)) : {}
  } catch {
    return {}
  }
}

function writeAll(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
    sessionOnlyProgress = null
  } catch {
    sessionOnlyProgress = { ...progress }
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: progress }))
  return progress
}

function isProgressDurable() {
  return sessionOnlyProgress === null
}

// Another tab wrote the same key; drop any session-only copy so this tab reads the shared state.
function subscribeProgress(listener) {
  const handleLocal = event => listener(event.detail ? { ...event.detail } : readAll())
  const handleStorage = event => {
    if (event.key !== STORAGE_KEY && event.key !== null) return
    sessionOnlyProgress = null
    listener(readAll())
  }
  window.addEventListener(PROGRESS_EVENT, handleLocal)
  window.addEventListener('storage', handleStorage)
  return () => {
    window.removeEventListener(PROGRESS_EVENT, handleLocal)
    window.removeEventListener('storage', handleStorage)
  }
}

function isBookmarked(topicId, progress = readAll()) {
  return Boolean(progress[topicId]?.bookmarked)
}

function isCompleted(topicId, progress = readAll()) {
  return Boolean(progress[topicId]?.completed)
}

function toggleBookmark(topicId) {
  const progress = readAll()
  const current = progress[topicId] || {}
  return writeAll({ ...progress, [topicId]: { ...current, bookmarked: !current.bookmarked } })
}

function toggleCompleted(topicId) {
  const progress = readAll()
  const current = progress[topicId] || {}
  return writeAll({ ...progress, [topicId]: { ...current, completed: !current.completed } })
}

function getCompletedCount(progress = readAll()) {
  return Object.values(progress).filter((entry) => entry?.completed).length
}

function getBookmarkedIds(progress = readAll()) {
  return Object.keys(progress).filter((topicId) => progress[topicId]?.bookmarked)
}

function sanitizeEntry(entry) {
  if (!entry || typeof entry !== 'object') return null
  const sanitized = {}
  if (typeof entry.bookmarked === 'boolean') sanitized.bookmarked = entry.bookmarked
  if (typeof entry.completed === 'boolean') sanitized.completed = entry.completed
  return Object.keys(sanitized).length > 0 ? sanitized : null
}

function exportProgress() {
  return {
    app: PROGRESS_FILE_APP_ID,
    version: PROGRESS_FILE_VERSION,
    exportedAt: new Date().toISOString(),
    progress: readAll()
  }
}

// Merges rather than replaces: an imported field only ever turns bookmarked/completed
// *on*, so restoring a backup can never silently erase progress made since it was taken.
function importProgress(input) {
  let data
  try {
    data = typeof input === 'string' ? JSON.parse(input) : input
  } catch {
    return { ok: false, error: 'invalid-json' }
  }

  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    return { ok: false, error: 'invalid-format' }
  }
  if (typeof data.version !== 'number') {
    return { ok: false, error: 'invalid-format' }
  }
  if (data.version > PROGRESS_FILE_VERSION) {
    return { ok: false, error: 'unsupported-version' }
  }
  if (!data.progress || typeof data.progress !== 'object' || Array.isArray(data.progress)) {
    return { ok: false, error: 'invalid-format' }
  }

  const merged = { ...readAll() }
  let importedCount = 0

  for (const [topicId, entry] of Object.entries(data.progress)) {
    if (UNSAFE_KEYS.includes(topicId) || topicId.length > 200) continue
    const sanitized = sanitizeEntry(entry)
    if (!sanitized) continue
    const existing = merged[topicId] || {}
    merged[topicId] = {
      bookmarked: Boolean(existing.bookmarked) || Boolean(sanitized.bookmarked),
      completed: Boolean(existing.completed) || Boolean(sanitized.completed)
    }
    importedCount += 1
  }

  writeAll(merged)
  return { ok: true, importedCount }
}

export {
  STORAGE_KEY,
  PROGRESS_EVENT,
  PROGRESS_FILE_VERSION,
  readAll,
  isProgressDurable,
  subscribeProgress,
  isBookmarked,
  isCompleted,
  toggleBookmark,
  toggleCompleted,
  getCompletedCount,
  getBookmarkedIds,
  exportProgress,
  importProgress
}
