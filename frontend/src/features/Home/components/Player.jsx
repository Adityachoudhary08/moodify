import React, { useState, useRef, useEffect } from 'react'
import { useSong } from '../hooks/useSong'
import '../../shared/styles/player.scss'

const Player = () => {
  const { currentSong, playNextSong, playPreviousSong, shouldAutoplay, setShouldAutoplay, pauseRequest, playRequest, restartRequest } = useSong()
  const audioRef = useRef(null)

  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [playbackRate, setPlaybackRate] = useState(1)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [playbackError, setPlaybackError] = useState('')
  const trackSource = currentSong?.streamUrl || currentSong?.url || ''

  useEffect(() => {
    if (pauseRequest > 0) audioRef.current?.pause()
  }, [pauseRequest])
  useEffect(() => {
    const audio = audioRef.current
    if (playRequest > 0 && audio) {
      audio.play().then(() => setPlaybackError('')).catch(() => {
        setIsPlaying(false)
        setPlaybackError('This track could not be played. Try the next one.')
      })
    }
  }, [playRequest])

  // Handle metadata loaded
  const handleLoadedMetadata = () => {
    setDuration(audioRef.current?.duration || 0)
    setCurrentTime(audioRef.current?.currentTime || 0)
    setPlaybackError('')
  }

  // Update current time
  const handleTimeUpdate = () => {
    setCurrentTime(audioRef.current?.currentTime || 0)
  }

  // Play/Pause toggle
  const togglePlayPause = () => {
    if (audioRef.current) {
      if (isPlaying && trackSource) {
        audioRef.current.pause()
      } else {
        audioRef.current.play()
          .then(() => setPlaybackError(''))
          .catch(() => {
            setIsPlaying(false)
            setPlaybackError('This track could not be played. Try the next one.')
          })
      }
    }
  }

  // Handle playback rate change
  const handleRateChange = (e) => {
    const rate = parseFloat(e.target.value)
    setPlaybackRate(rate)
    if (audioRef.current) {
      audioRef.current.playbackRate = rate
    }
  }

  // Handle volume change
  const handleVolumeChange = (e) => {
    const vol = parseFloat(e.target.value)
    setVolume(vol)
    if (audioRef.current) {
      audioRef.current.volume = vol
      setIsMuted(vol === 0)
    }
  }

  // Handle progress bar change
  const handleProgressChange = (e) => {
    const newTime = parseFloat(e.target.value)
    setCurrentTime(newTime)
    if (audioRef.current) {
      audioRef.current.currentTime = newTime
    }
  }

  const toggleMute = () => {
    const nextMuted = !isMuted
    setIsMuted(nextMuted)
    if (audioRef.current) audioRef.current.volume = nextMuted ? 0 : volume || 1
  }

  // Format time in MM:SS format
  const formatTime = (time) => {
    if (!time || isNaN(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`
  }

  // Update audio source when song changes
  useEffect(() => {
    const audio = audioRef.current
    if (!audio || !trackSource) return

    if (audio.getAttribute('src') !== trackSource) {
      audio.pause()
      audio.src = trackSource
      audio.load()
    }

    if (shouldAutoplay) {
      if (restartRequest > 0) {
        try { audio.currentTime = 0 } catch { /* Metadata may not be ready yet. */ }
      }
      audio.play()
        .then(() => setPlaybackError(''))
        .catch(() => {
          setIsPlaying(false)
          setPlaybackError('This track could not be played. Try the next one.')
        })
        .finally(() => setShouldAutoplay(false))
    }
  }, [trackSource, shouldAutoplay, restartRequest, setShouldAutoplay])

  return (
    <div className="player-container">
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onTimeUpdate={handleTimeUpdate}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false)
          playNextSong()
        }}
        onError={() => {
          setPlaybackError('This track could not be played. Skipping to the next one.')
          setIsPlaying(false)
          playNextSong()
        }}
      />

      {/* Song Info */}
      <div className="player-info">
        {(currentSong?.artwork || currentSong?.posterUrl) ? (
          <img src={currentSong.artwork || currentSong.posterUrl} alt={currentSong?.title} className="song-poster" />
        ) : <div className="song-poster song-poster-empty" aria-hidden="true">♫</div>}
        <div className="song-details">
          <h3 className="song-title">{currentSong?.title || 'No song selected'}</h3>
          <p className="song-artist">{currentSong?.artist || 'Now Playing'}</p>
          <div className={`player-waveform${isPlaying ? ' is-playing' : ''}`} aria-hidden="true">
            {Array.from({ length: 17 }, (_, index) => <i key={index} style={{ '--wave-height': `${4 + (index % 5) * 2}px` }} />)}
          </div>
          {playbackError && <p className="song-error" role="status">{playbackError}</p>}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-container">
        <div className="time-display">{formatTime(currentTime)}</div>
        <input
          type="range"
          min="0"
          max={duration}
          value={currentTime}
          onChange={handleProgressChange}
          className="progress-bar"
          aria-label="Track progress"
        />
        <div className="time-display">{formatTime(duration)}</div>
      </div>

      {/* Controls */}
      <div className="player-controls">
        {/* Left Controls */}
        <div className="controls-left">
          <button
            className="control-btn backward-btn"
            onClick={playPreviousSong}
            disabled={!currentSong}
            title="Previous song"
            aria-label="Previous song"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M6 6h2v12H6V6zm3.5 6l8.5 6V6z"/>
            </svg>
            <span className="skip-label">Prev</span>
          </button>

          <button
            className={`control-btn play-pause-btn ${isPlaying ? 'playing' : ''}`}
            onClick={togglePlayPause}
            disabled={!currentSong}
            title={isPlaying ? 'Pause' : 'Play'}
            aria-label={isPlaying ? 'Pause playback' : 'Start playback'}
          >
            {isPlaying ? (
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="32" height="32">
                <path fill="currentColor" d="M8 5v14l11-7z"/>
              </svg>
            )}
          </button>

          <button
            className="control-btn forward-btn"
            onClick={playNextSong}
            disabled={!currentSong}
            title="Next song"
            aria-label="Next song"
          >
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M16 18h2V6h-2v12zM2 12l8.5 6V6z"/>
            </svg>
            <span className="skip-label">Next</span>
          </button>
        </div>

        {/* Right Controls */}
        <div className="controls-right">
          {/* Speed Control */}
          <div className="control-group">
            <label htmlFor="speed-select" className="control-label">Speed</label>
            <select
              id="speed-select"
              value={playbackRate}
              onChange={handleRateChange}
              className="speed-select"
            >
              <option value="0.5">0.5x</option>
              <option value="0.75">0.75x</option>
              <option value="1">1x</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
              <option value="2">2x</option>
            </select>
          </div>

          {/* Volume Control */}
          <div className="control-group">
            <label htmlFor="volume-slider" className="control-label">
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path fill="currentColor" d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.26 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
              </svg>
            </label>
            <input
              id="volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="volume-slider"
              aria-label="Volume"
            />
            <button type="button" className="mute-btn" onClick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
              {isMuted ? 'Unmute' : 'Mute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Player
