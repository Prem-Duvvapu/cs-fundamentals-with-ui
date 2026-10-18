import { CATEGORY_METADATA, TOPIC_CATEGORY_MAP } from './topicCategories'

const REPOSITORY = 'https://github.com/Prem-Duvvapu/cs-fundamentals-with-ui/blob/main'
const SOURCE_ORIGIN = 'https://curriculum.invalid'

// Markdown paths belong to their source file, not the current React route.
export function resolveCurriculumLink(href, category) {
  if (!href || !CATEGORY_METADATA[category] || /^(?:[a-z][a-z\d+.-]*:|\/|#|\?)/i.test(href)) return href
  let target
  try { target = new URL(href, `${SOURCE_ORIGIN}/content/${category}/lesson.md`) } catch { return href }
  if (target.origin !== SOURCE_ORIGIN) return href
  const lesson = /^\/content\/([^/]+)\/\d+[a-z]*-([^/]+)\.md$/.exec(target.pathname)
  if (lesson && TOPIC_CATEGORY_MAP[lesson[2]] === lesson[1]) {
    return `/topic/${lesson[2]}${target.search}${target.hash}`
  }
  return `${REPOSITORY}${target.pathname}${target.search}${target.hash}`
}
