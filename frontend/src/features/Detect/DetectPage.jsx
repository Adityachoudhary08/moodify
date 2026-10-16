import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { detect, init } from '../Expressions/Utils/utils'
import { useMood } from '../shared/MoodContext.store'
import Navbar from '../shared/new/Navbar'
import './detect.scss'

const SCANNING_STEPS = [
  'Okay... we see you.',
  'Interesting. Your face has opinions.',
  'Yep. That\'s a vibe.',
]

const MOOD_EMOJIS = {
  happy: '😊',
  sad: '😔',
  surprised: '😲',
  neutral: '😐',
  energetic: '⚡',
  relaxed: '😌',
}

export default function DetectPage() {
  const navigate = useNavigate()
  const { setCurrentMood, setConfidence, previousMood, isRechecking } = useMood()

  const videoRef = useRef(null)
  const faceLandmarkerRef = useRef(null)
  const streamRef = useRef(null)
  const contentRef = useRef()
  const cameraRequestRef = useRef(0)

  const [cameraStatus, setCameraStatus] = useState('initializing') // initializing | ready | off | error
  const [expression, setExpression] = useState('')
  const [detectedMood, setDetectedMood] = useState(null)
  const [detectedConfidence, setDetectedConfidence] = useState(null)
  const [isScanning, setIsScanning] = useState(false)
  const [scanStep, setScanStep] = useState(0)
  const [showResult, setShowResult] = useState(false)

  // Camera init
  useEffect(() => {
    const videoElement = videoRef.current
    const cameraStreamRef = streamRef
    const requestId = ++cameraRequestRef.current
    let cancelled = false
    const startCamera = async () => {
      try {
        await init({ videoRef, faceLandmarkerRef, streamref: streamRef, isCancelled: () => cancelled || requestId !== cameraRequestRef.current })
        if (!cancelled && requestId === cameraRequestRef.current && cameraStreamRef.current) setCameraStatus('ready')
      } catch {
        if (!cancelled && requestId === cameraRequestRef.current) setCameraStatus('error')
      }
    }
    startCamera()

    return () => {
      cancelled = true
      cameraRequestRef.current += 1
      cameraStreamRef.current?.getTracks().forEach(t => t.stop())
      if (videoElement) videoElement.srcObject = null
      faceLandmarkerRef.current?.close?.()
      faceLandmarkerRef.current = null
    }
  }, [])

  // Page entrance
  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.detect-label, .detect-heading, .detect-sub, .detect-camera-card', { clearProps: 'all' })
        return
      }
      gsap.fromTo('.detect-label', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.2 })
      gsap.fromTo('.detect-heading', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.4 })
      gsap.fromTo('.detect-sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.6, delay: 0.6 })
      gsap.fromTo('.detect-camera-card', { opacity: 0, scale: 0.97, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.8, delay: 0.5, ease: 'power3.out' })
    }, contentRef)
    return () => ctx.revert()
  }, [])

  const stopCamera = () => {
    cameraRequestRef.current += 1
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    faceLandmarkerRef.current?.close?.()
    faceLandmarkerRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setCameraStatus('off')
  }

  const handleDetect = async () => {
    if (!videoRef.current || !faceLandmarkerRef.current) return
    setIsScanning(true)
    setShowResult(false)

    // Simulate scanning steps
    for (let i = 0; i < SCANNING_STEPS.length; i++) {
      setScanStep(i)
      await new Promise(r => setTimeout(r, 700))
    }

    const detection = detect({ setExpression, videoRef, faceLandmarkerRef })

    if (detection) {
      setDetectedMood(detection.mood)
      setDetectedConfidence(detection.confidence)
      setIsScanning(false)
      setShowResult(true)

      // Store in context
      setCurrentMood(detection.mood)
      setConfidence(detection.confidence)

      stopCamera()

      // Animate result reveal
      gsap.fromTo('.result-reveal', { opacity: 0, scale: 0.8, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.7, ease: 'back.out(1.4)' })
    } else {
      setIsScanning(false)
      setExpression('No face detected. Try moving closer to the camera.')
    }
  }

  const handleContinue = () => {
    navigate('/mood')
  }

  const handleRescan = () => {
    const requestId = ++cameraRequestRef.current
    setDetectedMood(null)
    setDetectedConfidence(null)
    setShowResult(false)
    setExpression('')
    setCameraStatus('initializing')
    const startCamera = async () => {
      try {
        await init({ videoRef, faceLandmarkerRef, streamref: streamRef, isCancelled: () => requestId !== cameraRequestRef.current })
        if (requestId === cameraRequestRef.current && streamRef.current) setCameraStatus('ready')
      } catch {
        if (requestId === cameraRequestRef.current) setCameraStatus('error')
      }
    }
    startCamera()
  }

  return (
    <div className="detect-page">
      <Navbar />
      <div className="detect-inner" ref={contentRef}>

        {/* Left column: text */}
        <div className="detect-text">
          <p className="detect-label">MOODIFY / READ THE ROOM</p>
          <h1 className="detect-heading">Your face has entered the chat.</h1>
          <p className="detect-sub">
            Hold still. We're reading the vibe, not your mind.
          </p>
          <p className="detect-privacy">
            Your camera is used only to understand your current expression.<br />
            No images or video are stored. Detection happens locally.
          </p>
        </div>

        {/* Right column: camera + result */}
        <div className="detect-camera-area">
          <div className="detect-camera-card">

            {/* Camera header */}
            <div className="camera-card-header">
              <span className={`camera-status-dot ${cameraStatus === 'ready' ? 'is-live' : ''} ${cameraStatus === 'error' || cameraStatus === 'off' ? 'is-off' : ''}`} />
              <span className="camera-status-text">
                {cameraStatus === 'initializing' && 'INITIALIZING…'}
                {cameraStatus === 'ready' && 'LIVE CAMERA'}
                {cameraStatus === 'off' && 'CAMERA OFF'}
                {cameraStatus === 'error' && 'CAMERA UNAVAILABLE'}
              </span>
            </div>

            {/* Video feed */}
            <div className="camera-video-wrap">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={cameraStatus === 'off' || cameraStatus === 'error' ? 'is-hidden' : ''}
              />
              {(cameraStatus === 'off' || cameraStatus === 'error') && (
                <div className="camera-offline-state">
                  <span className="offline-icon">📷</span>
                  <p>{cameraStatus === 'error' ? 'Camera unavailable' : 'Camera is off'}</p>
                </div>
              )}

              {/* Scanning overlay */}
              {isScanning && (
                <div className="scanning-overlay">
                  <div className="scan-line" />
                  <div className="scan-corners">
                    <span /><span /><span /><span />
                  </div>
                  <p className="scan-step-text">{SCANNING_STEPS[scanStep]}</p>
                </div>
              )}

              {/* Result overlay */}
              {showResult && detectedMood && (
                <div className="result-overlay result-reveal">
                  <div className="result-badge">
                    <span className="result-emoji" style={{ display: 'none' }}></span>
                    <p className="result-label">YOUR EXPRESSION JUST SNITCHED ON YOU:</p>
                    <p className="result-mood">{detectedMood.toUpperCase()}</p>
                    {isRechecking && previousMood && (
                      <p className="recheck-reading" role="status">
                        {previousMood === detectedMood
                          ? `Still feeling the ${detectedMood} vibe?`
                          : `Looks like the vibe changed: ${previousMood} → ${detectedMood}.`}
                      </p>
                    )}
                    {detectedConfidence && (
                      <p className="result-confidence">
                        Signal strength: {Math.round(detectedConfidence * 100)}% · not a diagnosis
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Status text */}
            {expression && !showResult && (
              <p className="expression-status-text">{expression}</p>
            )}

            {/* Actions */}
            <div className="camera-actions">
              {!showResult ? (
                <>
                  <button
                    type="button"
                    className="btn-detect"
                    onClick={handleDetect}
                    disabled={cameraStatus !== 'ready' || isScanning}
                    id="detect-mood-btn"
                  >
                    {isScanning
                      ? SCANNING_STEPS[scanStep]
                      : cameraStatus === 'initializing'
                      ? 'Starting camera…'
                      : cameraStatus === 'error' || cameraStatus === 'off'
                      ? 'Camera unavailable'
                      : 'DETECT MY MOOD'}
                  </button>
                  {cameraStatus === 'ready' && (
                    <button type="button" className="btn-camera-off" onClick={stopCamera}>
                      Turn camera off
                    </button>
                  )}
                </>
              ) : (
                <div className="result-actions">
                  <button
                    type="button"
                    className="btn-continue"
                    onClick={handleContinue}
                    id="continue-to-mood-btn"
                  >
                    NEXT: CHOOSE YOUR VIBE →
                  </button>
                  <button type="button" className="btn-rescan" onClick={handleRescan}>
                    ↺ Scan again
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Manual option */}
          <div className="manual-option">
            <p>Can't use camera?</p>
            <div className="manual-moods">
              {Object.entries(MOOD_EMOJIS).map(([mood, emoji]) => (
                <button
                  key={mood}
                  type="button"
                  className={`manual-mood-btn${detectedMood === mood ? ' is-selected' : ''}`}
                  onClick={() => {
                    setDetectedMood(mood)
                    setCurrentMood(mood)
                    setConfidence(0.8)
                    setShowResult(true)
                    stopCamera()
                  }}
                >
                  <span className="manual-mood-emoji" aria-hidden="true">{emoji}</span> {mood}
                </button>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
