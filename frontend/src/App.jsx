import { TopicExpansionProvider } from './hooks/useTopicExpansion'
import useCatalog, { CatalogProvider } from './hooks/useCatalog'
import CategoryPage from './pages/CategoryPage'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import SearchPage from './pages/SearchPage'
import InterviewPage from './pages/InterviewPage'
import ProgressPage from './pages/ProgressPage'
import ReviewPage from './pages/ReviewPage'
import NotFoundPage from './pages/NotFoundPage'
import AppErrorBoundary from './components/AppErrorBoundary'
import ProductTour from './components/shared/ProductTour'
import useProductTour from './hooks/useProductTour'
import { useEffect, useRef } from 'react'
import { CATEGORY_METADATA } from './utils/topicCategories'

function routeLabel(pathname, topics, status) {
  const topicId = pathname.match(/^\/topic\/([^/]+)$/)?.[1]
  if (topicId) {
    return topics.find(topic => topic.id === topicId)?.title
      || (status === 'ready' ? 'Topic not found' : status === 'error' ? "Couldn't load this lesson" : 'Lesson')
  }
  const categoryId = pathname.match(/^\/category\/([^/]+)$/)?.[1]
  if (categoryId) {
    return CATEGORY_METADATA[categoryId]?.label || 'Category not found'
  }
  const interviewCategory = pathname.match(/^\/interview\/([^/]+)$/)?.[1]
  if (interviewCategory) {
    if (interviewCategory === 'all') return 'Interview practice'
    return CATEGORY_METADATA[interviewCategory]
      ? `${CATEGORY_METADATA[interviewCategory].label} interview practice`
      : 'Unknown interview category'
  }
  return { '/': 'Learning paths', '/search': 'Search', '/progress': 'Your progress', '/review': 'Review session' }[pathname] || 'Page not found'
}

function RouteTitle() {
  const { pathname } = useLocation()
  const { topics, status } = useCatalog()
  useEffect(() => {
    if (/^\/topic\/[^/]+$/.test(pathname)) return
    document.title = `${routeLabel(pathname, topics, status)} | CS Fundamentals`
  }, [pathname, topics, status])
  return null
}

function RoutedContent() {
  const location = useLocation()
  return (
    <AppErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/category/:categoryId" element={<CategoryPage />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/interview/:category" element={<InterviewPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/review" element={<ReviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppErrorBoundary>
  )
}

function AppLayout({ tour }) {
  const { pathname } = useLocation()
  const { topics, status } = useCatalog()
  const mainRef = useRef(null)
  const previousPath = useRef(pathname)

  useEffect(() => {
    if (previousPath.current === pathname) return
    previousPath.current = pathname
    if (!tour.active) mainRef.current?.focus()
  }, [pathname, tour.active])

  return (
    <div className="app">
      <RouteTitle />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar onStartTour={tour.start} />
      <main id="main-content" className="main-content" tabIndex={-1} ref={mainRef} aria-label={routeLabel(pathname, topics, status)}>
        <RoutedContent />
      </main>
      <Footer />
      <ProductTour tour={tour} />
    </div>
  )
}

export default function App() {
  // Mounted here, a sibling of <Routes>, so its state survives the cross-route steps of the
  // guided tour instead of resetting when the matched route unmounts/remounts.
  const tour = useProductTour()
  return <CatalogProvider><TopicExpansionProvider><AppLayout tour={tour} /></TopicExpansionProvider></CatalogProvider>
}
