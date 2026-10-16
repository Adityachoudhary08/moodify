import { useState, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import './navbar.scss'

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/discover', label: 'Discover' },
    { to: '/playlist', label: 'Play Zone' },
  ]

  return (
    <header className={`moodify-nav${scrolled ? ' is-scrolled' : ''}${menuOpen ? ' menu-open' : ''}`}>
      <div className="nav-inner">
        <Link to="/" className="nav-logo" aria-label="Moodify home">
          <span className="logo-mark">M</span>
          <span className="logo-text">MOODIFY</span>
        </Link>

        <nav className="nav-links" aria-label="Main navigation">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`nav-link${location.pathname === link.to ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="nav-actions">
          <Link to="/login" className="btn-signin">Log in</Link>
          <button
            type="button"
            className="btn-discover"
            onClick={() => navigate('/discover')}
            id="nav-discover-cta"
          >
            START FREE <span aria-hidden="true">→</span>
          </button>
        </div>

        <button
          type="button"
          className="nav-hamburger"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(o => !o)}
        >
          <span /><span /><span />
        </button>
      </div>

      {menuOpen && (
        <div className="nav-mobile-menu" role="dialog" aria-label="Mobile navigation">
          {navLinks.map(link => (
            <Link
              key={link.to}
              to={link.to}
              className={`mobile-link${location.pathname === link.to ? ' is-active' : ''}`}
              onClick={() => setMenuOpen(false)}
            >
              {link.label}
            </Link>
          ))}
          <button
            type="button"
            className="btn-discover"
            onClick={() => navigate('/discover')}
          >
            START FREE →
          </button>
        </div>
      )}
    </header>
  )
}
