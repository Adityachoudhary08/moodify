import { useEffect, useMemo, useRef, useState } from 'react'
import { GameFrame, GameResult, NoPlayableTracks } from './gameShared'
import { playableSongs, shuffle, songKey } from './gameUtils'

export default function GuessTheSong({ playlist, onPlayTrack, pausePlayback, onExit, onReplay, onAnother, onRefresh }) {
  const tracks = useMemo(() => playableSongs(playlist), [playlist])
  const rounds = useMemo(() => shuffle(tracks).slice(0, Math.min(5, tracks.length)), [tracks])
  const [started, setStarted] = useState(false)
  const [roundIndex, setRoundIndex] = useState(0)
  const [selected, setSelected] = useState('')
  const [feedback, setFeedback] = useState(null)
  const [score, setScore] = useState(0)
  const [correctCount, setCorrectCount] = useState(0)
  const [snippetDone, setSnippetDone] = useState(false)
  const snippetTimer = useRef(null)
  const current = rounds[roundIndex]
  const options = useMemo(() => current ? shuffle([current, ...shuffle(tracks.filter((song) => songKey(song) !== songKey(current))).slice(0, Math.min(3, tracks.length - 1))]) : [], [current, tracks])

  const playSnippet = (index) => {
    window.clearTimeout(snippetTimer.current)
    const song = rounds[index]
    if (!song) return
    setSnippetDone(false); setSelected(''); setFeedback(null)
    onPlayTrack(playlist.findIndex((candidate) => songKey(candidate) === songKey(song)))
    snippetTimer.current = window.setTimeout(() => { pausePlayback(); setSnippetDone(true) }, 8000)
  }
  useEffect(() => () => { window.clearTimeout(snippetTimer.current); pausePlayback() }, [pausePlayback])

  if (tracks.length < 2) return <GameFrame title="GUESS THE SONG" onExit={onExit}><NoPlayableTracks onExit={onExit} onRefresh={onRefresh} title={tracks.length ? 'NOT ENOUGH PLAYABLE TRACKS' : undefined} message={tracks.length ? 'Guess the Song needs at least two playable tracks in your current mix.' : undefined} /></GameFrame>
  if (!started) return <GameFrame title="GUESS THE SONG" onExit={onExit}><div className="pz-intro"><p>You've got eight seconds. Think you know the track?</p><p className="pz-muted">{rounds.length} rounds · songs from your current playlist</p><button type="button" className="pz-primary" onClick={() => { setStarted(true); playSnippet(0) }}>START GAME</button></div></GameFrame>
  if (roundIndex >= rounds.length) return <GameFrame title="GUESS THE SONG" onExit={onExit}><GameResult title="GUESS THE SONG" score={`${score} POINTS`} detail={`${correctCount} / ${rounds.length} correct`} message="You know your mix." onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>

  const submit = () => {
    if (!selected || feedback) return
    const isCorrect = selected === songKey(current)
    if (isCorrect) { setScore((value) => value + 100); setCorrectCount((value) => value + 1) }
    setFeedback(isCorrect ? 'CORRECT' : 'NOT QUITE')
  }
  const next = () => { const nextIndex = roundIndex + 1; setRoundIndex(nextIndex); nextIndex < rounds.length && playSnippet(nextIndex) }
  return <GameFrame title="GUESS THE SONG" onExit={onExit}>
    <div className="pz-game-stats"><span>ROUND <b>{roundIndex + 1} / {rounds.length}</b></span><span>SCORE <b>{score}</b></span></div>
    <div className="pz-snippet"><button type="button" className="pz-snippet-button" onClick={() => playSnippet(roundIndex)} aria-label="Replay eight second song snippet">{snippetDone ? '↻ REPLAY 8-SECOND CLIP' : '♫ PLAYING 8-SECOND CLIP'}</button><p>What song was that?</p></div>
    <div className="pz-answer-grid">{options.map((song) => <button type="button" key={songKey(song)} className={`pz-answer${selected === songKey(song) ? ' is-selected' : ''}`} onClick={() => setSelected(songKey(song))} disabled={!snippetDone || Boolean(feedback)}>{song.title || 'Untitled'} <small>{song.artist || ''}</small></button>)}</div>
    {feedback && <p className={`pz-feedback${feedback === 'CORRECT' ? ' is-correct' : ''}`}>{feedback}{feedback !== 'CORRECT' ? ` · ${current?.title || 'Track'}` : ' · +100'}</p>}
    <div className="pz-game-actions">{!feedback ? <button type="button" className="pz-primary" onClick={submit} disabled={!selected || !snippetDone}>SUBMIT ANSWER</button> : <button type="button" className="pz-primary" onClick={next}>{roundIndex + 1 === rounds.length ? 'SEE RESULT' : 'NEXT ROUND'}</button>}</div>
  </GameFrame>
}
