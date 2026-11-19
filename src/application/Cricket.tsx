import { innings, shots, type Shot } from './cricket';

export function Cricket({ balls, play, reset, replay }: {
  balls: Shot[]; play: (shot: Shot) => void; reset: () => void; replay: () => void;
}) {
  const { runs, won, finished } = innings(balls);
  return <section className="cricket-board lab-panel">
    <p>Cricket Run Chase</p><h1>Eight runs. Three balls.</h1>
    <p>Choose each ball’s outcome for your teammate. The innings ends when you reach eight runs or use all three balls.</p>
    <div className="scoreboard" aria-live="polite"><strong>{runs} / 8</strong><span>{3 - balls.length} balls left</span></div>
    <div className="ball-strip">{[0, 1, 2].map(i => <span key={i}>Ball {i+1}<b>{balls[i] ?? '—'}</b></span>)}</div>
    <div className="lab-row">{shots.map(shot => <button key={shot} disabled={finished} onClick={() => play(shot)}>{['Dot ball · 0','Single · 1'][shot] ?? 'Boundary · 4'}</button>)}</div>
    <p role="status">{finished ? won ? 'Target reached. You win!' : 'Innings over. Target missed.' : `${8-runs} runs needed.`}</p>
    <div className="lab-row"><button disabled={!balls.length} onClick={reset}>New innings</button><button disabled={!balls.length} onClick={replay}>Inspect this innings</button></div>
  </section>;
}
