import { useCallback, useState } from 'react'
import { GameFrame, GameResult } from './gameShared'
import { formatClock, useSecondTimer } from './gameUtils'

export default function QuickChallenge({ currentMood, desiredMood, playlist, onExit, onReplay, onAnother }) {
  const mood = (desiredMood || currentMood || 'your vibe').toUpperCase()
  const [phase, setPhase] = useState('intro')
  const [answers, setAnswers] = useState([])
  const [input, setInput] = useState('')
  const [error, setError] = useState('')
  const playlistTracks = (playlist || []).filter((song) => song?.title)
  const targetCount = playlistTracks.length ? Math.min(3, new Set(playlistTracks.map((song) => song.title.trim().toLowerCase())).size) : 3
  const finish = useCallback(() => setPhase('result'), [])
  const [seconds] = useSecondTimer(phase === 'playing' && answers.length < targetCount, 60, finish)
  const addAnswer = (event) => {
    event.preventDefault()
    const answer = input.trim().replace(/\s+/g, ' ')
    if (!answer) return
    const normalized = (value) => value.toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')
    const match = playlistTracks.find((song) => normalized(song.title) === normalized(answer))
    if (playlistTracks.length && !match) { setError('Use a track title from your current mix so the answer can be checked.'); return }
    const accepted = match?.title || answer
    if (answers.some((item) => normalized(item) === normalized(accepted))) { setError('That song is already on your list.'); return }
    const next = [...answers, accepted]
    setAnswers(next); setInput(''); setError('')
    if (next.length >= targetCount) setPhase('result')
  }
  if (phase === 'intro') return <GameFrame title="QUICK CHALLENGE" onExit={onExit}><div className="pz-intro"><p>Your mood: <strong>{mood}</strong></p><p>Name {targetCount} {targetCount === 1 ? 'song' : 'songs'} that match the vibe in 60 seconds.</p>{playlist?.length > 0 && <p className="pz-muted">Your current mix has {playlist.length} tracks for inspiration.</p>}<button type="button" className="pz-primary" onClick={() => setPhase('playing')}>START CHALLENGE</button></div></GameFrame>
  if (phase === 'result') return <GameFrame title="QUICK CHALLENGE" onExit={onExit}><GameResult title="QUICK CHALLENGE" score={`${answers.length} / ${targetCount}`} detail={`${answers.length === targetCount ? 'COMPLETE' : 'TIME'} · ${mood} MOOD`} message={answers.length === targetCount ? 'You understood the vibe.' : 'Good picks. Try another round when you’re ready.'} onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>
  return <GameFrame title="QUICK CHALLENGE" onExit={onExit}>
    <div className="pz-game-stats"><span>YOUR MOOD <b>{mood}</b></span><span>TIME LEFT <b>{formatClock(seconds)}</b></span><span>PROGRESS <b>{answers.length} / {targetCount}</b></span></div>
    <form className="pz-challenge-form" onSubmit={addAnswer}><label htmlFor="pz-song-answer">Name a song for this vibe</label><div><input id="pz-song-answer" value={input} onChange={(event) => { setInput(event.target.value); setError('') }} placeholder={playlistTracks.length ? 'Type a title from your mix…' : 'Type a song title…'} maxLength={100} autoComplete="off"/><button type="submit" className="pz-primary" disabled={!input.trim()}>ADD</button></div></form>
    {error && <p className="pz-feedback" role="alert">{error}</p>}
    <ol className="pz-answer-list">{answers.map((answer, index) => <li key={`${answer}-${index}`}><span>{answer}</span><button type="button" aria-label={`Remove ${answer}`} onClick={() => setAnswers((items) => items.filter((_, itemIndex) => itemIndex !== index))}>REMOVE</button></li>)}</ol>
    <p className="pz-muted">{playlistTracks.length ? 'Answers are checked against your playlist and duplicates are blocked.' : 'Duplicates are blocked. Playlist checks will appear when tracks are available.'} Your mood is the challenge prompt.</p>
  </GameFrame>
}
