import '../styles/desired-mood.scss'

const desiredMoods = [
  { mood: 'happy', label: 'Happier', emoji: '😊' },
  { mood: 'energetic', label: 'Energetic', emoji: '⚡' },
  { mood: 'funky', label: 'Funky', emoji: '🕺' },
  { mood: 'relaxed', label: 'Chill', emoji: '😌' },
  { mood: 'romantic', label: 'Romantic', emoji: '❤️' },
  { mood: 'sad', label: 'Stay in my feels', emoji: '🌙' },
  { mood: 'surprise', label: 'Surprise me', emoji: '🎲' },
]

function DesiredMoodSelector({ currentMood, selectedMood, onSelect, onSubmit, onSkip }) {
  return (
    <section className="desired-mood-selector" aria-label="Choose your desired mood">
      <p className="desired-kicker">MOODIFY / NEXT VIBE</p>
      <h2>What are we upgrading this mood to?</h2>
      <p className="desired-current">Okay, you&apos;re feeling <strong>{currentMood}</strong>. But do you want to stay there?</p>
      <div className="desired-options">
        {desiredMoods.map(({ mood, label, emoji }) => (
          <button
            key={mood}
            type="button"
            className={selectedMood === mood ? 'is-selected' : ''}
            onClick={() => onSelect(mood)}
          >
            <span aria-hidden="true">{emoji}</span>
            {label}
          </button>
        ))}
      </div>
      <div className="desired-actions">
        <button type="button" className="desired-submit" disabled={!selectedMood} onClick={onSubmit}>
          Let&apos;s go
        </button>
        <button type="button" className="desired-skip" onClick={onSkip}>
          Just play for my current mood
        </button>
      </div>
    </section>
  )
}

export default DesiredMoodSelector
