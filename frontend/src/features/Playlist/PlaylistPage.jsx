import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import gsap from 'gsap'
import { useMood } from '../shared/MoodContext.store'
import { useSong } from '../Home/hooks/useSong'
import Player from '../Home/components/Player'
import MusicPreferences from '../Home/components/MusicPreferences'
import Navbar from '../shared/new/Navbar'
import './playlist-page.scss'
import PlayZone from './playzone/PlayZone'

function PlaylistTrack({ song, index, isActive, onClick }) {
  return (
    <button
      type="button"
      className={`playlist-track${isActive ? ' is-playing' : ''}`}
      onClick={onClick}
      aria-label={`Play ${song.title} by ${song.artist || 'unknown artist'}`}
    >
      <span className="track-num">
        {isActive ? <span className="playing-bars"><i/><i/><i/></span> : index + 1}
      </span>
      {song.artwork || song.posterUrl ? (
        <img src={song.artwork || song.posterUrl} alt={song.title} className="track-art" />
      ) : (
        <div className="track-art track-art-placeholder">♫</div>
      )}
      <div className="track-info">
        <p className="track-title">{song.title}</p>
        <p className="track-artist">{song.artist || song.mood || '—'}</p>
      </div>
      {!isActive && <span className="track-hover-eq" aria-hidden="true"><i/><i/><i/></span>}
      {isActive && <span className="track-active-dot" aria-hidden="true" />}
    </button>
  )
}

export default function PlaylistPage() {
  const navigate = useNavigate()
  const { currentMood, desiredMood, beginRecheck } = useMood()
  const { playlist, currentSong, loading, songError, refreshPlaylist, playSongAtIndex, handleGetSong, region, setRegion, providers, pausePlayback, resumePlayback } = useSong()
  const pageRef = useRef()

  useEffect(() => {
    const ctx = gsap.context(() => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        gsap.set('.playlist-header-content > *, .player-panel, .play-zone-card', { clearProps: 'all' })
        return
      }
      gsap.fromTo('.playlist-header-content > *',
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, stagger: 0.08, duration: 0.6, delay: 0.2 }
      )
      gsap.fromTo('.player-panel',
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.7, delay: 0.4 }
      )
      gsap.fromTo('.play-zone-card',
        { opacity: 0, x: 20 },
        { opacity: 1, x: 0, stagger: 0.06, duration: 0.5, delay: 0.6 }
      )
    }, pageRef)
    return () => ctx.revert()
  }, [])

  const handleRecheck = () => {
    beginRecheck(currentMood)
    navigate('/detect')
  }

  const handleRegionChange = (nextRegion) => {
    setRegion(nextRegion)
    if (currentMood) handleGetSong({ mood: currentMood, desiredMood: desiredMood || currentMood, selectedRegion: nextRegion })
  }

  const targetMood = desiredMood || currentMood
  const hasTransition = Boolean(currentMood && targetMood && targetMood !== currentMood)
  const moodSubtitle = hasTransition
    ? 'Here’s your mood mix, moving toward your chosen vibe.'
    : ({ happy: 'Keep the good feeling going.', sad: 'Stay with the feeling; let the music meet you there.', energetic: 'Keep the momentum in the music.', calm: 'Let the sound find a slower pace.', relaxed: 'A softer soundtrack for right now.', romantic: 'A little more heart in the mix.' }[targetMood] || 'A mix for the vibe you are in.')

  return (
    <div className="playlist-page" ref={pageRef}>
      <Navbar />
      <div className="playlist-layout">

        {/* ── LEFT: Music Player ── */}
        <main className="music-side">
          <div className="playlist-header-content">
            <p className="playlist-kicker">MOODIFY / YOUR MOOD MIX</p>
            <div className={`mood-transition${hasTransition ? ' is-transitioning' : ''}`} aria-label={hasTransition ? `Current vibe ${currentMood}; moving toward ${targetMood}` : `Current vibe ${targetMood}`}>
              <span className="transition-mood">{currentMood || 'Your vibe'}</span>
              {hasTransition ? <span className="transition-line" aria-hidden="true"><i /></span> : null}
              {hasTransition
                ? <span className="transition-mood target">{targetMood}</span>
                : <span className="transition-keeping">Keeping the vibe going</span>}
            </div>
            <h1 className="playlist-title">{targetMood ? `${targetMood} Playlist` : 'Your Mood Mix'}</h1>
            <p className="playlist-subtitle">{moodSubtitle}</p>
          </div>

          {/* Player */}
          <div className="player-panel">
            <Player />
          </div>

          <div className="playlist-preferences">
            <MusicPreferences
              region={region}
              providers={providers}
              onRegionChange={handleRegionChange}
            />
          </div>

          {/* Track list */}
          <div className="tracks-section">
            <div className="tracks-header">
              <p className="tracks-label">
                {playlist.length > 0 ? `${playlist.length} ${playlist.length === 1 ? 'TRACK' : 'TRACKS'}` : 'YOUR PLAYLIST'}
              </p>
              <button
                type="button"
                className="btn-refresh"
                onClick={refreshPlaylist}
                disabled={loading}
                id="refresh-playlist-btn"
              >
                {loading ? 'Finding a different mix…' : 'Yeah... that wasn\'t it.'}
              </button>
            </div>

            {songError && playlist.length > 0 && (
              <p className="track-error">{songError}</p>
            )}

            {loading && playlist.length === 0 && (
              <div className="tracks-loading">
                {[0,1,2,3,4].map(i => <div key={i} className="track-skeleton" style={{ '--i': i }} />)}
              </div>
            )}

            {!loading && playlist.length === 0 && (
              <div className="tracks-empty">
                <p>No strong matches for this vibe yet.</p>
                {songError && <p className="tracks-empty-detail" role="status">{songError}</p>}
                <button type="button" className="btn-go-detect" onClick={songError ? refreshPlaylist : handleRecheck} disabled={loading}>
                  {songError ? 'TRY ANOTHER MIX →' : 'DID WE GET THE VIBE RIGHT? →'}
                </button>
              </div>
            )}

            <div className="tracks-list">
              {playlist.map((song, index) => {
                const songId = song.id || song._id
                const isActive = currentSong && (currentSong.id || currentSong._id) === songId
                return (
                  <PlaylistTrack
                    key={songId || `${song.title}-${index}`}
                    song={song}
                    index={index}
                    isActive={isActive}
                    onClick={() => playSongAtIndex(index)}
                  />
                )
              })}
            </div>
          </div>

        </main>

        <PlayZone playlist={playlist} currentSong={currentSong} currentMood={currentMood} desiredMood={desiredMood} onPlayTrack={playSongAtIndex} pausePlayback={pausePlayback} resumePlayback={resumePlayback} onRefresh={refreshPlaylist} />

        <section className="recheck-section" aria-labelledby="recheck-heading">
          <div>
            <p className="recheck-label" id="recheck-heading">DID WE GET THE VIBE?</p>
            <p className="recheck-copy">A fresh expression reading compares signals. The music doesn’t make the call.</p>
          </div>
          <button type="button" className="btn-recheck" onClick={handleRecheck} id="recheck-vibe-btn">
            LET'S SEE IF YOUR FACE AGREES →
          </button>
        </section>

      </div>
    </div>
  )
}
