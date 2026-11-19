import { useEffect, useMemo, useState } from 'react';
import { Activity, GitCompareArrows, Play, RotateCcw, Trophy } from 'lucide-react';
import { buildChase, deliveries, limits, type ChaseSettings } from './gameModels';
import { replayInnings, scoreAt } from './chaseReplay';
import { ChaseDiagram } from './ChaseDiagram';
import './scoreRoom.css';

function Field({ tape }: { tape:string }) {
  const symbol = tape.at(-1);
  const end = symbol==='6'?'340 12':symbol==='4'?'322 39':symbol==='W'?'241 106':symbol==='1'?'225 56':'200 79';
  const flight = `M192 84 Q240 ${symbol==='6'?-36:16} ${end}`;
  return <svg className="cr-field" viewBox="0 0 380 152" role="img" aria-label={'Cricket pitch · '+(deliveries.find(d=>d.symbol===symbol)?.label ?? 'Ready')}>
    <defs><pattern id="grass" width="40" height="40" patternUnits="userSpaceOnUse" patternTransform="rotate(25)"><rect width="40" height="40" fill="#16483c"/><rect width="20" height="40" fill="#194f40"/></pattern></defs>
    <ellipse cx="190" cy="80" rx="162" ry="65" fill="url(#grass)" stroke="#45967b" strokeWidth="2"/>
    <ellipse cx="190" cy="80" rx="147" ry="55" fill="none" stroke="#8eb797" strokeDasharray="3 5"/>
    <ellipse cx="190" cy="80" rx="65" ry="26" fill="none" stroke="#76a88a" opacity=".6"/>
    <rect x="156" y="71" width="69" height="19" rx="2" fill="#bda06b"/>
    {[162,218].map(x=><g key={x}><path d={`M${x} 68v25`} stroke="#ece2c6"/><path d={`M${x} 75v8m3-8v8`} stroke="#532e1f" strokeWidth="2"/></g>)}
    {[[110,58],[146,112],[273,94],[248,46],[191,81]].map(([x,y])=><circle key={x} cx={x} cy={y} r="3.5" fill="#d6e9cd" stroke="#0b352b"/>)}
    {symbol && <g key={tape}><path d={flight} fill="none" stroke="#ffcc67" strokeDasharray="3 4"/><circle r="4.5" fill="#ffcf70"><animateMotion path={flight} dur=".5s" fill="freeze"/></circle></g>}
  </svg>;
}

