import { Link, useLocation } from 'react-router-dom'
import useTheme from '../hooks/useTheme'

const CATEGORY_LINKS = [
  { id: 'os', glyph: '◆', label: 'OS', firstTopic: 'process-management' },
  { id: 'networking', glyph: '⬡', label: 'NET', firstTopic: 'network-fundamentals' },
  { id: 'dbms', glyph: '▤', label: 'DB', firstTopic: 'dbms-introduction' },
  { id: 'java-spring', glyph: '◐', label: 'JAVA', firstTopic: 'java-execution-pipeline' },
  { id: 'aiml', glyph: '✳', label: 'AI/ML', firstTopic: 'embeddings-vector-db' }
]

const TOPIC_CATEGORIES = {
  os: new Set(['process-management', 'memory-management', 'cpu-scheduling', 'synchronization', 'deadlocks', 'file-systems', 'io-systems', 'disk-scheduling']),
  networking: new Set(['network-fundamentals', 'physical-layer-media', 'osi-model', 'data-link-layer', 'ip-subnetting', 'routing-algorithms', 'tcp-ip', 'tcp-congestion', 'transport-layer-protocols', 'application-layer', 'network-security', 'network-performance-qos']),
  dbms: new Set(['dbms-introduction', 'dbms-architecture', 'er-model', 'relational-algebra-calculus', 'sql-querying', 'functional-dependencies-keys', 'database-normalization', 'dbms-indexing', 'storage-raid-indexing', 'transactions-acid', 'concurrency-control', 'query-optimization', 'distributed-databases-cap']),
  'java-spring': new Set(['java-execution-pipeline', 'java-memory-model', 'java-oop-pillars', 'java-static-final-records', 'jvm-gc', 'java-functional-lambdas', 'java-generics', 'java-collections-framework', 'java-hashmap-internals', 'java-streams-optional', 'java-reflection-exceptions', 'java-multithreading-concurrency', 'spring-bean-lifecycle', 'spring-mvc-lifecycle', 'jpa-hibernate-lifecycle', 'spring-batch-lifecycle', 'quartz-scheduler', 'design-patterns-solid', 'spring-boot-internals', 'spring-rest-api-design', 'spring-security', 'spring-caching-async', 'spring-testing-production']),
  aiml: new Set(['ml-fundamentals', 'embeddings-vector-db', 'rag-architecture', 'model-serving', 'llm-parameters', 'feature-stores', 'recommendation-systems'])
}

function getActiveCategory(pathname) {
  const categoryMatch = pathname.match(/^\/category\/([^/]+)/)
  if (categoryMatch) return categoryMatch[1]

  const topicId = pathname.match(/^\/topic\/([^/]+)/)?.[1]
  return CATEGORY_LINKS.find(({ id }) => TOPIC_CATEGORIES[id].has(topicId))?.id
}

export default function Navbar() {
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
