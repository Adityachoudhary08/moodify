import { useRef, useEffect, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '../shared/new/Navbar'
import './landing.scss'

gsap.registerPlugin(ScrollTrigger)

const HERO_IMAGES = [
  '/hero-images/hero-1.jpg',
  '/hero-images/hero-2.jpg',
  '/hero-images/hero-3.jpg',
  '/hero-images/hero-4.jpg',
  '/hero-images/hero-5.jpg',
]

/**
 * Returns a different hero image index based on the current day of the year.
 * Each day the user visits, they see a different image.
 * Adding a small random salt on first load ensures variety even on same-day revisits.
 */
function getDailyImageIndex() {
  const now = new Date()
  const startOfYear = new Date(now.getFullYear(), 0, 0)
  const diff = now - startOfYear
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24))

  // Check sessionStorage for a session-specific offset so refreshes within same session stay consistent
  let sessionOffset = 0
  try {
    const stored = sessionStorage.getItem('moodify-hero-offset')
    if (stored !== null) {
      sessionOffset = parseInt(stored, 10)
    } else {
      // First visit in this session — add a random offset for variety
      sessionOffset = Math.floor(Math.random() * HERO_IMAGES.length)
      sessionStorage.setItem('moodify-hero-offset', String(sessionOffset))
    }
  } catch {
    sessionOffset = 0
  }

  return (dayOfYear + sessionOffset) % HERO_IMAGES.length
}

const moodVibes = [
  { label: 'HAPPY', color: '#e8a87c' },
  { label: 'SAD', color: '#6c7b95' },
  { label: 'ENERGETIC', color: '#d4a373' },
  { label: 'CHILL', color: '#a5b4a0' },
  { label: 'ROMANTIC', color: '#c98686' },
]

function MoodCard({ label, color, index }) {
  const ref = useRef()

  return (
    <div
      ref={ref}
      className="mood-card"
      style={{ '--mood-color': color, '--index': index }}
    >
      <span className="mood-label">{label}</span>
      <div className="mood-pulse" />
    </div>
  )
}

