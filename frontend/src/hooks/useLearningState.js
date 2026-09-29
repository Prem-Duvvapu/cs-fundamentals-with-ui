import { useEffect, useState } from 'react'
import { readLearning, subscribeLearning, isLearningDurable } from '../utils/learningState'
export default function useLearningState() {
  const [state, setState] = useState(readLearning)
  useEffect(() => subscribeLearning(() => setState(readLearning())), [])
  return { state, durable: isLearningDurable() }
}
