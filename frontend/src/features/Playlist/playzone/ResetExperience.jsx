import { useEffect, useMemo, useRef, useState } from 'react'
import { GameFrame, GameResult } from './gameShared'
import { formatClock, playableSongs } from './gameUtils'

const phases = [{ label: 'INHALE', duration: 4 }, { label: 'HOLD', duration: 2 }, { label: 'EXHALE', duration: 6 }, { label: 'REST', duration: 2 }]
export default function ResetExperience({ playlist, onPlayTrack, pausePlayback, resumePlayback, onExit, onReplay, onAnother, onRefresh }) {
  const tracks = useMemo(() => playableSongs(playlist), [playlist])
  const gentleTrack = useMemo(() => tracks.find((song) => /calm|soft|ambient|acoustic|relax|slow/i.test(`${song.genre || ''} ${song.mood || ''} ${(song.tags || []).join?.(' ') || song.tags || ''}`)) || tracks[0], [tracks])
  const [phase, setPhase] = useState('intro')
  const [elapsed, setElapsed] = useState(0)
  const elapsedRef = useRef(0)
  const [feeling, setFeeling] = useState('')
  const remaining = Math.max(0, 120 - elapsed)
  const position = elapsed % 14
  const breath = phases.find((item, index) => position >= phases.slice(0, index).reduce((sum, itemPhase) => sum + itemPhase.duration, 0) && position < phases.slice(0, index + 1).reduce((sum, itemPhase) => sum + itemPhase.duration, 0)) || phases[0]
  useEffect(() => {
    if (phase !== 'playing') return undefined
    const id = window.setInterval(() => {
      elapsedRef.current = Math.min(120, elapsedRef.current + 1)
      setElapsed(elapsedRef.current)
      if (elapsedRef.current >= 120) { setPhase('feeling'); pausePlayback() }
    }, 1000)
    return () => window.clearInterval(id)
  }, [phase, pausePlayback])
  useEffect(() => () => pausePlayback(), [pausePlayback])
  const begin = () => { elapsedRef.current = 0; setElapsed(0); setFeeling(''); setPhase('playing'); const index = playlist.findIndex((song) => song === gentleTrack || (song.id || song._id) === (gentleTrack.id || gentleTrack._id)); onPlayTrack(index) }
  const skipPhase = () => {
    const elapsedInCycle = position
    let phaseStart = 0
    const activeIndex = phases.findIndex((item) => {
      const containsCurrentTime = elapsedInCycle >= phaseStart && elapsedInCycle < phaseStart + item.duration
      phaseStart += item.duration
      return containsCurrentTime
    })
    const startOfPhase = phases.slice(0, activeIndex).reduce((sum, item) => sum + item.duration, 0)
    const remainder = phases[activeIndex].duration - (elapsedInCycle - startOfPhase)
    setElapsed((value) => Math.min(119, value + remainder))
  }
  if (tracks.length < 1) return <GameFrame title="2-MIN RESET" onExit={onExit}><div className="pz-empty-game"><h4>NO PLAYABLE TRACK AVAILABLE</h4><p>A playable song is needed for this reset.</p><button type="button" className="pz-primary" onClick={onRefresh}>REFRESH</button></div></GameFrame>
  if (phase === 'intro') return <GameFrame title="2-MIN RESET" onExit={onExit}><div className="pz-intro"><p>Two quiet minutes with a softer track.</p><p className="pz-muted">Breathe at your own pace. This is a music break, not medical care.</p><button type="button" className="pz-primary" onClick={begin}>BEGIN</button></div></GameFrame>
  if (phase === 'feeling') return <GameFrame title="2-MIN RESET" onExit={onExit}><div className="pz-intro"><span className="pz-game-kicker">RESET COMPLETE</span><h4>Take a second.</h4><p>How does the vibe feel now?</p><div className="pz-game-actions">{['BETTER', 'SAME', 'DIFFERENT'].map((choice) => <button type="button" className={feeling === choice ? 'pz-primary' : 'pz-secondary'} key={choice} onClick={() => { setFeeling(choice); setPhase('result') }}>{choice}</button>)}</div></div></GameFrame>
  if (phase === 'result') return <GameFrame title="2-MIN RESET" onExit={onExit}><GameResult title="RESET COMPLETE" score={feeling} detail="TWO QUIET MINUTES · ONE BREATH AT A TIME" message="Carry that pause with you." onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>
  const paused = phase === 'paused'
  const togglePause = () => { if (paused) { setPhase('playing'); resumePlayback() } else { setPhase('paused'); pausePlayback() } }
  return <GameFrame title="2-MIN RESET" onExit={onExit}><div className="pz-game-stats"><span>TIME LEFT <b>{formatClock(remaining)}</b></span><span>TRACK <b>{gentleTrack?.title || 'Your mix'}</b></span></div><div className={`pz-breathing-circle is-${breath.label.toLowerCase()}${paused ? ' is-paused' : ''}`}><span>{paused ? 'PAUSED' : breath.label}</span>{!paused && <small>{breath.duration} seconds</small>}</div><p className="pz-center pz-muted">{paused ? 'Resume when you’re ready.' : 'Let the circle set a gentle pace.'}</p><div className="pz-game-actions"><button type="button" className="pz-secondary" onClick={togglePause}>{paused ? 'RESUME' : 'PAUSE'}</button><button type="button" className="pz-secondary" onClick={skipPhase} disabled={paused}>SKIP PHASE</button><button type="button" className="pz-secondary" onClick={begin}>RESTART</button></div></GameFrame>
}
