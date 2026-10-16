import { useEffect, useMemo, useState } from 'react'
import { GameFrame, GameResult } from './gameShared'
import { formatClock, shuffle, songKey } from './gameUtils'

export default function MemoryMix({ playlist, onExit, onReplay, onAnother }) {
  const tracks = useMemo(() => [...new Map(playlist.map((song) => [songKey(song), song])).values()].slice(0, 4), [playlist])
  const [cards, setCards] = useState([])
  const [flipped, setFlipped] = useState([])
  const [matched, setMatched] = useState([])
  const [moves, setMoves] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [started, setStarted] = useState(false)
  const complete = started && matched.length === cards.length && cards.length > 0
  const initialize = () => { setCards(shuffle(tracks.flatMap((song) => [song, song]).map((song, index) => ({ cardId: `${songKey(song)}-${index}`, song })))); setFlipped([]); setMatched([]); setMoves(0); setSeconds(0); setStarted(true) }
  useEffect(() => { if (!started || complete) return undefined; const id = window.setInterval(() => setSeconds((value) => value + 1), 1000); return () => window.clearInterval(id) }, [started, complete])
  useEffect(() => {
    if (flipped.length !== 2) return undefined
    const [first, second] = flipped.map((id) => cards.find((card) => card.cardId === id))
    const match = first?.song && second?.song && songKey(first.song) === songKey(second.song)
    const id = window.setTimeout(() => { if (match) setMatched((items) => [...items, ...flipped]); setFlipped([]) }, match ? 450 : 850)
    return () => window.clearTimeout(id)
  }, [flipped, cards])
  const reveal = (card) => { if (!started || flipped.length >= 2 || flipped.includes(card.cardId) || matched.includes(card.cardId)) return; const next = [...flipped, card.cardId]; setFlipped(next); if (next.length === 2) setMoves((value) => value + 1) }
  if (tracks.length < 2) return <GameFrame title="MEMORY MIX" onExit={onExit}><div className="pz-empty-game"><h4>ADD MORE TRACKS TO YOUR MIX</h4><p>Memory Mix needs at least two different songs.</p><button type="button" className="pz-secondary" onClick={onExit}>BACK TO PLAY ZONE</button></div></GameFrame>
  if (complete) return <GameFrame title="MEMORY MIX" onExit={onExit}><GameResult title="MEMORY MIX" score={`${matched.length / 2} PAIRS`} detail={`${moves} MOVES · ${formatClock(seconds)}`} message="A good mix stays with you." onReplay={onReplay} onAnother={onAnother} onExit={onExit} /></GameFrame>
  if (!started) return <GameFrame title="MEMORY MIX" onExit={onExit}><div className="pz-intro"><p>Match the pairs hidden in your playlist artwork.</p><p className="pz-muted">{tracks.length} pairs · built from your current mix</p><button type="button" className="pz-primary" onClick={initialize}>START MATCHING</button></div></GameFrame>
  return <GameFrame title="MEMORY MIX" onExit={onExit}><div className="pz-game-stats"><span>MOVES <b>{moves}</b></span><span>TIME <b>{formatClock(seconds)}</b></span><span>PAIRS FOUND <b>{matched.length / 2} / {tracks.length}</b></span></div><div className="pz-memory-grid">{cards.map((card) => { const faceUp = flipped.includes(card.cardId) || matched.includes(card.cardId); const art = card.song.artwork || card.song.posterUrl; return <button type="button" key={card.cardId} className={`pz-memory-card${faceUp ? ' is-face-up' : ''}${matched.includes(card.cardId) ? ' is-matched' : ''}`} onClick={() => reveal(card)} aria-label={faceUp ? `${card.song.title} by ${card.song.artist || 'unknown artist'}` : 'Reveal a song card'} aria-pressed={faceUp}>{faceUp ? <>{art ? <img src={art} alt="" onError={(event) => { event.currentTarget.hidden = true }} /> : <span className="pz-card-note">♫</span>}<small>{card.song.title || 'Untitled'}</small></> : <span className="pz-card-mark">M</span>}</button> })}</div></GameFrame>
}
