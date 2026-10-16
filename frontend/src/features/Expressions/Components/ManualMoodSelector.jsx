import '../styles/manual-mood.scss'

const moods = [
  { mood: 'happy', label: 'Happy', emoji: '😊' },
  { mood: 'sad', label: 'Sad', emoji: '😔' },
  { mood: 'relaxed', label: 'Relaxed', emoji: '😌' },
  { mood: 'angry', label: 'Angry', emoji: '😤' },
  { mood: 'energetic', label: 'Energetic', emoji: '⚡' },
  { mood: 'neutral', label: 'Neutral', emoji: '😐' },
]

function ManualMoodSelector({ onSelect }) {
  return (
    <div className="manual-mood-selector">
      <p className="manual-mood-label">Prefer to choose yourself?</p>
      <div className="manual-mood-options">
        {moods.map(({ mood, label, emoji }) => (
          <button key={mood} type="button" onClick={() => onSelect(mood)}>
            <span aria-hidden="true">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ManualMoodSelector
