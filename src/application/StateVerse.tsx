import { useEffect, useMemo, useRef, useState } from 'react';
import { GitFork, Menu, X } from 'lucide-react';
import { AutomatonGraph } from '../components/visualizer/AutomatonGraph';
import { ASTView } from '../components/visualizer/ASTView';
import { simulateAutomaton } from '../engine/simulator';
import type { DFA } from '../engine/types';
import { exportElementAsSVG } from '../utils/exportUtils';
import { compilePattern } from './validation';
import { GameRoom } from './GameRoom';
import { ScoreRoom } from './ScoreRoom';
import { buildChase, defaultChase, metro } from './gameModels';
import { MachineGraph } from './MachineGraph';
import './viz.css';

const presets = ['(a|b)*abb','(0|(1(01*0)*1))*','b*(ab*ab*)*','(a|b)(a|b|0|1)*','a+b?c*','http(s)?://(a|b)+'];
const notes = [
  ['Shunting-yard parser','Insert concatenation (·), convert to postfix, and build the syntax tree. Repetition binds before concatenation, then alternation.'],
  ['Thompson construction','Join fragments with ε-transitions. For the core operators, each expanded syntax node adds at most two states.'],
  ['Subset construction','Each DFA state represents an ε-closed set of NFA states. Follow the input symbol, then take the ε-closure again.'],
  ['Hopcroft minimization','Split partitions using predecessor sets until states in each block agree on every future acceptance decision.'],
];
const stageNames = {nfa:'Thompson ε-NFA',dfa:'Subset DFA',minimal:'Hopcroft Min DFA'};
type Stage = keyof typeof stageNames;
const stages = Object.keys(stageNames) as Stage[];
const rooms = {compiler:'Automata compiler & visualizer', cricket:'Cricket Run Chase', metro:'Metro Ticket Challenge'};
type Room = keyof typeof rooms;

function save(text: string,name: string,type: string) {
  const url = URL.createObjectURL(new Blob([text],{type}));
  const link = document.createElement('a');
  link.href = url; link.download = name; link.click();
  setTimeout(() => URL.revokeObjectURL(url),1000);
}

function pythonModule(dfa: DFA) {
  const table: Record<string,Record<string,string>> = {};
  for (const t of dfa.transitions) {
    table[t.from] ??= {};
    const eq = dfa.equivClasses?.find(c => c.label === t.symbol);
    for (const ch of eq?.chars ?? [eq?.representative ?? t.symbol]) table[t.from][ch] = t.to;
  }
  return ['from fastapi import FastAPI','from pydantic import BaseModel','import json','',
    'app = FastAPI()',`TABLE = json.loads(${JSON.stringify(JSON.stringify(table))})`,
    `ACCEPT = ${JSON.stringify(dfa.acceptStates)}`,'','class Sample(BaseModel):','    text: str','',
    '@app.post("/match")','def match(sample: Sample):',`    state = ${JSON.stringify(dfa.startState)}`,
    '    for char in sample.text:', '        state = TABLE.get(state, {}).get(char)',
    '        if state is None:', '            break','    return {"accepted": state in ACCEPT}',''].join('\n');
}

