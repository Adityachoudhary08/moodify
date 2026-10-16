import { useEffect, useState } from 'react'

export const songKey = (song) => String(song?.id || song?._id || `${song?.title || ''}-${song?.artist || ''}`)
export const playableSongs = (songs = []) => songs.filter((song) => song?.streamUrl || song?.url)
export const shuffle = (items = []) => [...items].sort(() => Math.random() - 0.5)
export const formatClock = (seconds) => `${String(Math.floor(Math.max(0, seconds) / 60)).padStart(2, '0')}:${String(Math.max(0, seconds) % 60).padStart(2, '0')}`

export function useSecondTimer(active, initial, onEnd) {
  const [seconds, setSeconds] = useState(initial)
  useEffect(() => {
    if (!active) return undefined
    if (seconds <= 0) { const id = window.setTimeout(() => onEnd?.(), 0); return () => window.clearTimeout(id) }
    const id = window.setTimeout(() => setSeconds((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [active, seconds, onEnd])
  return [seconds, setSeconds]
}