export function ScoreRoom({settings,configure,chase,inspect}:{
  settings:ChaseSettings; configure:(s:ChaseSettings)=>void; chase:ReturnType<typeof buildChase>; inspect:(tape:string)=>void;
}) {
  const [target,setTarget]=useState(String(settings.target));
  const [balls,setBalls]=useState(String(settings.balls));
  const [tape,setTape]=useState('');
  const [queue,setQueue]=useState('');
  const [unused,setUnused]=useState('');
  const [full,setFull]=useState(false);
  const [a,setA]=useState(0), [b,setB]=useState(1), [cursor,setCursor]=useState(0);
  const machine=chase.dfa;
  const replay=useMemo(()=>replayInnings(machine,tape),[machine,tape]);
  const score=scoreAt(replay.state);
  const highest=settings.sixes===false?4:6;
  const attack=String(highest).repeat(settings.balls);
  const options=useMemo(()=>{
    const pairs = settings.target===8 && settings.balls===3 ?
      [['44','Two boundaries'],['404','Dot-ball recovery'],['044','Late finish'],['440','Early finish'],['411','Defended target']] :
      [[attack,'Boundary chase'],['0'+attack,'After a dot'],['0'.repeat(settings.balls),'Scoreless innings']];
    pairs.push(['W'.repeat(Math.max(1,settings.target-settings.balls*highest))+attack,'Wide-assisted chase']);
    return pairs.map(([input,name])=>({input,name,result:replayInnings(machine,input)}));
  },[machine,settings,attack,highest]);
  const comparisons=[options[a]??options[0],options[b]??options[1]];
  const maxStep=Math.max(...comparisons.map(o=>o.result.symbols.length));
  const at=Math.min(cursor,maxStep);
  function reset(sequence='') {setTape('');setUnused('');setQueue(sequence);}
  useEffect(()=>{
    if(!queue)return;
    if(replay.done){setUnused(queue);setQueue('');return;}
    const timer=setTimeout(()=>{setTape(t=>t+queue[0]);setQueue(queue.slice(1));},520);
    return ()=>clearTimeout(timer);
  },[replay.done,queue]);
  function apply(next:ChaseSettings){reset();configure(next);setA(0);setB(1);setCursor(0);setFull(false);}
  const status=replay.won?'Accepted':replay.done?'Rejected':'In play';
  return <section className="cr-room">
    <header className="cr-head"><div className="cr-title"><Trophy/><div><h1>Cricket Run Chase</h1><p>Reach {settings.target} runs in {settings.balls} legal balls.</p></div></div>
      <form onSubmit={e=>{e.preventDefault();apply({...settings,target:Number(target),balls:Number(balls)});}}>
        <label>Target runs<input type="number" required min="1" max={limits.target} value={target} onChange={e=>setTarget(e.target.value)}/></label>
        <label>Legal balls<input type="number" required min="1" max={limits.balls} value={balls} onChange={e=>setBalls(e.target.value)}/></label>
        <button>Start chase</button>
      </form>
    </header>
    <div className="cr-grid"><div className="cr-stack"><section className="cr-card">
      <div className="cr-heading"><h2>Match centre</h2><button onClick={()=>reset()}><RotateCcw size={14}/> Reset innings</button></div>
      <div className="cr-stats" aria-live="polite"><div><small>Runs scored</small><strong>{score.runs}<em> / {settings.target}</em></strong></div>
        <div><small>Balls bowled</small><strong>{score.balls}<em> / {settings.balls}</em></strong></div><div><small>Status</small><b className={replay.won?'win':replay.done?'loss':'live'}>{status}</b></div></div>
      <div className="cr-ground"><span>{tape ? deliveries.find(d=>d.symbol===tape.at(-1))?.label : 'Ready to bat'}</span><Field tape={tape}/></div>
      <div className="cr-heading"><h3>Play a delivery</h3><label title="Changing this rule starts a fresh innings"><input type="checkbox" checked={settings.sixes!==false} onChange={e=>apply({...settings,sixes:e.target.checked})}/> Enable sixes</label></div>
      <div className="cr-shots">{deliveries.filter(d=>machine.alphabet.includes(d.symbol)).map(d=><button key={d.symbol} disabled={replay.done||!!queue} onClick={()=>setTape(t=>t+d.symbol)} aria-label={d.label+' ['+d.symbol+']'}><strong>{d.symbol}</strong>{d.label}</button>)}</div>
      <p className="cr-hint" role="status">{replay.done ? replay.won?'Target reached. Innings complete.':'All legal balls used. Target missed.' : `${settings.target-score.runs} needed from ${settings.balls-score.balls} legal balls. Wide adds one run and uses zero balls.`}</p>
      <div className="cr-tape"><small>Input tape</small><code>ε{[...tape].map((s,i)=><span key={i}>{s}</span>)}</code><small>State {replay.state}</small></div>
      {unused && <p>{unused} unplayed after the innings ended.</p>}
    </section><section className="cr-card"><h2>Animated replays</h2><div className="cr-replays">{options.map(o=><button key={o.name} onClick={()=>reset(o.input)}><span><Play size={12}/><code>{o.input.length>7?o.input.slice(0,6)+'…':o.input}</code><b className={o.result.won?'win':'loss'}>{o.result.won?'Accept':'Reject'}</b></span><small>{o.name}</small></button>)}</div></section></div>
      <section className="cr-card cr-diagram"><div className="cr-heading"><h2><Activity size={18}/> Score-state diagram</h2><button onClick={()=>inspect(tape)}>Open in compiler</button></div>
        <p>Each column counts legal balls. Wides move within the same column.</p>
        <div className="cr-heading"><div className="cr-key"><span>● Active path</span><span>◎ Accept</span><span>○ Trap</span></div><label><input type="checkbox" checked={full} onChange={e=>setFull(e.target.checked)}/> All states</label></div>
        <ChaseDiagram machine={machine} replay={replay} full={full}/>
        <small>{full?'All reachable scores':'Played path and available next deliveries'} · (runs, balls)</small>
      </section></div>
    <section className="cr-card cr-comparator"><div className="cr-heading"><h2><GitCompareArrows size={18}/> Compare innings paths</h2>
      <label>Step {at} / {maxStep} <input type="range" aria-label="Comparison step" min={0} max={maxStep} value={at} onChange={e=>setCursor(Number(e.target.value))}/></label></div>
      <div className="cr-paths">{comparisons.map((o,i)=>{
        const pos=Math.min(at,o.result.symbols.length);
        return <article key={i}><div className="cr-heading"><label>Path {i?'B':'A'} <select value={i?b:a} onChange={e=>{(i?setB:setA)(Number(e.target.value));setCursor(0);}}>{options.map((opt,j)=><option value={j} key={opt.name}>{opt.name} · {opt.input}</option>)}</select></label>
        <b className={o.result.won?'win':'loss'}>{o.result.won?'Accept':'Reject'}</b></div>
        <div className="cr-states">{o.result.path.map((id,j)=><span key={j} className={j===pos?'now':j>pos?'future':''}>{j>0 && <small>+{o.result.symbols[j-1]} → </small>}<code>{id}</code></span>)}</div>
        {o.result.unused && <small>Unplayed suffix · {o.result.unused}</small>}</article>;
      })}</div>
    </section>
  </section>;
}
