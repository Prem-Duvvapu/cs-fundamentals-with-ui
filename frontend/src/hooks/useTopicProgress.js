import { useCallback, useEffect, useState } from 'react'
import { readAll, toggleBookmark, toggleCompleted, PROGRESS_EVENT } from '../utils/topicProgress'

export default function useTopicProgress() {
  const [progress, setProgress] = useState(readAll)

  useEffect(() => {
    const handleChange = (event) => setProgress(event.detail ? { ...event.detail } : readAll())
    window.addEventListener(PROGRESS_EVENT, handleChange)
    return () => window.removeEventListener(PROGRESS_EVENT, handleChange)
  }, [])

  const bookmark = useCallback((topicId) => toggleBookmark(topicId), [])
  const complete = useCallback((topicId) => toggleCompleted(topicId), [])

  return { progress, toggleBookmark: bookmark, toggleCompleted: complete }
}
