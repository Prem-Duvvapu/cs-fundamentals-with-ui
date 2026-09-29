import { useCallback, useEffect, useState } from 'react'
import { readAll, toggleBookmark, toggleCompleted, subscribeProgress, isProgressDurable } from '../utils/topicProgress'

export default function useTopicProgress() {
  const [progress, setProgress] = useState(readAll)

  useEffect(() => subscribeProgress(setProgress), [])

  const bookmark = useCallback((topicId) => toggleBookmark(topicId), [])
  const complete = useCallback((topicId) => toggleCompleted(topicId), [])

  return { progress, durable: isProgressDurable(), toggleBookmark: bookmark, toggleCompleted: complete }
}