export default function StateVerse() {
  const [room,setRoom] = useState<Room>('compiler');
  const [settings,setSettings] = useState(defaultChase);
  const chase = useMemo(() => buildChase(settings), [settings]);
  const [imported,setImported] = useState<ReturnType<typeof buildChase>>();
  const [modelName,setModelName] = useState('');
  const [drawer,setDrawer] = useState(false);
  const [showNotes,setShowNotes] = useState(true);
  const [pattern,setPattern] = useState(presets[0]);
  const [input,setInput] = useState('abb');
  const [stage,setStage] = useState<Stage>('dfa');
  const [view,setView] = useState<'graph'|'table'|'code'>('graph');
  const [trap,setTrap] = useState(false);
  const [layered,setLayered] = useState(true);
  const [index,setIndex] = useState(0);
  const [playing,setPlaying] = useState(false);
  const [speed,setSpeed] = useState(600);
  const [batch,setBatch] = useState(['abb','aabb','ab','']);
  const [draft,setDraft] = useState('');
  const exportRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const closeDrawer = () => {setDrawer(false); menuRef.current?.focus();};
  useEffect(() => {
    if (!drawer) return;
    const escape = (e: KeyboardEvent) => {if (e.key === 'Escape') closeDrawer();};
    window.addEventListener('keydown',escape);
    return () => window.removeEventListener('keydown',escape);
  },[drawer]);
  const compiled = useMemo(() => {
    try { return {data:compilePattern(pattern)}; }
    catch(e) {return {error:(e as Error).message};}
  },[pattern]);
  const data = imported ?? compiled.data;
  const labels = imported ? {nfa:'Score machine (NFA)',dfa:'Score DFA',minimal:'Hopcroft Min DFA'} : stageNames;
  const machine = data?.[stage];
  const exported = room === 'compiler' ? machine : room === 'metro' ? metro : chase.dfa;
  const exportName = room === 'compiler' ? stage : room;
  const trace = useMemo(() => machine && /^[\x00-\x7f]*$/.test(input) ? simulateAutomaton(machine,input) : undefined,[machine,input]);
  const end = (trace?.steps.length ?? 1)-1;
  const step = trace?.steps[Math.min(index,end)];
  useEffect(() => {
    if (!playing || room !== 'compiler') return;
    if (index >= end) {setPlaying(false);return;}
    const t = setTimeout(() => setIndex(i => i+1),speed);
    return () => clearTimeout(t);
  },[playing,room,index,end,speed]);
  function resetStep() {setIndex(0);setPlaying(false);}
  function choosePattern(value: string) {setImported(undefined);setPattern(value);resetStep();setRoom('compiler');setView('graph');}
  function selectStage(value: Stage) {setStage(value);setView('graph');resetStep();}
  function changeRoom(value: Room) {setRoom(value);setPlaying(false);closeDrawer();}
  function inspect(value: string, tape: string, fromChase = false) {
    choosePattern(value);setInput(tape);setStage('minimal');
    if (fromChase) {
      setImported(chase);
      setModelName(`Cricket · ${settings.target} runs in ${settings.balls} legal balls`);
    }
  }
  const matches = useMemo(() => batch.map(value => data && /^[\x00-\x7f]*$/.test(value) && simulateAutomaton(data.minimal,value).isAccepted),[batch,data]);
  const code = useMemo(() => data && view==='code' ? pythonModule(data.minimal) : '',[data,view]);

  return <div className="av"><header className="av-head">
    <button ref={menuRef} aria-label="Open navigation" aria-expanded={drawer} onClick={() => setDrawer(!drawer)}><Menu/></button>
    <GitFork className="brand-icon"/><div className="brand"><strong>StateVerse</strong><small>Interactive Theory of Computation Compiler, Visualizer &amp; Code Generator</small></div>
    <code className="pipeline-badge">REGEX → ε-NFA → DFA → HOPCROFT</code>
    <div className="row utilities"><select aria-label="Load preset regex" value="" onChange={e=>choosePattern(e.target.value)}>
      <option value="" disabled>Load preset regex…</option>{presets.map(p=><option key={p}>{p}</option>)}</select>
      <button disabled={!exported} onClick={()=>exportElementAsSVG(exportRef.current,'automata-'+exportName+'.svg')}>SVG</button>
      <button disabled={!exported} onClick={()=>save(JSON.stringify({pattern:room==='compiler' && !imported?pattern:undefined,automaton:exported},null,2),'automata-'+exportName+'.json','application/json')}>JSON</button>
      <button aria-expanded={showNotes && room==='compiler'} onClick={()=>{setShowNotes(room==='compiler' ? !showNotes : true);setRoom('compiler');}}>TOC Notes</button></div>
  </header>
  {drawer && <><button className="scrim" aria-label="Dismiss navigation" onClick={closeDrawer}/><nav className="drawer" aria-label="Application windows">
    <div className="row"><h2>Windows</h2><button autoFocus aria-label="Close navigation" onClick={closeDrawer}><X/></button></div>
    {(Object.keys(rooms) as Room[]).map(r=><button aria-current={room===r?'page':undefined} key={r} onClick={()=>changeRoom(r)}>{rooms[r]}</button>)}</nav></>}
  <main>{room === 'cricket' ? <ScoreRoom settings={settings} configure={setSettings} chase={chase} inspect={t=>inspect('',t,true)}/> : room === 'metro' ? <GameRoom inspect={inspect}/> : <>
    {showNotes && <section className="panel theory"><div className="section-title"><h2>TOC pipeline &amp; interview notes</h2><button onClick={()=>setShowNotes(false)}>Close ×</button></div>
      <div className="notes">{notes.map(([title,body])=><article key={title}><h3>{title}</h3><p>{body}</p></article>)}</div></section>}
    <div className="config"><section className="panel"><div className="section-title"><label htmlFor="regex">Regular expression compiler</label><b className={data?'pass':'fail'}>{data?'Compiled OK':'Syntax error'}</b></div>
      {imported && <p>{modelName} · Enter a regex below to switch models.</p>}
      <input id="regex" value={pattern} maxLength={256} spellCheck={false} onChange={e=>choosePattern(e.target.value)}/>
      {compiled.error && <p className="fail" role="alert">{compiled.error}</p>}
      <div className="row presets">{presets.map(p=><button key={p} onClick={()=>choosePattern(p)}>{p}</button>)}</div></section>
      <section className="panel"><h2>Compilation pipeline</h2><small>Alphabet Σ = {'{'}{data?.dfa.alphabet.join(', ')}{'}'}</small>
        <div className="metrics">{stages.map(s=><button key={s} aria-pressed={stage===s} onClick={()=>selectStage(s)}>{labels[s]}<strong>{data?.[s].states.length ?? '—'} states</strong>
        {s==='minimal' && data && <small>{Math.round(100*(1-data.minimal.states.length/data.dfa.states.length))}% reduction</small>}</button>)}</div></section></div>
    <div className="workspace"><section className="panel"><div className="row">
      {stages.map(s=><button key={s} aria-pressed={stage===s && view==='graph'} onClick={()=>selectStage(s)}>{labels[s]}</button>)}
      <button aria-pressed={view==='table'} onClick={()=>setView('table')}>Transition table &amp; AST</button>
      <button aria-pressed={view==='code'} onClick={()=>setView('code')}>Regex → Code / FastAPI</button></div>
      {!data || !machine ? <p>Correct the expression to inspect its machine.</p> : view==='graph' ? <>
        <div className="section-title graph-tools"><small>Start → · Accept ◎ · Active in gold</small><div className="row">
        <button aria-pressed={layered} onClick={()=>setLayered(!layered)}>{layered?'Layered DAG':'Grid layout'}</button>
        <button aria-pressed={trap} onClick={()=>setTrap(!trap)}>Trap (∅)</button></div></div>
        <AutomatonGraph key={pattern+stage+layered+trap} automaton={machine} activeStates={step?.activeStates ?? []} activeEdges={step?.activeEdges ?? []} showTrapState={trap} layered={layered}/>
      </> : view==='table' ? <><h3>{stageNames[stage]} transitions</h3><div className="scroll"><table><thead><tr><th>From</th><th>Symbol</th><th>To</th></tr></thead><tbody>
      {machine.transitions.map((t,i)=><tr key={i}><td>{t.from}</td><td>{t.symbol}</td><td>{t.to}</td></tr>)}</tbody></table></div>
      {data.ast && <><p>Postfix <code>{data.postfix.join(' ')}</code></p><ASTView ast={data.ast}/></>}</> :
      <><h3>FastAPI matcher</h3><p>Install fastapi and uvicorn. Save the module and run <code>uvicorn matcher:app</code>.</p>
      <button onClick={()=>save(code,'matcher.py','text/plain')}>Download matcher.py</button><pre>{code}</pre></>}
    </section><aside className="stack"><section className="panel"><div className="section-title"><h2>Step-by-step simulator</h2>
      {trace && <b className={trace.isAccepted?'pass':'fail'}>{trace.isAccepted?'ACCEPTED':'REJECTED'}</b>}</div>
      <label htmlFor="tape">Test input string (empty = ε)</label><input id="tape" value={input} maxLength={128} onChange={e=>{setInput(e.target.value);resetStep();}}/>
      {!trace && data && <p className="fail">Use ASCII input.</p>}
      <h3>Input tape head</h3><div className="tape-row">{['START',...input].map((c,i)=><code key={i} className={step?.stepIndex===i?'current':''}>{c===' '?'␣':c}</code>)}</div>
      <p aria-live="polite">Step {Math.min(index,end)} / {end} · {step?.description}</p><div className="row">
      <button onClick={resetStep}>Reset</button><button disabled={!index} onClick={()=>{setPlaying(false);setIndex(index-1);}}>Back</button>
      <button disabled={!end} onClick={()=>{if(index===end)setIndex(0);setPlaying(!playing);}}>{playing?'Pause':'Play'}</button>
      <button disabled={index>=end} onClick={()=>{setPlaying(false);setIndex(index+1);}}>Next</button></div>
      <label>Playback delay · {speed} ms<input type="range" min="100" max="1200" step="100" value={speed} onChange={e=>setSpeed(Number(e.target.value))}/></label>
    </section><section className="panel"><h2>Multi-string batch tester</h2>
      <form className="row" onSubmit={e=>{e.preventDefault();if(!batch.includes(draft))setBatch([...batch,draft]);setDraft('');}}>
      <input aria-label="Add test string" placeholder="Add test string…" maxLength={128} value={draft} onChange={e=>setDraft(e.target.value)}/><button>Add</button></form>
      <div className="batch">{batch.map((s,i)=><div className="row" key={s}><button disabled={!data} onClick={()=>{setInput(s);setIndex(0);setView('graph');setPlaying(true);}}>
      <code>{s || 'ε'}</code><b className={matches[i]?'pass':'fail'}>{!data?'—':matches[i]?'MATCH':'REJECT'}</b></button>
      <button aria-label={'Delete '+(s||'empty string')} onClick={()=>setBatch(batch.filter(v=>v!==s))}>×</button></div>)}</div>
    </section></aside></div>
  </>}</main>
  {exported && <div hidden ref={exportRef}><MachineGraph machine={exported} step={room==='compiler'?step:undefined} showTrap={room!=='compiler'||trap}/></div>}
  </div>;
}
