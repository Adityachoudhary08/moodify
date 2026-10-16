import '../styles/music-preferences.scss'

function MusicPreferences({ region, providers, onRegionChange }) {
  const indianUnavailable = providers?.indian === 'failed' || providers?.indian === 'no-relevant-tracks'
  const internationalUnavailable = providers?.international === 'failed' || providers?.international === 'no-relevant-tracks'
  const mixLabel = region === 'International'
    ? 'International'
    : region === 'Indian'
      ? 'Indian'
      : indianUnavailable && providers?.international === 'available'
        ? 'Indian unavailable · International fallback'
        : indianUnavailable
          ? 'Indian matches unavailable'
          : internationalUnavailable
            ? 'Indian mix · international catalog unavailable'
            : 'Indian + International'

  const catalogOptions = [
    { value: 'Indian', label: 'Indian', emoji: '🇮🇳' },
    { value: 'Mix', label: 'Mix', emoji: '🎵' },
    { value: 'International', label: 'International', emoji: '🌎' },
  ]

  return (
    <div className="music-preferences">
      <div className="mix-summary">
        <span className="mix-eyebrow">YOUR MIX</span>
        <span className="mix-description">{mixLabel}</span>
      </div>
      <details className="mix-customize">
        <summary>Customize mix</summary>
        <label className="mix-control-label">
          Catalog emphasis
          <span className="catalog-switch" role="group" aria-label="Choose music catalog">
            {catalogOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                className={`catalog-option${region === option.value ? ' is-active' : ''}`}
                aria-pressed={region === option.value}
                onClick={() => onRegionChange(option.value)}
              >
                {option.label}
                <span className="catalog-emoji" aria-hidden="true">{option.emoji}</span>
              </button>
            ))}
          </span>
        </label>
      </details>
    </div>
  )
}

export default MusicPreferences
