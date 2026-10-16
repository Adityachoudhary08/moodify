import { useEffect, useMemo, useState } from 'react'
import GuessTheSong from './GuessTheSong'
import BeatTap from './BeatTap'
import QuickChallenge from './QuickChallenge'
import DanceChallenge from './DanceChallenge'
import MemoryMix from './MemoryMix'
import ResetExperience from './ResetExperience'
import './playzone.scss'

const ACTIVITIES = [
  { id: 'guess', title: 'GUESS THE SONG', desc: 'Hear eight seconds. Name the track.' },
  { id: 'beat', title: 'BEAT TAP', desc: 'Tap the rhythm and find your timing.' },
  { id: 'challenge', title: 'QUICK CHALLENGE', desc: 'Match the vibe in 60 seconds.' },
  { id: 'dance', title: '30-SEC DANCE', desc: 'One song. Thirty seconds. No judging.' },
  { id: 'memory', title: 'MEMORY MIX', desc: 'Match the songs hiding in your mix.' },
  { id: 'reset', title: '2-MIN RESET', desc: 'Slow down with a softer track.' },
]
const GAME_COMPONENTS = { guess: GuessTheSong, beat: BeatTap, challenge: QuickChallenge, dance: DanceChallenge, memory: MemoryMix, reset: ResetExperience }

export default function PlayZone({ playlist, currentSong, currentMood, desiredMood, onPlayTrack, pausePlayback, resumePlayback, onRefresh }) {
  const [active, setActive] = useState(null)
  const [run, setRun] = useState(0)
  const [surprise, setSurprise] = useState(null)
  const [countdown, setCountdown] = useState(3)
  const activities = useMemo(() => ACTIVITIES, [])
  useEffect(() => {
    if (!surprise) return undefined
    const id = window.setTimeout(() => {
      if (countdown <= 1) { setActive(surprise); setSurprise(null) }
      else setCountdown((value) => value - 1)
    }, 700)
    return () => window.clearTimeout(id)
  }, [surprise, countdown])
  const launch = (id) => { setSurprise(null); setActive(id); setRun((value) => value + 1) }
  const launchSurprise = () => {
    const choice = activities[Math.floor(Math.random() * activities.length)].id
    setActive(null); setCountdown(3); setSurprise(choice)
  }
  const exit = () => { pausePlayback(); setActive(null); setSurprise(null) }
  const replay = () => { pausePlayback(); setRun((value) => value + 1) }
  const another = () => {
    const choices = activities.filter((item) => item.id !== active)
    const choice = choices[Math.floor(Math.random() * choices.length)]
    pausePlayback(); setActive(choice.id); setRun((value) => value + 1)
  }
  const Game = active ? GAME_COMPONENTS[active] : null
  return <section className="play-zone-side" aria-labelledby="play-zone-title">
    <div className="play-zone-header"><p className="pz-kicker">MOODIFY / PLAY ZONE</p><h2 className="pz-heading" id="play-zone-title">Your next side quest.</h2><p className="pz-supporting">Music isn't enough? We've got backup.</p></div>
    <div className="play-zone-list" aria-label="Choose a side quest">
      {activities.map((activity, index) => <button type="button" className={`play-zone-card${active === activity.id ? ' is-active' : ''}`} key={activity.id} onClick={() => launch(activity.id)} aria-pressed={active === activity.id}><span className="pz-card-index">0{index + 1}</span><span className="pz-text"><span className="pz-title">{activity.title}</span><span className="pz-desc">{activity.desc}</span></span><span className="pz-launch-mark" aria-hidden="true">→</span></button>)}
      <button type="button" className="play-zone-card pz-surprise-card" onClick={launchSurprise}><span className="pz-card-index">07</span><span className="pz-text"><span className="pz-title">SURPRISE ME</span><span className="pz-desc">Let Moodify choose and launch a game.</span></span><span className="pz-launch-mark" aria-hidden="true">↗</span></button>
    </div>
    {surprise && <div className="pz-surprise-count" aria-live="assertive"><span>CHOOSING YOUR SIDE QUEST</span><strong>{countdown || 'GO'}</strong><small>{ACTIVITIES.find((item) => item.id === surprise)?.title}</small></div>}
    {Game && !surprise && <div key={`${active}-${run}`} className="pz-game-area"><Game playlist={playlist} currentSong={currentSong} currentMood={currentMood} desiredMood={desiredMood} onPlayTrack={onPlayTrack} pausePlayback={pausePlayback} resumePlayback={resumePlayback} onExit={exit} onReplay={replay} onAnother={another} onRefresh={onRefresh} /></div>}
    <p className="play-zone-note">Your playlist stays center stage. Side quests are optional. <a href="/login">Log in to save your mix.</a></p>
  </section>
}
