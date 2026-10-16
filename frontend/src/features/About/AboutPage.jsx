import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Navbar from '../shared/new/Navbar'
import './about.scss'

gsap.registerPlugin(ScrollTrigger)

export default function AboutPage() {
  const navigate = useNavigate()
  const pageRef = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo('.about-hero-text > *', { opacity: 0, y: 30 }, { opacity: 1, y: 0, stagger: 0.12, duration: 0.8, delay: 0.3 })
      gsap.fromTo('.about-section', { opacity: 0, y: 40 }, {
        opacity: 1, y: 0, stagger: 0.1, duration: 0.7,
        scrollTrigger: { trigger: '.about-sections', start: 'top 80%' }
      })
    }, pageRef)
    return () => ctx.revert()
  }, [])

  return (
    <div className="about-page" ref={pageRef}>
      <Navbar />
      <div className="about-inner">

        <div className="about-hero">
          <div className="about-hero-text">
            <p className="about-label">MOODIFY / ABOUT</p>
            <h1 className="about-heading">Music that knows how you feel.</h1>
            <p className="about-lead">
              Moodify is an interactive music + mood entertainment experience. We use expression detection to read your current emotional state, then build a personalized music journey — from where you are to where you want to be.
            </p>
            <button
              type="button"
              className="about-cta"
              onClick={() => navigate('/discover')}
              id="about-try-now"
            >
              Try Moodify Now →
            </button>
          </div>
        </div>

        <div className="about-sections">
          {[
            {
              emoji: '🎵',
              title: 'Music, not therapy.',
              body: "Moodify is entertainment, not medicine. We read your expression to personalize your playlist — nothing more. We don't diagnose, prescribe, or make any medical claims. It's music. It's for fun.",
            },
            {
              emoji: '🔒',
              title: 'Privacy, by design.',
              body: 'Your camera is used only for real-time expression analysis. No images are stored. No video is recorded. Detection happens locally in your browser using Google MediaPipe. We see nothing.',
            },
            {
              emoji: '🎭',
              title: 'Indian + International.',
              body: 'Moodify is built for Indian users first. Our playlists naturally include Hindi, Punjabi, Tamil, Telugu, Marathi, and more — alongside international tracks. You never have to pick a language.',
            },
            {
              emoji: '🎮',
              title: 'Play Zone.',
              body: 'Music is only half the experience. Moodify pairs every playlist with activities — from 30-second dance challenges to 2-minute resets. The Play Zone turns listening into doing.',
            },
          ].map(section => (
            <div key={section.title} className="about-section">
              <span className="about-section-emoji">{section.emoji}</span>
              <div>
                <h2 className="about-section-title">{section.title}</h2>
                <p className="about-section-body">{section.body}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="about-cta-block">
          <p className="about-cta-label">READY?</p>
          <h2 className="about-cta-heading">See what your vibe sounds like.</h2>
          <button
            type="button"
            className="about-cta-btn"
            onClick={() => navigate('/discover')}
            id="about-final-cta"
          >
            DISCOVER YOUR MOOD →
          </button>
        </div>

      </div>
    </div>
  )
}
