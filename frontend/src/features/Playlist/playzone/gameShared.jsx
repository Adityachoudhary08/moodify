export function GameFrame({ title, onExit, children }) {
  return <section className="pz-game" aria-label={`${title} game`}>
    <div className="pz-game-top"><span className="pz-game-kicker">MOODIFY / PLAY ZONE</span><button type="button" className="pz-exit" onClick={onExit}>← PLAY ZONE</button></div>
    <h3 className="pz-game-title">{title}</h3>{children}
  </section>
}

export function GameResult({ title, score, detail, message, onReplay, onAnother, onExit }) {
  return <div className="pz-result" role="status">
    <span className="pz-game-kicker">SIDE QUEST COMPLETE</span><h4>{title}</h4>
    {score !== undefined && <strong className="pz-result-score">{score}</strong>}
    {detail && <p>{detail}</p>}<p className="pz-result-message">{message}</p>
    <div className="pz-game-actions"><button type="button" className="pz-primary" onClick={onReplay}>PLAY AGAIN</button><button type="button" className="pz-secondary" onClick={onAnother}>TRY ANOTHER</button><button type="button" className="pz-secondary" onClick={onExit}>BACK TO PLAY ZONE</button></div>
  </div>
}

export function NoPlayableTracks({ onExit, onRefresh, title = 'NO PLAYABLE TRACK AVAILABLE', message = 'Try another activity or refresh your playlist.' }) {
  return <div className="pz-empty-game"><h4>{title}</h4><p>{message}</p><div className="pz-game-actions"><button type="button" className="pz-primary" onClick={onRefresh}>REFRESH</button><button type="button" className="pz-secondary" onClick={onExit}>BACK TO PLAY ZONE</button></div></div>
}
