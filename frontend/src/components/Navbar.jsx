import { Link, useLocation } from 'react-router-dom'
import useTheme from '../hooks/useTheme'
import { getTopicCategory } from '../utils/topicCategories'

const CATEGORY_LINKS = [
  { id: 'os', glyph: '◆', label: 'OS', firstTopic: 'process-management' },
  { id: 'networking', glyph: '⬡', label: 'NET', firstTopic: 'network-fundamentals' },
  { id: 'dbms', glyph: '▤', label: 'DB', firstTopic: 'dbms-introduction' },
  { id: 'java-spring', glyph: '◐', label: 'JAVA', firstTopic: 'java-execution-pipeline' },
  { id: 'aiml', glyph: '✳', label: 'AI/ML', firstTopic: 'embeddings-vector-db' },
  { id: 'devops', glyph: '⚙', label: 'DEVOPS', firstTopic: 'docker-fundamentals' }
]

function getActiveCategory(pathname) {
  const topicId = pathname.match(/^\/topic\/([^/]+)/)?.[1]
  return getTopicCategory(topicId, null) ?? undefined
}

export default function Navbar({ onStartTour }) {
  const { pathname } = useLocation()
  const { theme, toggleTheme } = useTheme()
  const activeCategory = getActiveCategory(pathname)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  return (
    <nav className="navbar" aria-label="Primary navigation">
      <div className="navbar-top-row">
        <Link to="/" className="logo" aria-label="CS Fundamentals home">
          <span className="logo-glyph" aria-hidden="true">◆</span>
          <span className="logo-text">CS Fundamentals</span>
        </Link>
        <div className="navbar-actions">
          <Link
            to="/search"
            className={`navbar-icon-link ${pathname === '/search' ? 'active' : ''}`}
            aria-current={pathname === '/search' ? 'page' : undefined}
            aria-label="Search"
          >
            <span aria-hidden="true">🔍</span>
            <span aria-hidden="true">Search</span>
          </Link>
          <Link
            to="/interview/all"
            className={`navbar-icon-link ${pathname.startsWith('/interview') ? 'active' : ''}`}
            aria-current={pathname.startsWith('/interview') ? 'page' : undefined}
            aria-label="Interview Mode"
          >
            <span aria-hidden="true">🎯</span>
            <span aria-hidden="true">Interview Mode</span>
          </Link>
          <Link
            to="/progress"
            className={`navbar-icon-link ${pathname === '/progress' ? 'active' : ''}`}
            aria-current={pathname === '/progress' ? 'page' : undefined}
            aria-label="Progress"
          >
            <span aria-hidden="true">📊</span>
            <span aria-hidden="true">Progress</span>
          </Link>
          <button
            type="button"
            className="navbar-tour-btn"
            onClick={onStartTour}
            aria-label="Take a tour of the app"
          >
            <span aria-hidden="true">🧭</span>
            <span aria-hidden="true">Take a tour</span>
          </button>
          <button
            type="button"
            className="theme-toggle"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
          >
            <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
          </button>
        </div>
      </div>

      <ul className="nav-links u-scroll-x" aria-label="Curriculum categories">
        {CATEGORY_LINKS.map(({ id, glyph, label, firstTopic }) => {
          const isActive = activeCategory === id
          return (
            <li key={id} data-category={id}>
              <Link
                to={`/topic/${firstTopic}`}
                className={isActive ? 'active' : undefined}
                aria-current={isActive ? 'page' : undefined}
              >
                <span aria-hidden="true">{glyph}</span> {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
