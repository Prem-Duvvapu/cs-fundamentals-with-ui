import { CATEGORY_ORDER, LEVEL_ORDER } from './topicCategories'
import { isBookmarked, isCompleted } from './topicProgress'

const LEVELS = ['beginner', 'intermediate', 'expert']

function categoryOf(topic) {
  return topic.category || 'os'
}

function byLevelThenTitle(left, right) {
  const levelDifference = (LEVEL_ORDER[left.level || 'beginner'] ?? 0) - (LEVEL_ORDER[right.level || 'beginner'] ?? 0)
  return levelDifference || left.title.localeCompare(right.title)
}

// The recommended study order: CATEGORY_ORDER's sequence, then level/title within each category —
// the same ordering HomePage.jsx renders topic rows in.
function orderTopics(topics) {
  const byCategory = new Map(CATEGORY_ORDER.map((id) => [id, []]))
  for (const topic of topics) {
    byCategory.get(categoryOf(topic))?.push(topic)
  }
  return CATEGORY_ORDER.flatMap((id) => [...byCategory.get(id)].sort(byLevelThenTitle))
}

function toStats(completed, total) {
  return { completed, total, percent: total === 0 ? 0 : Math.round((completed / total) * 100) }
}

function computeOverallStats(topics, progress) {
  const completed = topics.filter((topic) => isCompleted(topic.id, progress)).length
  return toStats(completed, topics.length)
}

function computeCategoryStats(topics, progress) {
  const stats = {}
  for (const id of CATEGORY_ORDER) {
    const categoryTopics = topics.filter((topic) => categoryOf(topic) === id)
    const completed = categoryTopics.filter((topic) => isCompleted(topic.id, progress)).length
    stats[id] = toStats(completed, categoryTopics.length)
  }
  return stats
}

function computeLevelStats(topics, progress) {
  const stats = {}
  for (const level of LEVELS) {
    const levelTopics = topics.filter((topic) => (topic.level || 'beginner') === level)
    const completed = levelTopics.filter((topic) => isCompleted(topic.id, progress)).length
    stats[level] = toStats(completed, levelTopics.length)
  }
  return stats
}

// The first not-yet-completed topic in curriculum order — null once everything is completed
// (or there are no topics at all).
function getNextTopic(topics, progress) {
  return orderTopics(topics).find((topic) => !isCompleted(topic.id, progress)) || null
}

function getBookmarkedTopics(topics, progress) {
  return orderTopics(topics).filter((topic) => isBookmarked(topic.id, progress))
}

export { computeOverallStats, computeCategoryStats, computeLevelStats, getNextTopic, getBookmarkedTopics }
