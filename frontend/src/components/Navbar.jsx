import { useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import useTheme from '../hooks/useTheme'
import useDisclosure from '../hooks/useDisclosure'
import Icon from './shared/Icon'
import { CATEGORY_METADATA, CATEGORY_ORDER, getTopicCategory } from '../utils/topicCategories'

function getActiveCategory(pathname) {
  const topicId = pathname.match(/^\/topic\/([^/]+)/)?.[1]
  return pathname.match(/^\/category\/([^/]+)/)?.[1] || getTopicCategory(topicId, null) || undefined
}

function NavLink({ to, icon, label, active }) {
  return (
    <Link to={to} className={`nav-item${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      <Icon name={icon} />
      <span>{label}</span>
    </Link>
  )
}

export default function Navbar({ onStartTour }) {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const menu = useDisclosure()
  const learn = useDisclosure()
  const help = useDisclosure()
  const { setOpen: setMenuOpen } = menu
  const { setOpen: setLearnOpen } = learn
  const { setOpen: setHelpOpen } = help
  const { theme, toggleTheme } = useTheme()
  const activeCategory = getActiveCategory(pathname)
  const nextTheme = theme === 'dark' ? 'light' : 'dark'

  useEffect(() => {
    setMenuOpen(false)
    setLearnOpen(false)
    setHelpOpen(false)
  }, [pathname, setMenuOpen, setLearnOpen, setHelpOpen])

  useEffect(() => {
    const shortcut = event => {
      if (event.isComposing || event.target.closest?.('input, textarea, select, [contenteditable="true"]')) return
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); navigate('/search') }
    }
    window.addEventListener('keydown', shortcut)
    return () => window.removeEventListener('keydown', shortcut)
  }, [navigate])

  const learnActive = pathname === '/' || Boolean(activeCategory)

  return (
    <nav className={`navbar${menu.open ? ' navbar--expanded' : ''}`} aria-label="Primary navigation" {...menu.containerProps}>
      <Link to="/" className="logo" aria-label="CS Fundamentals home">
        <svg className="logo-mark" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M12 2.5 21.5 12 12 21.5 2.5 12Z" /></svg>
        <span className="logo-text">CS Fundamentals</span>
      </Link>

      <Link to="/search" className={`nav-item nav-search${pathname === '/search' ? ' is-active' : ''}`} aria-current={pathname === '/search' ? 'page' : undefined} aria-label="Search" title="Search (Ctrl+K)">
        <Icon name="search" />
        <span className="nav-search-label" aria-hidden="true">Search</span>
        <kbd className="nav-shortcut" aria-hidden="true">Ctrl K</kbd>
      </Link>

      <button className="nav-menu-toggle" {...menu.triggerProps} aria-label={menu.open ? 'Close menu' : 'Menu'}>
        <Icon name={menu.open ? 'close' : 'menu'} />
        <span aria-hidden="true">{menu.open ? 'Close' : 'Menu'}</span>
      </button>

      <div className="nav-collapsible" id={menu.panelProps.id}>
        <div className="nav-group">
          <div className="nav-disclosure" {...learn.containerProps}>
            <button className={`nav-item nav-disclosure-trigger${learnActive ? ' is-context' : ''}`} {...learn.triggerProps}>
              <Icon name="book" />
              <span>Learn</span>
              <Icon name={learn.open ? 'chevronUp' : 'chevronDown'} size={14} className="nav-chevron" />
            </button>
            <div className="nav-panel nav-panel--learn" {...learn.panelProps}>
              <Link to="/" className="nav-panel-link" aria-current={pathname === '/' ? 'page' : undefined}>All learning paths</Link>
              <ul className="nav-category-list" aria-label="Curriculum categories">
                {CATEGORY_ORDER.map(id => (
                  <li key={id} data-category={id}>
                    <Link to={`/category/${id}`} className="nav-panel-link nav-category-link" aria-current={activeCategory === id ? 'page' : undefined}>
                      <span className="category-glyph" aria-hidden="true">{CATEGORY_METADATA[id].glyph}</span>
                      <span>{CATEGORY_METADATA[id].label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <NavLink to="/interview/all" icon="interview" label="Interview Mode" active={pathname.startsWith('/interview')} />
          <NavLink to="/progress" icon="progress" label="Progress" active={pathname === '/progress' || pathname === '/review'} />
        </div>

        <div className="nav-group nav-group--utilities">
          <div className="nav-disclosure" {...help.containerProps}>
            <button className="nav-item nav-disclosure-trigger" {...help.triggerProps}>
              <Icon name="help" />
              <span>Help</span>
              <Icon name={help.open ? 'chevronUp' : 'chevronDown'} size={14} className="nav-chevron" />
            </button>
            <div className="nav-panel nav-panel--help" {...help.panelProps}>
              <button type="button" className="nav-panel-link" onClick={() => { help.close(); menu.close(); onStartTour?.() }}>Take a tour of the app</button>
              <p className="nav-panel-note">Press <kbd>Ctrl</kbd> + <kbd>K</kbd> (or <kbd>⌘</kbd> + <kbd>K</kbd>) to open Search.</p>
            </div>
          </div>
          <button type="button" className="nav-item theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${nextTheme} theme`} title={`Switch to ${nextTheme} theme`}>
            <Icon name={theme === 'dark' ? 'sun' : 'moon'} />
            <span className="theme-toggle-label" aria-hidden="true">{theme === 'dark' ? 'Light theme' : 'Dark theme'}</span>
          </button>
        </div>
      </div>
    </nav>
  )
}
