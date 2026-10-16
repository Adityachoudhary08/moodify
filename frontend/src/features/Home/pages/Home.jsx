import { lazy, Suspense, useLayoutEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import FaceExpression from '../../Expressions/Components/FaceExpression'
import Player from '../components/Player'
import Playlist from '../components/Playlist'
import MoodActivity from '../components/MoodActivity'
import ManualMoodSelector from '../../Expressions/Components/ManualMoodSelector'
import DesiredMoodSelector from '../../Expressions/Components/DesiredMoodSelector'
const MusicWorld = lazy(() => import('../components/MusicWorld'))
import MusicPreferences from '../components/MusicPreferences'
import '../styles/home.scss'
import { useSong } from '../hooks/useSong'

const Home = () => {
  const pageRef = useRef(null)
    const { handleGetSong, currentMood, currentProfile, region, setRegion, providers, loading } = useSong()
    const [hasDetectedMood, setHasDetectedMood] = useState(false)
    const [detectedMood, setDetectedMood] = useState(null)
    const [desiredMood, setDesiredMood] = useState(null)
    const [confidence, setConfidence] = useState(null)
  const [theme, setTheme] = useState('light')

    useLayoutEffect(() => {
      const cards = pageRef.current?.querySelectorAll('.expression-section, .results-heading, .songs-zone, .activity-zone')
      if (!cards?.length) return undefined

      const animation = gsap.fromTo(cards,
        { autoAlpha: 0, y: 24, rotateX: 5, z: -30 },
        { autoAlpha: 1, y: 0, rotateX: 0, z: 0, duration: 0.7, stagger: 0.08, ease: 'power3.out' }
      )

      return () => animation.kill()
    }, [hasDetectedMood])

    const handleMoodDetected = (detection) => {
      const mood = typeof detection === 'string' ? detection : detection.mood
      setConfidence(typeof detection === 'string' ? null : detection.confidence)
      setDetectedMood(mood)
      setDesiredMood(null)
    }

    const startMoodSession = (targetMood = desiredMood) => {
      setHasDetectedMood(true)
      return handleGetSong({ mood: detectedMood, desiredMood: targetMood || detectedMood })
    }

    const handleRecheck = () => {
      setHasDetectedMood(false)
      setDetectedMood(null)
      setDesiredMood(null)
      setConfidence(null)
    }

    const handleRegionChange = (nextRegion) => {
      setRegion(nextRegion)
      if (currentMood) handleGetSong({ mood: currentMood, desiredMood: desiredMood || currentMood, selectedRegion: nextRegion })
    }

  return (
    <div ref={pageRef} className={`home-container theme-${theme}`}>
      <div className="home-toolbar">
        <button
          type="button"
          className="theme-switcher"
          onClick={() => setTheme((currentTheme) => currentTheme === 'light' ? 'night' : 'light')}
          aria-label={`Switch to ${theme === 'light' ? 'night' : 'light'} theme`}
        >
          {theme === 'light' ? 'Night theme' : 'Light theme'}
        </button>
      </div>
      <div className={`home-content ${hasDetectedMood ? 'show-results' : 'show-camera'}`}>
        {!hasDetectedMood ? (
          <div className="expression-section">
            <Suspense fallback={<div className="music-world music-world-loading" aria-hidden="true" />}>
              <MusicWorld />
            </Suspense>
            <FaceExpression onClick={handleMoodDetected} />
            {detectedMood ? (
              <DesiredMoodSelector
                currentMood={detectedMood}
                selectedMood={desiredMood}
                onSelect={setDesiredMood}
                onSubmit={() => startMoodSession()}
                onSkip={() => startMoodSession(detectedMood)}
              />
            ) : (
              <>
                <ManualMoodSelector onSelect={handleMoodDetected} />
                <MusicPreferences region={region} providers={providers} onRegionChange={handleRegionChange} />
              </>
            )}
          </div>
        ) : (
          <section className="results-section" aria-live="polite">
            <div className="results-heading">
              <p className="results-kicker">MOODIFY / YOUR MOMENT</p>
              <h1>{loading ? 'Finding your sound' : (currentProfile?.title || `${currentMood} feels like this`)}</h1>
              <p>{loading ? "Finding songs that won&apos;t disappoint you." : (currentProfile?.subtitle || 'Your camera is off. Take your time with what comes next.')}</p>
              {desiredMood && <p className="confidence-note">Current vibe: {currentMood} → Next vibe: {desiredMood}</p>}
              {confidence && <p className="confidence-note">Current expression signal: {Math.round(confidence * 100)}% · not a diagnosis</p>}
              <MusicPreferences region={region} providers={providers} onRegionChange={handleRegionChange} />
            </div>
            <div className="results-grid">
              <div className="songs-zone">
                <Player />
                <Playlist />
              </div>
              <div className="activity-zone">
                <MoodActivity mood={currentMood} profile={currentProfile} onRecheck={handleRecheck} />
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}

export default Home
