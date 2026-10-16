import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameFrame, GameResult, NoPlayableTracks } from './gameShared'
import { playableSongs, shuffle, useSecondTimer } from './gameUtils'

export default function BeatTap({ playlist, onPlayTrack, pausePlayback, onExit, onReplay, onAnother, onRefresh }) {
  const tracks = useMemo(() => playableSongs(playlist), [playlist])
  const [phase, setPhase] = useState('intro')
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [hits, setHits] = useState({ PERFECT: 0, GREAT: 0, CLOSE: 0, MISS: 0 })
  const [lastHit, setLastHit] = useState('')
  const [beat, setBeat] = useState(0)
  const [songIndex, setSongIndex] = useState(0)
  const startRef = useRef(0)
  const usedBeatsRef = useRef(new Set())
  const missedBeatsRef = useRef(new Set())
  const beatTimes = useMemo(() => Array.from({ length: 29 }, (_, index) => 450 + index * 600), [])
  const finish = useCallback(() => { setPhase('result'); pausePlayback() }, [pausePlayback])
  const [seconds] = useSecondTimer(phase === 'playing', 18, finish)

  useEffect(() => {
    if (phase !== 'playing') return undefined
    const id = window.setInterval(() => {
      setBeat((value) => value + 1)
      const elapsed = performance.now() - startRef.current
      let newlyMissed = 0
      beatTimes.forEach((time, index) => {
        if (elapsed > time + 260 && !usedBeatsRef.current.has(index) && !missedBeatsRef.current.has(index)) {
          missedBeatsRef.current.add(index)
          newlyMissed += 1
        }
      })
      if (newlyMissed) setHits((value) => ({ ...value, MISS: value.MISS + newlyMissed }))
    }, 120)
    return () => window.clearInterval(id)
  }, [phase, beatTimes])
  const tap = useCallback(() => {
    const elapsed = performance.now() - startRef.current
    const available = beatTimes.map((time, index) => ({ time, index })).filter(({ index }) => !usedBeatsRef.current.has(index) && !missedBeatsRef.current.has(index))
    const nearestBeat = available.reduce((best, beatItem) => !best || Math.abs(beatItem.time - elapsed) < Math.abs(best.time - elapsed) ? beatItem : best, null)
    const nearest = nearestBeat?.index ?? -1
    const offset = nearest < 0 ? Infinity : Math.abs(beatTimes[nearest] - elapsed)
    const grade = offset <= 85 ? 'PERFECT' : offset <= 165 ? 'GREAT' : offset <= 260 ? 'CLOSE' : 'MISS'
    if (grade !== 'MISS') usedBeatsRef.current.add(nearest)
    setLastHit(grade)
    if (grade === 'MISS') { setCombo(0); return }
    const points = { PERFECT: 500, GREAT: 300, CLOSE: 100 }[grade]
    setHits((value) => ({ ...value, [grade]: value[grade] + 1 }))
    setScore((value) => value + points)
    setCombo((value) => { const next = value + 1; setBestCombo((best) => Math.max(best, next)); return next })
  }, [beatTimes])
  useEffect(() => {
    if (phase !== 'playing') return undefined
    const onKey = (event) => {
      if (event.code !== 'Space' || event.repeat) return
      if (event.target instanceof HTMLElement && event.target.closest('.pz-tap-target')) return
      event.preventDefault(); tap()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [phase, tap])
  useEffect(() => () => pausePlayback(), [pausePlayback])
  const start = () => {
    const chosen = shuffle(tracks)[0]
    const index = playlist.findIndex((song) => song === chosen || song.id === chosen.id || song._id === chosen._id)
    setSongIndex(index); startRef.current = performance.now(); usedBeatsRef.current = new Set(); missedBeatsRef.current = new Set(); setPhase('playing'); onPlayTrack(index)
  }
  if (tracks.length < 1) return <GameFrame title="BEAT TAP" onExit={onExit}><NoPlayableTracks onExit={onExit} onRefresh={onRefresh} /></GameFrame>
  if (phase === 'intro') return <GameFrame title="BEAT TAP" onExit={onExit}><div className="pz-intro"><p>Listen for the pulse, then tap close to each beat.</p><p className="pz-muted">A steady rhythm is timed over your playlist track. Press Space or tap the target.</p><button type="button" className="pz-primary" onClick={start}>START</button></div></GameFrame>
  if (phase === 'result') return <GameFrame title="BEAT TAP" onExit={onExit}><GameResult title="BEAT TAP" score={`${score.toLocaleString()} POINTS`} detail={`PERFECT × ${hits.PERFECT} · GREAT × ${hits.GREAT} · CLOSE × ${hits.CLOSE} · MISS × ${hits.MISS} · BEST COMBO × ${bestCombo}`} message="Nice rhythm." onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>
  const elapsedMs = phase === 'playing' ? beat * 120 : 0
  const expected = Math.max(1, beatTimes.filter((time) => time <= elapsedMs).length)
  const accuracy = Math.round(((hits.PERFECT + hits.GREAT + hits.CLOSE) / expected) * 100)
  return <GameFrame title="BEAT TAP" onExit={onExit}>
    <div className="pz-game-stats"><span>TIME <b>00:{String(seconds).padStart(2, '0')}</b></span><span>SCORE <b>{score.toLocaleString()}</b></span><span>COMBO <b>×{combo}</b></span><span>ACCURACY <b>{Math.min(100, accuracy)}%</b></span><span>TRACK <b>{playlist[songIndex]?.title || 'Your mix'}</b></span></div>
    <div className="pz-beat-meter" aria-label="Timed beat indicator"><i style={{ '--pulse': beat % 5 === 0 ? 1 : 0 }} /></div>
    <button type="button" className={`pz-tap-target${lastHit ? ' is-hit' : ''}`} onClick={tap}><span>{lastHit || 'TAP'}</span><small>Press Space</small></button>
    <p className="pz-muted pz-center">PERFECT ±85ms · GREAT ±165ms · CLOSE ±260ms</p>
  </GameFrame>
}
