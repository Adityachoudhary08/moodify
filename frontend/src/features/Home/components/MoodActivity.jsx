import { useState } from 'react'
import '../styles/mood-activity.scss'

const activities = {
  Happy: [
    { emoji: '😊', label: 'Keep the good feeling going', title: 'Share your win', text: 'Send someone a quick message about one small thing that made you smile today.' },
    { emoji: '🎶', label: 'Give the good mood somewhere to go', title: 'Make a joy playlist', text: 'Add three songs that always make you want to move, sing, or smile.' },
    { emoji: '🌟', label: 'Save this feeling for later', title: 'Write a bright moment down', text: 'Capture one sentence about today that you will be glad to remember.' },
  ],
  Sad: [
    { emoji: '😢', label: 'A gentle lift for this moment', title: 'Try a tiny reset', text: 'Put on the music, stretch your shoulders, and tell one silly joke out loud.' },
    { emoji: '😄', label: 'Borrow a little lightness', title: 'Find your funniest meme', text: 'Send a meme to someone who gets your sense of humor, even if it only earns one laugh.' },
    { emoji: '☀️', label: 'Make the next minute softer', title: 'Change your surroundings', text: 'Open a window, get a glass of water, or move to a spot with a little more light.' },
  ],
  Depressed: [
    { emoji: '💛', label: 'You do not have to solve everything today', title: 'Take one kind next step', text: 'Drink some water, take one slow breath, and message someone you trust. Small steps still count.' },
    { emoji: '🌱', label: 'Tiny progress is still progress', title: 'Lower the bar', text: 'Choose one thing that would make the next ten minutes easier, and let that be enough for now.' },
    { emoji: '🤝', label: 'You deserve support', title: 'Reach out simply', text: 'Send “I am having a hard day. Can you check in with me?” to someone safe.' },
  ],
  Surprised: [
    { emoji: '😲', label: 'Turn the surprise into curiosity', title: 'Make a quick meme', text: 'Caption the last unexpected thing that happened with the most dramatic reaction you can imagine.' },
    { emoji: '🔎', label: 'Stay curious', title: 'Ask one new question', text: 'Write down one question about what surprised you, then see what you can learn.' },
    { emoji: '🌀', label: 'Let the moment settle', title: 'Pause before reacting', text: 'Take three breaths and name what happened, what you feel, and what you need next.' },
  ],
  Calm: [
    { emoji: '😌', label: 'Protect this quiet feeling', title: 'Take three slow breaths', text: 'Inhale for four counts, exhale for six, and notice three things that feel steady around you.' },
    { emoji: '🍃', label: 'Keep some space for yourself', title: 'Take a screen break', text: 'Put your phone down for five minutes and notice the sounds around you.' },
    { emoji: '📝', label: 'Use the stillness', title: 'Clear one small corner', text: 'Tidy one surface or write down one thought that has been taking up space.' },
  ],
}

const defaultActivities = [{
  emoji: '✨',
  label: 'Your next little activity',
  title: 'Let the mood lead',
  text: 'Detect your mood to get a music pairing and a small activity for the moment.',
}]

function MoodActivity({ mood, profile, onRecheck }) {
  const [activityIndex, setActivityIndex] = useState(0)
  const [isCompleted, setIsCompleted] = useState(false)
  const [feedback, setFeedback] = useState(null)
  const [isDone, setIsDone] = useState(false)
  const moodActivities = profile?.activities || activities[mood] || defaultActivities
  const activity = moodActivities[activityIndex % moodActivities.length]
  const emoji = profile?.emoji || activity.emoji
  const label = profile?.subtitle || activity.label

  const showNextActivity = () => {
    setActivityIndex((index) => index + 1)
    setIsCompleted(false)
    setFeedback(null)
  }

  return (
    <section className="mood-activity" aria-live="polite">
      <div className="activity-heading">
        <span className="activity-emoji" aria-hidden="true">{emoji}</span>
        <div>
          <p className="activity-kicker">MOODIFY / PLAY ZONE</p>
          <p className="activity-label">{label}</p>
        </div>
      </div>
      <h2>{activity.title}</h2>
      <p className="activity-text">{activity.text}</p>
      {(activity.duration || activity.difficulty) && (
        <p className="activity-meta">{activity.duration} · {activity.difficulty}</p>
      )}
      {!isCompleted && !isDone ? (
        <div className="activity-actions">
          <button type="button" onClick={() => setIsCompleted(true)}>I tried this</button>
          <button type="button" className="is-complete" onClick={() => setIsDone(true)}>I'm good now</button>
        </div>
      ) : isDone ? (
        <p className="activity-complete" role="status">That is enough for now. Be gentle with yourself.</p>
      ) : (
        <div className="activity-feedback">
          <p className="activity-complete" role="status">Character development unlocked.</p>
          <p className="feedback-question">How are you feeling now?</p>
          <div className="activity-actions">
            <button type="button" onClick={() => setFeedback('better')}>😊 Better</button>
            <button type="button" onClick={() => setFeedback('same')}>😐 Same</button>
            <button type="button" onClick={() => setFeedback('not-really')}>😔 Not really</button>
          </div>
          {feedback && (
            <div className="follow-up-actions">
              <p className="feedback-response">Thanks for checking in. Your answer is enough.</p>
              <button type="button" onClick={showNextActivity}>Try another idea</button>
              {onRecheck && <button type="button" onClick={onRecheck}>Did we fix the vibe?</button>}
              <button type="button" className="is-complete" onClick={() => setIsDone(true)}>I'm good now</button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default MoodActivity
