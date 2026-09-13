const STORAGE_KEY = 'cs-fundamentals-progress'
const PROGRESS_EVENT = 'cs-fundamentals:progress-change'
const PROGRESS_FILE_APP_ID = 'cs-fundamentals-with-ui'
const PROGRESS_FILE_VERSION = 1

function readAll() {
  if (typeof window === 'undefined') return {}

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeAll(progress) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress))
  } catch {
    // Storage can be unavailable in privacy modes; the in-memory update below still applies.
  }
  window.dispatchEvent(new CustomEvent(PROGRESS_EVENT, { detail: progress }))
  return progress
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
  isBookmarked,
  isCompleted,
  toggleBookmark,
  toggleCompleted,
  getCompletedCount,
  getBookmarkedIds,
  exportProgress,
  importProgress
}
