import { createContext, useContext, useState } from 'react'

const TopicExpansionContext = createContext(null)

export function TopicExpansionProvider({ children }) {
  const state = useState({})
  return <TopicExpansionContext.Provider value={state}>{children}</TopicExpansionContext.Provider>
}

export default function useTopicExpansion() {
  const shared = useContext(TopicExpansionContext)
  const local = useState({})
  return shared || local
}
