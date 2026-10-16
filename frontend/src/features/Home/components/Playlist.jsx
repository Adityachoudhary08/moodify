import { useState } from 'react'
import { useSong } from '../hooks/useSong'
import '../styles/playlist.scss'

const Playlist = () => {
  const { playlist, currentSong, currentMood, currentProfile, language, region, songError, loading, refreshPlaylist, playSongAtIndex } = useSong()
  const [showWhy, setShowWhy] = useState(false)

  // Map mood to emoji
  const moodEmojis = {
    'Happy': '😊',
    'Sad': '😢',
    'Surprised': '😲',
    'Calm': '😐'
  }

  if (!playlist || playlist.length === 0) {
    return (
      <div className="playlist-container">
        <div className="playlist-header">
          <div className="mood-badge">
            <span className="mood-emoji">{currentMood ? moodEmojis[currentMood] || '🎵' : '🎵'}</span>
            <div className="mood-info">
              <h2>{currentMood ? currentMood + ' Playlist' : 'Your Mood Playlist'}</h2>
              <p className="song-count">No songs found</p>
            </div>
          </div>
        </div>
        <p className="no-songs">{songError || 'Detect your mood to generate a playlist!'}</p>
      </div>
    )
  }

  return (
    <div className="playlist-container">
      <div className="playlist-header">
        <div className="mood-badge">
          <span className="mood-emoji">{moodEmojis[currentMood] || '🎵'}</span>
          <div className="mood-info">
            <h2>{currentMood || 'Your'} Playlist</h2>
              <p className="song-count">{language} · {region} · {playlist.length} {playlist.length === 1 ? 'song' : 'songs'}</p>
          </div>
        </div>
        {playlist.length > 0 && (
          <div className="playlist-actions">
            <button type="button" onClick={refreshPlaylist} disabled={loading}>
              {loading ? 'Refreshing...' : 'Refresh playlist'}
            </button>
            <button type="button" onClick={() => setShowWhy((isVisible) => !isVisible)}>
              Why these songs?
            </button>
          </div>
        )}
        {showWhy && currentProfile?.playlistDescription && (
          <p className="playlist-reason">Mood: {currentMood} · Language: {language} · Catalog: {region}. {currentProfile.playlistDescription}</p>
        )}
      </div>

      <div className="playlist-list">
        {playlist && playlist.map((song, index) => {
          // Use _id if available, otherwise use title+index combo
          const songId = song.id || song._id;
          const songKey = songId || `${song.title}-${index}`;
          return (
            <div
              key={songKey}
              className={`playlist-item ${currentSong && (currentSong.id || currentSong._id) === songId ? 'active' : ''}`}
              onClick={() => playSongAtIndex(index)}
            >
              <div className="item-number">{index + 1}</div>
              {song.artwork || song.posterUrl ? (
                <img src={song.artwork || song.posterUrl} alt={song.title} className="item-poster" />
              ) : <div className="item-poster item-poster-placeholder" aria-hidden="true" />}
              <div className="item-info">
                <h4 className="item-title">{song.title}</h4>
                <p className="item-mood">{song.artist || song.mood || 'general'}</p>
              </div>
              {currentSong && (currentSong.id || currentSong._id) === songId && (
                <div className="now-playing">
                  <span>♫</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  )
}

export default Playlist