export default function LandingPage() {
  const navigate = useNavigate()
  const heroRef = useRef()
  const heroTextRef = useRef()
  const section2Ref = useRef()
  const section3Ref = useRef()
  const section4Ref = useRef()
  const section5Ref = useRef()

  const heroImageIndex = useMemo(() => getDailyImageIndex(), [])
  const [imageLoaded, setImageLoaded] = useState(false)

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.hero-kicker, .hero-title, .hero-tagline, .hero-cta-group, .hero-microcopy, .hero-image-wrap', { clearProps: 'all' })
        return
      }
      // Hero text entrance
      gsap.fromTo('.hero-kicker', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.3 })
      gsap.fromTo('.hero-title', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 1, delay: 0.55 })
      gsap.fromTo('.hero-tagline', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.8, delay: 0.8 })
      gsap.fromTo('.hero-cta-group', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.7, delay: 1.05 })
      gsap.fromTo('.hero-microcopy', { opacity: 0 }, { opacity: 1, duration: 0.6, delay: 1.4 })

      // Hero image entrance
      gsap.fromTo('.hero-image-wrap',
        { opacity: 0, scale: 1.05 },
        { opacity: 1, scale: 1, duration: 1.2, delay: 0.4, ease: 'power2.out' }
      )

      // Scroll-triggered sections
      gsap.fromTo('.section-2-inner > *',
        { opacity: 0, y: 40 },
        {
          opacity: 1, y: 0, stagger: 0.1, duration: 0.7,
          scrollTrigger: { trigger: section2Ref.current, start: 'top 80%' }
        }
      )

      gsap.fromTo('.section-3-inner > *',
        { opacity: 0, x: -30 },
        {
          opacity: 1, x: 0, stagger: 0.12, duration: 0.7,
          scrollTrigger: { trigger: section3Ref.current, start: 'top 80%' }
        }
      )

      gsap.fromTo('.feature-card',
        { opacity: 0, y: 50, scale: 0.95 },
        {
          opacity: 1, y: 0, scale: 1, stagger: 0.1, duration: 0.6,
          scrollTrigger: { trigger: section4Ref.current, start: 'top 80%' }
        }
      )

      gsap.fromTo('.section-5-inner',
        { opacity: 0, scale: 0.97 },
        {
          opacity: 1, scale: 1, duration: 0.8,
          scrollTrigger: { trigger: section5Ref.current, start: 'top 85%' }
        }
      )
    })

    return () => ctx.revert()
  }, [])

  return (
    <div className="landing-page">
      <Navbar />

      {/* ── SECTION 1: Hero ── */}
      <section className="hero-section" ref={heroRef} aria-label="Moodify hero">
        {/* Anime hero image on the right side */}
        <div className={`hero-image-wrap${imageLoaded ? ' is-loaded' : ''}`} aria-hidden="true">
          <img
            src={HERO_IMAGES[heroImageIndex]}
            alt=""
            className="hero-image"
            onLoad={() => setImageLoaded(true)}
            draggable={false}
          />
          <div className="hero-image-overlay" />
        </div>

        <div className="hero-content" ref={heroTextRef}>
          {/* <p className="hero-kicker">MOODIFY</p> */}
          <h1 className="hero-title">
            <span>Your <span className="accent-text">mood.</span></span>
            <span>Our <span className="accent-text">playlist.</span></span>
            <span>Let's see <span className="accent-text">who wins.</span></span>
          </h1>
          <p className="hero-tagline">
            Your mood called. We answered. Discover the perfect songs, curated
            automatically to match exactly how you feel.
          </p>
          <div className="hero-cta-group">
            <button
              type="button"
              className="cta-primary"
              onClick={() => navigate('/discover')}
              id="hero-discover-cta"
            >
              Let's find out ↗
            </button>
            <button
              type="button"
              className="cta-secondary"
              onClick={() => navigate('/playlist')}
              id="hero-explore-cta"
            >
              JUST EXPLORE
            </button>
          </div>
        </div>

        <div className="hero-scroll-hint" aria-hidden="true">
          <span>SCROLL</span>
          <div className="scroll-line" />
        </div>
        <p className="hero-microcopy">Because sometimes therapy is expensive and music is free.</p>
      </section>

      {/* ── SECTION 2: Mood Vibes ── */}
      <section className="landing-section section-2" ref={section2Ref} aria-label="Mood vibes">
        <div className="section-2-inner">
          <div className="section-label">YOUR FACE HAS ENTERED THE CHAT</div>
          <h2 className="section-heading">Every mood has a sound.</h2>
          <p className="section-sub">Moodify reads your expression and finds the perfect sonic match. Don't worry — we won't judge your face.</p>
          <div className="mood-cards-row">
            {moodVibes.map((v, i) => (
              <MoodCard key={v.label} {...v} index={i} />
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 3: Mood Mix Equation ── */}
      <section className="landing-section section-3" ref={section3Ref} aria-label="How mood mix works">
        <div className="section-3-inner">
          <div className="section-label">WHAT ARE WE UPGRADING THIS MOOD TO?</div>
          <h2 className="section-heading">Your mood. Your destination.</h2>
          <p className="section-sub">We don't just play what you feel — we play what you <em>want</em> to feel. Sad today? Understandable. Staying sad? Your choice.</p>
          <div className="mood-equation">
            <div className="eq-step">
              <span className="eq-text">CURRENT STATE</span>
              <span className="eq-mood-name">Down</span>
            </div>
            <div className="eq-plus">+</div>
            <div className="eq-step">
              <span className="eq-text">DESIRED STATE</span>
              <span className="eq-mood-name">Upbeat</span>
            </div>
            <div className="eq-equals">=</div>
            <div className="eq-result">
              <span className="eq-text">YOUR MIX</span>
              <span className="eq-mood-name">The Journey</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── SECTION 4: Features ── */}
      <section className="landing-section section-4" ref={section4Ref} aria-label="Moodify features">
        <div className="section-4-inner">
          <div className="section-label">MUSIC ISN'T ENOUGH? WE'VE GOT BACKUP.</div>
          <h2 className="section-heading">A full-on vibe experience.</h2>
          <div className="features-grid">
            {[
              { title: 'LISTEN', desc: 'These songs understood the assignment. Music curated to your exact headspace.' },
              { title: 'PLAY', desc: 'Two minutes. No emotional damage. Beat tap, memory games, and more.' },
              { title: 'MOVE', desc: 'Your next side quest. Quick activities to shake the mood loose.' },
              { title: 'RESET', desc: 'Let\'s distract you responsibly. Breathe, pause, recalibrate.' },
            ].map(f => (
              <div key={f.title} className="feature-card">
                <h3 className="feature-title">{f.title}</h3>
                <p className="feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SECTION 5: Final CTA ── */}
      <section className="landing-section section-5" ref={section5Ref} aria-label="Get started">
        <div className="section-5-inner">
          <p className="section-label">DID WE FIX THE VIBE?</p>
          <h2 className="section-heading final-heading">Bad day? Let's add better music.</h2>
          <p className="section-sub">No sign-up required. Just you, your mood, and the music.</p>
          <button
            type="button"
            className="cta-primary large"
            onClick={() => navigate('/discover')}
            id="final-discover-cta"
          >
            Let's find out ↗
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <span className="footer-logo">MOODIFY</span>
          <p className="footer-tagline">Your mood. Your music. Your moment.</p>
          <div className="footer-links">
            <a href="/discover">Discover</a>
            <a href="/playlist">Play Zone</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
