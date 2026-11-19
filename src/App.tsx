import { useEffect, useState } from 'react';
import { Activity, Bug, Fingerprint, Info, RotateCcw, ShieldCheck } from 'lucide-react';
import { BrowserClaims, Event, IdentityEngine, MemoryClaims, profiles } from './identity/engine';
import { analyzeModel } from './identity/formal';
import { ProtocolGraph } from './identity/ProtocolGraph';
import './idshield.css';

const sections = ['Identity Demo', 'Attack Lab', 'Model Verification', 'About'];
const icons = [Fingerprint, Bug, Activity, Info];
const authentication: Event[] = [
  { type: 'SELECT', value: 'DEMO-USER-001' },
  { type: 'CONSENT' },
  { type: 'REQUEST' },
  { type: 'VERIFY', value: 'DEMO-OTP-42' },
];
const scenarios: { name: string; note: string; events: Event[] }[] = [
  { name: 'OTP brute force', note: 'Three wrong OTP values exhaust the retry budget.', events: [...authentication.slice(0, 3), { type: 'VERIFY', value: 'WRONG' }, { type: 'VERIFY', value: 'WRONG' }, { type: 'VERIFY', value: 'WRONG' }] },
  { name: 'Access without verification', note: 'Protected access requires consent and identity verification.', events: [authentication[0], { type: 'ACCESS' }] },
  { name: 'Consumed OTP replay', note: 'A successfully consumed OTP cannot be reused.', events: [...authentication, { type: 'VERIFY', value: 'DEMO-OTP-42' }] },
  { name: 'Access after logout', note: 'Logout invalidates the active session.', events: [...authentication, { type: 'LOGOUT' }, { type: 'ACCESS' }] },
  { name: 'Duplicate application', note: 'The claim store rejects a second application for the same identity.', events: [...authentication, { type: 'ACCESS' }, { type: 'SUBMIT_APPLICATION', income: 120000, score: 86 }, { type: 'SUBMIT_APPLICATION', income: 120000, score: 86 }] },
];

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="id-card"><h3>{title}</h3>{children}</section>;
}

function Trace({ engine }: { engine: IdentityEngine }) {
  const last = engine.trace.at(-1);
  const negative = last && ['DENY', 'LOCK', 'REQUIRE_VERIFICATION'].includes(last.output);
  return <>
    <div className={`decision ${negative ? 'negative' : ''}`} role="status">
      <small>LATEST DECISION</small><h2>{last?.output ?? 'READY'}</h2>
      <p>{last?.rule ?? 'Select a fictional identity to begin.'}</p>
    </div>
    <div className="trace-list">{[...engine.trace].reverse().map(entry => <div key={entry.index}>
      <span className="id-mono">{String(entry.index).padStart(2, '0')} · {entry.symbol}</span>
      <b className={entry.output === 'ALLOW' ? 'good' : 'warn'}>{entry.output}</b>
      <p>{entry.from} → {entry.to}</p><small>{entry.rule}</small>
    </div>)}</div>
  </>;
}

