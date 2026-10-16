import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { GameFrame, GameResult, NoPlayableTracks } from './gameShared'
import { playableSongs, useSecondTimer } from './gameUtils'

export default function DanceChallenge({ playlist, currentSong, onPlayTrack, pausePlayback, onExit, onReplay, onAnother, onRefresh }) {
  const tracks = useMemo(() => playableSongs(playlist), [playlist])
  const [phase, setPhase] = useState('intro')
  const [countdown, setCountdown] = useState(3)
  const [energy, setEnergy] = useState(0)
  const [cameraState, setCameraState] = useState('off')
  const [cameraError, setCameraError] = useState('')
  const streamRef = useRef(null)
  const videoRef = useRef(null)
  const mountedRef = useRef(true)
  const cameraRequestRef = useRef(false)
  const finish = useCallback(() => { setPhase('result'); pausePlayback(); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null }, [pausePlayback])
  const [seconds] = useSecondTimer(phase === 'playing', 30, finish)
  const start = (useCamera = false) => {
    if (!useCamera) { streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null; setCameraState('off') }
    const active = currentSong && (currentSong.streamUrl || currentSong.url) ? currentSong : tracks[0]
    const index = playlist.findIndex((song) => song === active || (song.id || song._id) === (active.id || active._id))
    setPhase('countdown'); setCountdown(3); setEnergy(0); onPlayTrack(Math.max(index, 0))
    if (useCamera && streamRef.current && videoRef.current) videoRef.current.srcObject = streamRef.current
  }
  const requestCamera = async () => {
    if (!navigator.mediaDevices?.getUserMedia) { setCameraError('Camera is unavailable here. No-camera mode is ready.'); return }
    cameraRequestRef.current = true
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      if (!mountedRef.current || !cameraRequestRef.current) { stream.getTracks().forEach((track) => track.stop()); return }
      streamRef.current = stream; cameraRequestRef.current = false; setCameraState('ready'); setCameraError('')
    } catch {
      cameraRequestRef.current = false
      if (mountedRef.current) { setCameraState('off'); setCameraError('Camera access was unavailable. No-camera mode is ready.') }
    }
  }
  useEffect(() => {
    if (phase !== 'countdown') return undefined
    if (countdown <= 0) { const id = window.setTimeout(() => setPhase('playing'), 450); return () => window.clearTimeout(id) }
    const id = window.setTimeout(() => setCountdown((value) => value - 1), 1000)
    return () => window.clearTimeout(id)
  }, [phase, countdown])
  useEffect(() => { if (cameraState === 'ready' && videoRef.current && streamRef.current) videoRef.current.srcObject = streamRef.current }, [cameraState, phase])
  useEffect(() => {
    mountedRef.current = true
    return () => { mountedRef.current = false; cameraRequestRef.current = false; pausePlayback(); streamRef.current?.getTracks().forEach((track) => track.stop()); streamRef.current = null }
  }, [pausePlayback])
  if (tracks.length < 1) return <GameFrame title="30-SEC DANCE" onExit={onExit}><NoPlayableTracks onExit={onExit} onRefresh={onRefresh} /></GameFrame>
  if (phase === 'intro') return <GameFrame title="30-SEC DANCE" onExit={onExit}><div className="pz-intro"><p>One song. Thirty seconds. No judging.</p><p className="pz-muted">Camera use is optional. Energy responds to your taps and movement.</p><div className="pz-game-actions"><button type="button" className="pz-primary" onClick={requestCamera}>USE CAMERA</button><button type="button" className="pz-secondary" onClick={() => start(false)}>NO CAMERA · LET’S GO</button></div>{cameraState === 'ready' && <><video ref={videoRef} className="pz-camera-preview" autoPlay muted playsInline aria-label="Optional camera preview"/><button type="button" className="pz-primary" onClick={() => start(true)}>START WITH CAMERA</button></>}{cameraError && <p className="pz-muted" role="status">{cameraError}</p>}</div></GameFrame>
  if (phase === 'result') return <GameFrame title="30-SEC DANCE" onExit={onExit}><GameResult title="30 SECONDS COMPLETE" score={`${'▰'.repeat(Math.min(5, Math.ceil(energy / 20)))}${'▱'.repeat(5 - Math.min(5, Math.ceil(energy / 20)))}`} detail={`ENERGY ${energy}% · ${currentSong?.title || tracks[0]?.title || 'YOUR MIX'}`} message="Okay, main character." onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>
  return <GameFrame title="30-SEC DANCE" onExit={onExit}>{phase === 'countdown' ? <div className="pz-dance-count" aria-live="assertive">{countdown || 'GO'}</div> : <><div className="pz-game-stats"><span>TIME LEFT <b>00:{String(seconds).padStart(2, '0')}</b></span><span>ENERGY <b>{energy}%</b></span></div><div className="pz-dance-wave" aria-hidden="true">{Array.from({ length: 24 }, (_, i) => <i key={i} style={{ '--bar': `${18 + ((i * 17 + energy * 2) % 68)}%` }} />)}</div><div className="pz-energy-track"><i style={{ width: `${energy}%` }} /></div><button type="button" className="pz-dance-tap" onPointerMove={(event) => { if (event.buttons) setEnergy((value) => Math.min(100, value + 1)) }} onClick={() => setEnergy((value) => Math.min(100, value + 5))}>MOVE WITH THE MUSIC</button><p className="pz-muted pz-center">Energy reflects your taps and movement here, not dance quality.</p>{cameraState === 'ready' && <video ref={videoRef} className="pz-camera-preview" autoPlay muted playsInline />}</>}</GameFrame>
}
