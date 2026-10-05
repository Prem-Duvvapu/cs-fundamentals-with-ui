import { Link } from 'react-router-dom'
import Icon from './Icon'
import { hasTopicVisualizer } from '../visualizers/topicVisualizerRegistry'
import { CATEGORY_METADATA, LEVEL_GLYPHS, LEVEL_LABELS } from '../../utils/topicCategories'

/**
 * One ordered lesson in a browsing list. The title is the single navigation link; bookmarking is a
 * separate button so it never sits inside the link. Capabilities come from the canonical catalog
 * and the visualizer registry, never from page-local flags.
 */
export default function LessonRow({ topic, number, bookmarked, completed, onToggleBookmark, description, showCategory = false, headingLevel = 3, children }) {
  const Heading = `h${headingLevel}`
  const level = topic.level || 'beginner'
  const category = CATEGORY_METADATA[topic.category]
  return (
    <li className="lesson-row" data-category={topic.category}>
      <span className="lesson-row-number" aria-hidden="true">{String(number).padStart(2, '0')}</span>
      <div className="lesson-row-body">
        <Heading className="lesson-row-title"><Link to={`/topic/${topic.id}`}>{topic.title}</Link></Heading>
        {description && <p className="lesson-row-summary">{description}</p>}
        <p className="lesson-row-meta">
          {showCategory && category && <span className="lesson-tag lesson-tag--category"><span className="category-glyph" aria-hidden="true">{category.glyph}</span>{category.label}</span>}
          <span className={`lesson-tag lesson-tag--${level}`} aria-label={`${LEVEL_LABELS[level] || 'Beginner'} level`}>
            <span className="tier-badge-glyph" aria-hidden="true">{LEVEL_GLYPHS[level] || LEVEL_GLYPHS.beginner}</span>
            <span>{LEVEL_LABELS[level] || 'Beginner'}</span>
          </span>
          {hasTopicVisualizer(topic.id) && <span className="lesson-tag lesson-tag--simulation"><Icon name="play" size={12} />Simulation</span>}
          {completed && <span className="lesson-tag lesson-tag--completed"><Icon name="check" size={12} />Completed</span>}
        </p>
        {children}
      </div>
      <button
        type="button"
        className="bookmark-toggle-icon"
        aria-pressed={bookmarked}
        aria-label={bookmarked ? `Remove ${topic.title} from bookmarks` : `Bookmark ${topic.title}`}
        onClick={() => onToggleBookmark(topic.id)}
      >
        <Icon name="bookmark" size={18} filled={bookmarked} />
      </button>
    </li>
  )
}
