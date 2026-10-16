import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useMood } from '../shared/MoodContext.store'
import { useSong } from '../Home/hooks/useSong'
import Navbar from '../shared/new/Navbar'
import './mood.scss'

const DESIRED_MOODS = [
  { mood: 'happy', label: 'Happier', emoji: '😊', color: '#f59e0b' },
  { mood: 'energetic', label: 'Energetic', emoji: '⚡', color: '#10b981' },
  { mood: 'funky', label: 'Funk', emoji: '🕺', color: '#8b5cf6' },
  { mood: 'relaxed', label: 'Chill', emoji: '😌', color: '#06b6d4' },
  { mood: 'romantic', label: 'Romantic', emoji: '❤️', color: '#f43f5e' },
  { mood: 'sad', label: 'Stay in my feels', emoji: '🌙', color: '#6366f1' },
  { mood: 'surprise', label: 'Surprise me', emoji: '🎲', color: '#c9a84c' },
]

export default function MoodPage() {
  const navigate = useNavigate()
  const { currentMood, setDesiredMood: setContextDesiredMood, confidence, clearRecheck } = useMood()
  const { handleGetSong } = useSong()

  const [selectedDesiredMood, setSelectedDesiredMood] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const pageRef = useRef()

  // Redirect if no mood detected
  useEffect(() => {
    if (!currentMood) {
      navigate('/detect')
    }
  }, [currentMood, navigate])

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.mood-detected-badge, .mood-transition-text, .desired-mood-option, .mood-actions', { clearProps: 'all' })
        return
      }
      gsap.fromTo('.mood-detected-badge', { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(1.4)', delay: 0.2 })
      gsap.fromTo('.mood-transition-text', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.45 })
      gsap.fromTo('.desired-mood-option', { opacity: 0, y: 30, scale: 0.95 }, { opacity: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.5, ease: 'power3.out', delay: 0.6 })
      gsap.fromTo('.mood-actions', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.9 })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  const handleProceed = async (desiredMoodOverride) => {
    const finalDesired = desiredMoodOverride || selectedDesiredMood || currentMood
    setContextDesiredMood(finalDesired)
    clearRecheck()
    setIsLoading(true)

    try {
      await handleGetSong({ mood: currentMood, desiredMood: finalDesired })
      navigate('/playlist')
    } catch {
      navigate('/playlist')
    } finally {
      setIsLoading(false)
    }
  }

  if (!currentMood) return null

  return (
    <div className="mood-page" ref={pageRef}>
      <Navbar />
      <div className="mood-inner">

        {/* Current mood display */}
        <div className="mood-current-section">
          <p className="mood-section-label">MOODIFY / CURRENT VIBE</p>
          <div className="mood-detected-badge">
            <div>
              <p className="mood-detected-label">CURRENT STATE:</p>
              <p className="mood-detected-name">{currentMood.toUpperCase()}</p>
              {confidence && (
                <p className="mood-detected-confidence">
                  Signal: {Math.round(confidence * 100)}% · not a diagnosis
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Desired mood selection */}
        <div className="mood-desired-section">
          <p className="mood-section-label">BUT…</p>
          <div className="mood-transition-text">
            <h1 className="desired-heading">
              Your current vibe is {currentMood}. Where should the mix take you?
            </h1>
            <p className="desired-sub">Stay with this feeling or choose a direction for the music.</p>
          </div>

          <div className="desired-mood-grid">
            {DESIRED_MOODS.map(({ mood, label, emoji, color }) => (
              <button
                key={mood}
                type="button"
                className={`desired-mood-option${selectedDesiredMood === mood ? ' is-selected' : ''}`}
                style={{ '--mood-accent': color }}
                onClick={() => setSelectedDesiredMood(mood === selectedDesiredMood ? null : mood)}
                id={`mood-option-${mood}`}
              >
                <span className="desired-emoji" aria-hidden="true">{emoji}</span>
                <span className="desired-label">{label}</span>
                {selectedDesiredMood === mood && (
                  <span className="desired-check" aria-label="Selected">✓</span>
                )}
              </button>
            ))}
          </div>

          <div className="mood-actions">
            <button
              type="button"
              className="btn-go"
              disabled={!selectedDesiredMood || isLoading}
              onClick={() => handleProceed()}
              id="mood-lets-go-btn"
            >
              {isLoading ? 'BUILDING YOUR MIX…' : "LET'S GO →"}
            </button>
            <button
              type="button"
              className="btn-keep"
              disabled={isLoading}
              onClick={() => handleProceed(currentMood)}
              id="mood-keep-vibe-btn"
            >
              {isLoading ? '…' : '[ KEEP MY CURRENT VIBE ]'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}
