const STORAGE_KEY = 'cs-fundamentals-progress'
const PROGRESS_EVENT = 'cs-fundamentals:progress-change'

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

export {
  STORAGE_KEY,
  PROGRESS_EVENT,
  readAll,
  isBookmarked,
  isCompleted,
  toggleBookmark,
  toggleCompleted,
  getCompletedCount,
  getBookmarkedIds
}
