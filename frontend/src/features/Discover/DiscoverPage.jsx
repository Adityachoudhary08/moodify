import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import Navbar from '../shared/new/Navbar'
import './discover.scss'



export default function DiscoverPage() {
  const navigate = useNavigate()
  const contentRef = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.discover-label, .discover-heading, .discover-sub, .discover-cta-wrap, .discover-steps', { clearProps: 'all' })
        return
      }
      gsap.fromTo('.discover-label', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.2 })
      gsap.fromTo('.discover-heading', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.9, delay: 0.4 })
      gsap.fromTo('.discover-sub', { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.65 })
      gsap.fromTo('.discover-cta-wrap', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 0.9 })
      gsap.fromTo('.discover-steps', { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.8, delay: 1.1 })
    }, contentRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="discover-page">
      <Navbar />

      <div className="discover-inner" ref={contentRef}>
        {/* Left: text */}
        <div className="discover-text">
          <p className="discover-label">MOODIFY / DISCOVER</p>
          <h1 className="discover-heading">Let's find out what's really going on.</h1>
          <p className="discover-sub">
            Don't worry. We won't judge your face. Just a quick scan to build a playlist that understands you better than your ex.
          </p>

          <div className="discover-cta-wrap">
            <button
              type="button"
              className="discover-cta"
              onClick={() => navigate('/detect')}
              id="discover-lets-find-out"
            >
              LET'S FIND OUT
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </button>
            <p className="discover-privacy">
              Camera used only for expression reading. No images stored.
            </p>
          </div>

          <div className="discover-steps" aria-label="Your Moodify journey">
            <p className="steps-label">YOUR MOODIFY JOURNEY</p>
            <ol className="journey-list">
              {['SCAN', 'READ', 'SHIFT', 'LISTEN'].map((step, index) => (
                <li key={step} className={index === 0 ? 'is-current' : ''}>
                  <span className="step-num">0{index + 1}</span>
                  <span className="journey-word">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Right: cheesy text area */}
        <div className="discover-cheesy-wrap">
          <div className="cheesy-card">
            <span className="cheesy-emoji">🎧</span>
            <p className="cheesy-text">"Your ex couldn't read the room. We can."</p>
          </div>
          <div className="cheesy-card">
            <span className="cheesy-emoji">🔮</span>
            <p className="cheesy-text">"Hold still. We're reading the vibe, not your mind."</p>
          </div>
          <div className="cheesy-card">
            <span className="cheesy-emoji">🔥</span>
            <p className="cheesy-text">"Bad day? Let's add better music."</p>
          </div>
        </div>
      </div>
    </div>
  )
}
