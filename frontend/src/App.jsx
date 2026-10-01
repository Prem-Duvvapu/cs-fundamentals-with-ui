import { CatalogProvider } from './hooks/useCatalog'
import CategoryPage from './pages/CategoryPage'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import Footer from './components/Footer'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import SearchPage from './pages/SearchPage'
import InterviewPage from './pages/InterviewPage'
import ProgressPage from './pages/ProgressPage'
import NotFoundPage from './pages/NotFoundPage'
import AppErrorBoundary from './components/AppErrorBoundary'
import ProductTour from './components/shared/ProductTour'
import useProductTour from './hooks/useProductTour'
import { useEffect } from 'react'
import { CATEGORY_METADATA } from './utils/topicCategories'

function RouteTitle() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (pathname.startsWith('/topic/')) return
    const categoryId = pathname.startsWith('/category/') ? pathname.slice('/category/'.length) : null
    const titles = {
      '/': 'Learning paths',
      '/search': 'Search',
      '/progress': 'Your progress'
    }
    const page = titles[pathname]
      || (categoryId ? CATEGORY_METADATA[categoryId]?.label || 'Category not found' : null)
      || (pathname.startsWith('/interview/') ? 'Interview practice' : 'Page not found')
    document.title = `${page} | CS Fundamentals`
  }, [pathname])
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
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppErrorBoundary>
  )
}

export default function App() {
  // Mounted here, a sibling of <Routes>, so its state survives the cross-route steps of the
  // guided tour instead of resetting when the matched route unmounts/remounts.
  const tour = useProductTour()

  return (
    <CatalogProvider><div className="app">
      <RouteTitle />
      <a className="skip-link" href="#main-content">Skip to content</a>
      <Navbar onStartTour={tour.start} />
      <main id="main-content" className="main-content" tabIndex={-1}>
        <RoutedContent />
      </main>
      <Footer />
      <ProductTour tour={tour} />
    </div></CatalogProvider>
  )
}