export default function App() {
  const [page, setPage] = useState(0);
  const [revision, refresh] = useState(0);
  const [engine, setEngine] = useState(() => new IdentityEngine(new BrowserClaims()));
  const [identity, setIdentity] = useState(profiles[0].id);
  const [otp, setOtp] = useState('');
  const [income, setIncome] = useState('120000');
  const [score, setScore] = useState('86');
  const [scenario, setScenario] = useState(0);
  const [cursor, setCursor] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [modelText, setModelText] = useState('');
  const [message, setMessage] = useState('');
  const redraw = () => refresh(value => value + 1);
  const send = (event: Event) => { engine.dispatch(event); redraw(); };
  const reset = (attack = page === 1) => {
    setEngine(new IdentityEngine(attack ? new MemoryClaims() : new BrowserClaims()));
    setCursor(0); setPlaying(false); setOtp(''); setMessage('');
  };
  const navigate = (next: number) => {
    setPlaying(false);
    if (next === 1) { setEngine(new IdentityEngine(new MemoryClaims())); setCursor(0); }
    else if (page === 1) setEngine(new IdentityEngine(new BrowserClaims()));
    setPage(next); window.scrollTo({ top: 0 });
  };
  const step = () => {
    const event = scenarios[scenario].events[cursor];
    if (!event) return;
    send(event); setCursor(value => value + 1);
  };
  useEffect(() => {
    if (!playing) return;
    if (cursor >= scenarios[scenario].events.length) { setPlaying(false); return; }
    const timer = window.setTimeout(step, 850);
    return () => window.clearTimeout(timer);
  });

  let analysis: ReturnType<typeof analyzeModel> | undefined;
  let modelError = '';
  try { analysis = analyzeModel(modelText ? JSON.parse(modelText) : engine.model); }
  catch (error) { modelError = (error as Error).message; }
  const last = engine.trace.at(-1);
  let claims: ReturnType<BrowserClaims['all']> = [];
  let storageError = '';
  try { claims = engine.claims.all(); }
  catch (error) { storageError = (error as Error).message; }

  return <div className="id-app" data-revision={revision}>
    <aside className="id-sidebar">
      <div className="id-brand"><ShieldCheck/><div>IDShield<small>AUTOMATA SECURITY SIMULATOR</small></div></div>
      <div className="id-nav-label">PROJECT MODULES</div>
      <nav>{sections.map((section, index) => { const Icon = icons[index]; return <button key={section} className={page === index ? 'selected' : ''} onClick={() => navigate(index)}><Icon size={18}/>{section}{page === index && <span className="nav-dot"/>}</button>; })}</nav>
      <div className="sidebar-bottom"><span className="live-dot"/> Local simulation<small>Synthetic data only<br/>No external identity service</small></div>
    </aside>
    <div className="id-main">
      <header className="id-top"><span><b>IDSHIELD</b> / {sections[page]}</span><span className="id-badge">EDUCATIONAL MODE</span></header>
      <main className="id-content">
        <div className="demo-notice">Independent educational simulation. No real identities, OTPs, biometrics, or government APIs.</div>
        <div className="id-heading"><div><div className="eyebrow">FINITE AUTOMATA + IDENTITY SECURITY</div><h1>{sections[page]}</h1><p>{page === 0 ? 'Authenticate a fictional user and submit one protected application.' : page === 1 ? 'Replay common attacks and inspect every automaton decision.' : page === 2 ? 'Verify the finite model and generate a shortest unsafe trace.' : 'A focused Automata Theory project with one practical use case.'}</p></div>{page < 2 && <button className="id-button secondary" onClick={() => reset()}><RotateCcw size={15}/> Reset</button>}</div>

        {page === 0 && <>
          <div className="work-grid">
            <Panel title="01 / Authenticate">
              <label>Fictional identity<select value={identity} disabled={engine.state !== 'START'} onChange={event => setIdentity(event.target.value)}>{profiles.map(profile => <option key={profile.id} value={profile.id}>{profile.name} · {profile.id}</option>)}</select></label>
              <button className="id-button" onClick={() => send({ type: 'SELECT', value: identity })}>1. Select identity</button>
              <div className="consent-box"><b>Demo consent</b><p>Allow this simulator to verify the selected fictional profile.</p><button className="id-button secondary" onClick={() => send({ type: 'CONSENT' })}>2. Give consent</button></div>
              <button className="id-button secondary" onClick={() => send({ type: 'REQUEST' })}>3. Request mock OTP</button>
              {engine.otp && <p className="mock-token">Mock inbox: <b>{engine.otp.value}</b></p>}
              <label>Mock OTP<input value={otp} onChange={event => setOtp(event.target.value)} placeholder="DEMO-OTP-42"/></label>
              <button className="id-button" onClick={() => send({ type: 'VERIFY', value: otp })}>4. Verify OTP</button>
              <button className="id-button secondary" onClick={() => send({ type: 'ACCESS' })}>5. Open protected service</button>
            </Panel>
            <Panel title="02 / Finite-state protocol"><div className="machine-title"><span className="live-dot"/><b>{engine.state}</b><small>{engine.model.states.length} states · Mealy outputs</small></div><ProtocolGraph model={engine.model} state={engine.state} last={last}/></Panel>
            <Panel title="03 / Decision trace"><Trace engine={engine}/></Panel>
          </div>
          <Panel title="04 / Protected scholarship application">
            <p>Demo rule: income ≤ ₹250,000 and score ≥ 60; scores from 60–74 require review.</p>
            <div className="form-row"><label>Annual income (₹)<input type="number" min="0" value={income} onChange={event => setIncome(event.target.value)}/></label><label>Academic score (%)<input type="number" min="0" max="100" value={score} onChange={event => setScore(event.target.value)}/></label><button className="id-button" onClick={() => send({ type: 'SUBMIT_APPLICATION', income: Number(income), score: Number(score) })}>Submit application</button></div>
            {claims.length > 0 && <div className="table-wrap"><table><thead><tr><th>Identity</th><th>Status</th><th>Income</th><th>Score</th></tr></thead><tbody>{claims.map(claim => <tr key={`${claim.identity}-${claim.service}`}><td>{claim.identity}</td><td>{claim.status}</td><td>{claim.income}</td><td>{claim.score}</td></tr>)}</tbody></table></div>}
            <p className="warn">{message || storageError}</p>
          </Panel>
        </>}

        {page === 1 && <div className="two-col">
          <Panel title="01 / Choose an attack">
            <label>Scenario<select value={scenario} onChange={event => { setScenario(Number(event.target.value)); setEngine(new IdentityEngine(new MemoryClaims())); setCursor(0); setPlaying(false); }}>{scenarios.map((item, index) => <option key={item.name} value={index}>{item.name}</option>)}</select></label>
            <p>{scenarios[scenario].note}</p>
            <div className="button-row"><button className="id-button" onClick={() => setPlaying(value => !value)}>{playing ? 'Pause' : 'Play'}</button><button className="id-button secondary" disabled={cursor >= scenarios[scenario].events.length} onClick={step}>Step</button><button className="id-button secondary" onClick={() => reset(true)}>Replay</button></div>
            <p className="id-mono">Step {cursor} / {scenarios[scenario].events.length}</p>
            <ol className="scenario-list">{scenarios[scenario].events.map((event, index) => <li className={index === cursor ? 'good' : ''} key={`${event.type}-${index}`}>{event.type}</li>)}</ol>
          </Panel>
          <Panel title="02 / Why the attack fails"><Trace engine={engine}/></Panel>
        </div>}

        {page === 2 && <div className="two-col">
          <Panel title="01 / Finite-model safety check">
            <p>Safety property: accepting access requires prior consent, verified identity, and an active session.</p>
            <div className="button-row"><button className="id-button secondary" onClick={() => setModelText(JSON.stringify(engine.model, null, 2))}>Load safe model</button><button className="id-button" onClick={() => { const unsafe = structuredClone(engine.model); unsafe.edges = unsafe.edges.map(edge => edge.from === 'START' && edge.symbol === 'ACCESS' ? { ...edge, to: 'ACCESS', output: 'ALLOW' } : edge); setModelText(JSON.stringify(unsafe, null, 2)); }}>Inject access bypass</button></div>
            <label>Editable model JSON<textarea maxLength={80000} value={modelText} placeholder="The current safe model is used until you load or edit JSON." onChange={event => setModelText(event.target.value)}/></label><p className="warn">{modelError}</p>
          </Panel>
          <Panel title="02 / Verification result">{analysis && <div className={`decision ${analysis.counterexample ? 'negative' : ''}`}><h2>{analysis.counterexample ? 'VIOLATION FOUND' : 'MODEL IS SAFE'}</h2><p>{analysis.counterexample ? 'Breadth-first search found the shortest modeled attack trace.' : 'No violation exists in the declared finite state space.'}</p><pre>{analysis.counterexample?.join('\n') ?? 'No counterexample.'}</pre></div>}</Panel>
        </div>}

        {page === 3 && <div className="two-col">
          <Panel title="Project objective"><p>IDShield demonstrates how a finite-state machine enforces the order of consent, OTP verification, session creation, protected access, and application submission.</p><h3>Core contribution</h3><p>The same transition model drives the live demo, protocol graph, decision trace, attack scenarios, and exhaustive finite-model verification.</p></Panel>
          <Panel title="Scope and limitations"><ul><li>All identities, credentials, and applications are fictional.</li><li>Finite automata enforce protocol order; ordinary code checks clocks and stored claims.</li><li>Browser storage is a demonstration mechanism, not a secure backend.</li><li>Model verification proves only the declared finite abstraction.</li><li>The project does not connect to Aadhaar, banks, biometrics, or government services.</li></ul></Panel>
        </div>}
        <footer>IDShield · Automata-Based Identity Authentication and Access-Control Simulator<span>Focused educational edition</span></footer>
      </main>
    </div>
  </div>;
}
