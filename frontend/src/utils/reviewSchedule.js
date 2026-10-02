export const DAY = 86_400_000
export const MAX_ATTEMPTS = 10
const assessments = ['review', 'partial', 'confident']
const timestamp = value => Number.isFinite(value) && value >= 0 && value <= 8.64e15
const keyAllowed = key => typeof key === 'string' && key.length > 0 && key.length <= 4096 && !['__proto__', 'constructor', 'prototype'].includes(key)

export function normalizeReviews(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return Object.fromEntries(Object.entries(value).filter(([key, entry]) => keyAllowed(key) && entry && typeof entry === 'object')
    .map(([key, entry]) => {
      const attempts = (Array.isArray(entry.attempts) ? entry.attempts : []).filter(attempt =>
        attempt && typeof attempt.id === 'string' && attempt.id.length <= 100 && timestamp(attempt.at) &&
        assessments.includes(attempt.assessment) && typeof attempt.draft === 'string' && attempt.draft.length <= 20000)
        .map(attempt => ({ id: attempt.id, at: attempt.at, assessment: attempt.assessment, draft: attempt.draft, answerViewed: attempt.answerViewed === true }))
      const unique = [...new Map(attempts.map(attempt => [JSON.stringify(attempt), attempt])).values()]
        .sort((a, b) => a.at - b.at).slice(-MAX_ATTEMPTS)
      return [key, { attempts: unique, dueAt: timestamp(entry.dueAt) ? entry.dueAt : 0,
        intervalDays: [0, 1, 3, 7, 14, 28, 30].includes(entry.intervalDays) ? entry.intervalDays : 0,
        updatedAt: timestamp(entry.updatedAt) ? entry.updatedAt : 0 }]
    }))
}

export function nextInterval(assessment, previous = 0) {
  if (assessment === 'review') return 1
  if (assessment === 'partial') return 3
  if (assessment === 'confident') return previous < 7 ? 7 : Math.min(30, previous * 2)
  throw new Error('Choose a self-assessment before recording an attempt.')
}

export function mergeReviews(current, incoming) {
  const merged = { ...normalizeReviews(current) }
  for (const [key, entry] of Object.entries(normalizeReviews(incoming))) {
    const existing = merged[key]
    if (!existing) { merged[key] = entry; continue }
    const newer = entry.updatedAt > existing.updatedAt ? entry : existing
    merged[key] = { ...newer, attempts: [...existing.attempts, ...entry.attempts] }
  }
  return normalizeReviews(merged)
}

export function reviewCandidates(state, now = Date.now(), mixed = true) {
  const entries = Object.entries(state.practice).filter(([key, value]) =>
    !/ \[imported \d+\]( \d+)?$/.test(key) && assessments.includes(value.assessment))
    .map(([key, value]) => ({ key, assessment: value.assessment,
      dueAt: state.reviews?.[key]?.dueAt ?? value.updatedAt + nextInterval(value.assessment) * DAY }))
    .sort((a, b) => a.dueAt - b.dueAt || a.key.localeCompare(b.key))
  const due = entries.filter(item => item.dueAt <= now)
  const selected = due.slice(0, mixed ? 5 : 8).map(item => ({ ...item, reason: 'Due for review' }))
  if (mixed) {
    const recalled = entries.filter(item => item.assessment === 'confident' && !selected.some(chosen => chosen.key === item.key))
      .slice(0, 8 - selected.length).map(item => ({ ...item, reason: item.dueAt <= now ? 'Due for review' : 'Earlier practice of a previously recalled answer' }))
    selected.push(...recalled)
  }
  return selected
}
