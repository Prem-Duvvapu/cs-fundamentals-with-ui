import { useState, useEffect, useCallback } from 'react'

export function useSimulationTimer({ totalSteps = 0, initialSpeed = 1000 } = {}) {
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [speed, setSpeed] = useState(initialSpeed) // ms per step

  const togglePlay = useCallback(() => {
    setIsPlaying(prev => {
      if (!prev && currentTime >= totalSteps && totalSteps > 0) {
        setCurrentTime(0)
      }
      return !prev
    })
  }, [currentTime, totalSteps])

  const stepForward = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(prev => Math.min(totalSteps, prev + 1))
  }, [totalSteps])

  const stepBackward = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(prev => Math.max(0, prev - 1))
  }, [])

  const reset = useCallback(() => {
    setIsPlaying(false)
    setCurrentTime(0)
  }, [])

  useEffect(() => {
    let timer = null
    if (isPlaying) {
      timer = setInterval(() => {
        setCurrentTime(prev => {
          if (prev >= totalSteps) {
            setIsPlaying(false)
            return prev
          }
          return prev + 1
        })
      }, speed)
    }
    return () => {
      if (timer) clearInterval(timer)
    }
  }, [isPlaying, speed, totalSteps])

  return {
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    togglePlay,
    stepForward,
    stepBackward,
    reset,
    speed,
    setSpeed
  }
}
