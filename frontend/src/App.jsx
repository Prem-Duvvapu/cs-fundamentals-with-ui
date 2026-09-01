import { Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import TopicPage from './pages/TopicPage'
import SearchPage from './pages/SearchPage'
import InterviewPage from './pages/InterviewPage'

export default function App() {
  return (
    <div className="app">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/topic/:topicId" element={<TopicPage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/interview/:category" element={<InterviewPage />} />
        </Routes>
      </main>
    </div>
  )
}
