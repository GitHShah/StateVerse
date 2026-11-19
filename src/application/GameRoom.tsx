import { useEffect, useState } from 'react';
import { Activity, ArrowLeftRight, Check, CircleAlert, CreditCard, DoorOpen, ListOrdered, LogIn, LogOut, RotateCcw, TrainFront } from 'lucide-react';
import { journey } from './gameModels';
import { MetroDiagram } from './MetroDiagram';
import './metro.css';

const actions = [
  {symbol:'I',name:'Tap-in',icon:LogIn},
  {symbol:'T',name:'Transfer',icon:ArrowLeftRight},
  {symbol:'O',name:'Tap-out',icon:LogOut},
];
const presets = [
  ['IO','Direct ride'],['ITTO','Two transfers'],['O','Exit before entry'],
  ['IIO','Double tap-in'],['IT','Incomplete ride'],
] as const;
const displays: Record<string,{title:string;detail:string}> = {
  q0:{title:'Ready to tap',detail:'Tap in at the origin gate to activate your ticket.'},
  q1:{title:'Ticket active',detail:'Transfer again or tap out to complete the journey.'},
  q2:{title:'Gate open',detail:'Journey accepted. Your ticket is valid for exit.'},
  q_dead:{title:'Gate alarm',detail:'Reset the reader to begin another journey.'},
};

export function GameRoom({ inspect }: { inspect:(pattern:string,input:string)=>void }) {
  const [input,setInput]=useState('');
  const [pending,setPending]=useState('');
  const [inspected,setInspected]=useState<number|null>(null);
  const trip=journey(input);
  const steps=trip.trace.steps;
  const latest=steps.length-1;
  const state=steps[latest].activeStates[0];
  const failed=trip.failure>=0;
  const busy=Boolean(pending)&&!failed;
  const index=inspected??latest;
  const selected=steps[index];
  const display=displays[state];
  const reachedLimit=input.length>=128;

  useEffect(()=>{
    if(!pending || failed) return;
    const timer=setTimeout(()=>{
      setInput(value=>value+pending[0]);
      setPending(pending.slice(1));
      setInspected(null);
    },520);
    return ()=>clearTimeout(timer);
  },[pending,failed]);
  function start(sequence='') {
    setInput(''); setInspected(null); setPending(sequence);
  }
  function tap(symbol:string) {
    setInput(value=>value+symbol); setInspected(null);
  }
  const InfoIcon=failed?CircleAlert:trip.trace.isAccepted?Check:CreditCard;
  return <section className="mt-room">
    <header className="mt-header"><div className="mt-brand"><TrainFront size={32}/><div><h1>Metro Ticket Challenge</h1><p>Tap in, change lines, and tap out.</p></div></div>
    <div className="mt-tools"><code>IT*O</code><button onClick={()=>start()}><RotateCcw size={16}/> Reset journey</button></div></header>
    <div className="mt-grid"><section className="mt-card mt-reader">
      <h2><CreditCard size={19}/> Fare gate</h2>
      <div className={'mt-platform mt-'+state}><div className="mt-console"><small>Ticket reader</small><code>{state}</code></div>
        <div className="mt-scene" role="img" aria-label={display.title}><div className="mt-pillar left"><i/><b/></div><div className="mt-lane"><DoorOpen size={25}/><strong>{display.title}</strong></div><div className="mt-pillar right"><i/><b/></div></div>
        <div className="mt-tape" aria-label="Journey tape"><small>Input</small><code>{input||'ε'}</code></div>
      </div>
      <h3>Ticket actions</h3><div className="mt-actions">{actions.map(({name,symbol,icon:Icon})=><button key={symbol} aria-label={name+' ['+symbol+']'} disabled={busy||failed||reachedLimit} onClick={()=>tap(symbol)}><Icon size={21}/><strong>{name}</strong><kbd>{symbol}</kbd></button>)}</div>
      <h3>Replay a journey</h3><div className="mt-presets">{presets.map(([tape,name])=><button key={tape} onClick={()=>start(tape)}><code>{tape}</code> {name}</button>)}</div>
      <div className={'mt-result mt-'+state} role="status"><InfoIcon size={21}/><div><strong>{failed?'Invalid transition':trip.trace.isAccepted?'Journey validated':state==='q1'?'Journey in progress':'Awaiting tap-in'}</strong><p>{trip.message||display.detail}</p>
      {failed&&pending&&<small>Unprocessed after alarm: {pending}</small>}{reachedLimit&&<small>Trace limit reached. Reset to start again.</small>}</div></div>
    </section><div className="mt-stack"><section className="mt-card">
      <div className="mt-heading"><h2><Activity size={18}/> Ticket-state diagram</h2><button onClick={()=>inspect('IT*O',input)}>Open in compiler</button></div>
      <div className="mt-canvas"><MetroDiagram state={selected.activeStates[0]} previous={steps[index-1]?.activeStates[0]} symbol={selected.symbol}/></div>
      <div className="mt-caption"><span>{inspected===null?'Live diagram':'Inspecting history'} · Step {index}</span>{inspected!==null&&<button onClick={()=>setInspected(null)}>Return to live</button>}</div>
    </section><section className="mt-card"><div className="mt-heading"><h2><ListOrdered size={18}/> Journey log</h2><small>Select a step to inspect it</small></div>
      <ol className="mt-log">{[...steps].reverse().map(step=>{
        const i=step.stepIndex, to=step.activeStates[0], from=steps[i-1]?.activeStates[0];
        const label=!i?'Passenger outside the network':to==='q_dead'?'Invalid '+(actions.find(a=>a.symbol===step.symbol)?.name.toLowerCase()??'action'):
          step.symbol==='I'?'Tapped in at origin':step.symbol==='T'?'Transferred between lines':'Tapped out at destination';
        return <li key={i}><button aria-pressed={index===i} onClick={()=>setInspected(i)}><span className="mt-count">{String(i).padStart(2,'0')}</span><span>{label}</span><code>{from?`${from} —${step.symbol}→ ${to}`:to}</code></button></li>;
      })}</ol>
    </section></div></div>
  </section>;
}
