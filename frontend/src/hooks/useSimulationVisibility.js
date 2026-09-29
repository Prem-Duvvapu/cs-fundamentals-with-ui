import { createContext, useContext, useEffect } from 'react'
export const SimulationVisibility = createContext(true)
export default function useSimulationVisibility(stopPlaying) {
  const visible = useContext(SimulationVisibility)
  useEffect(() => { if (!visible) stopPlaying(false) }, [visible, stopPlaying])
  return visible
}
