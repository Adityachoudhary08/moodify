import { createContext, useContext } from 'react'

export const MoodContext = createContext()

export const useMood = () => {
  const ctx = useContext(MoodContext)
  if (!ctx) throw new Error('useMood must be used within MoodProvider')
  return ctx
}
