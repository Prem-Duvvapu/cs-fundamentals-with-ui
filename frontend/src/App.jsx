import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import SearchPage from './pages/SearchPage'
import InterviewPage from './pages/InterviewPage'
import NotFoundPage from './pages/NotFoundPage'
import AppErrorBoundary from './components/AppErrorBoundary'

function RoutedContent() {
  const location = useLocation()
  return (
    <AppErrorBoundary key={location.pathname}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/topic/:topicId" element={<TopicPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/interview/:category" element={<InterviewPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </AppErrorBoundary>
  )
}

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <RoutedContent />
      </main>
    </div>
  )
}
