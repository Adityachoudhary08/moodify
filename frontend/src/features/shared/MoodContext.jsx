import { useState } from 'react'
import { MoodContext } from './MoodContext.store'

export const MoodProvider = ({ children }) => {
  const [currentMood, setCurrentMood] = useState(null)
  const [desiredMood, setDesiredMood] = useState(null)
  const [confidence, setConfidence] = useState(null)
  const [previousMood, setPreviousMood] = useState(null)
  const [isRechecking, setIsRechecking] = useState(false)

  const beginRecheck = (mood) => {
    setPreviousMood(mood || currentMood)
    setIsRechecking(true)
  }

  const clearRecheck = () => {
    setPreviousMood(null)
    setIsRechecking(false)
  }

  const resetMood = () => {
    setCurrentMood(null)
    setDesiredMood(null)
    setConfidence(null)
    clearRecheck()
  }

  return (
    <MoodContext.Provider value={{
      currentMood, setCurrentMood,
      desiredMood, setDesiredMood,
      confidence, setConfidence,
      previousMood, isRechecking, beginRecheck, clearRecheck,
      resetMood
    }}>
      {children}
    </MoodContext.Provider>
  )
}
