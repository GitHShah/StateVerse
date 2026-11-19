import { useMemo, useRef, useState } from 'react';
import { ArrowUpRight, GitBranch, GraduationCap, ShieldCheck } from 'lucide-react';
import { simulateAutomaton } from '../engine/simulator';
import { exportElementAsPNG, exportElementAsSVG } from '../utils/exportUtils';
import { MachineGraph } from './MachineGraph';
import { compilePattern, fieldMachines, inputLimit, rules, validateField } from './validation';
import './scholarship.css';

const stages = [
  { id: 'nfa', title: 'ε-NFA', method: 'Thompson construction' },
  { id: 'dfa', title: 'DFA', method: 'ε-closure and subset construction' },
  { id: 'minimal', title: 'Minimized DFA', method: 'Partition refinement' },
] as const;

const customDefault = { regex: '(a|b)*abb', input: 'aabb' };
const emptyForm = Object.fromEntries(rules.map(rule => [rule.id, '']));

export default function ScholarshipLab() {
  const [page, setPage] = useState<'form' | 'lab'>('form');
  const [values, setValues] = useState(emptyForm);
  const [checked, setChecked] = useState(false);
  const [source, setSource] = useState<string>(rules[0].id);
  const [custom, setCustom] = useState(customDefault);
  const [stage, setStage] = useState<(typeof stages)[number]['id']>('minimal');
  const [stepIndex, setStepIndex] = useState(0);
  const [showTrap, setShowTrap] = useState(false);
  const graph = useRef<HTMLDivElement>(null);

  const selected = rules.find(rule => rule.id === source);
  const pattern = selected?.pattern ?? custom.regex;
  const input = selected ? values[selected.id] : custom.input;
  const compiled = useMemo(() => {
    try {
      return { machines: selected ? fieldMachines[selected.id] : compilePattern(pattern), error: '' };
    } catch (error) {
      return { machines: undefined, error: (error as Error).message };
    }
  }, [selected, pattern]);
  const machine = compiled.machines?.[stage];
  const trace = useMemo(() => {
    if (!machine) return {};
    try {
      return { result: simulateAutomaton(machine, input) };
    } catch (error) {
      return { error: (error as Error).message };
    }
  }, [machine, input]);
  const validation = useMemo(
    () => Object.fromEntries(rules.map(rule => [rule.id, validateField(fieldMachines[rule.id].minimal, values[rule.id])])),
    [values],
  );

  const results = trace.result;
  const step = results?.steps[stepIndex];
  const lastStep = (results?.steps.length ?? 1) - 1;
  const allAccepted = rules.every(rule => validation[rule.id].accepted);
  const fieldResult = selected ? validation[selected.id] : undefined;
  const stageInfo = stages.find(item => item.id === stage)!;

  function updateField(id: string, value: string) {
    setValues(previous => ({ ...previous, [id]: value }));
    setChecked(false);
    setStepIndex(0);
  }

  function inspect(id: string) {
    setSource(id);
    setStepIndex(0);
    setPage('lab');
    window.scrollTo({ top: 0 });
  }

  function downloadJson() {
    const blob = new Blob([JSON.stringify({ pattern, postfix: compiled.machines?.postfix, automaton: machine }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `idshield-${source}-${stage}.json`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return <div className="scholarship">
    <header className="lab-header">
      <div className="lab-brand"><ShieldCheck aria-hidden="true" /> <strong>IDShield Automata</strong></div>
      <nav aria-label="Main navigation">
        <button aria-current={page === 'form' ? 'page' : undefined} onClick={() => setPage('form')}>Scholarship form</button>
        <button aria-current={page === 'lab' ? 'page' : undefined} onClick={() => inspect(source)}>Automata visualizer</button>
      </nav>
    </header>
    <main>
      {page === 'form' ? <>
        <section className="lab-intro">
          <GraduationCap aria-hidden="true" />
          <h1>Scholarship application</h1>
          <p>Check fictional application values, then open any field’s automaton to see how it made its decision.</p>
        </section>
        <form className="lab-panel" noValidate onSubmit={event => { event.preventDefault(); setChecked(true); }}>
          <div className="lab-row lab-heading">
            <h2>Applicant details</h2>
            <button type="button" onClick={() => {
              setValues(Object.fromEntries(rules.map(rule => [rule.id, rule.example])));
              setStepIndex(0);
              setChecked(false);
            }}>Fill demo sample</button>
          </div>
          {rules.map(rule => {
            const result = validation[rule.id];
            const showResult = checked || Boolean(values[rule.id]);
            return <div className="lab-field" key={rule.id}>
              <div>
                <label htmlFor={rule.id}>{rule.label}</label>
                <p id={`${rule.id}-hint`}>{rule.hint}</p>
                <input id={rule.id} value={values[rule.id]} placeholder={rule.example} maxLength={inputLimit}
                  autoComplete="off" spellCheck={false} aria-invalid={showResult && !result.accepted}
                  aria-describedby={`${rule.id}-hint${showResult ? ` ${rule.id}-result` : ''}`}
                  onChange={event => updateField(rule.id, event.target.value)} />
                {showResult && <p id={`${rule.id}-result`} className={result.accepted ? 'lab-pass' : 'lab-fail'}>{result.message}</p>}
              </div>
              <button type="button" onClick={() => inspect(rule.id)} aria-label={`View automaton for ${rule.label}`}>
                View automaton <ArrowUpRight size={15} aria-hidden="true" />
              </button>
            </div>;
          })}
          <div className="lab-row lab-footer">
            <button className="lab-primary" type="submit">Check application</button>
            <button type="button" onClick={() => { setValues(emptyForm); setChecked(false); setStepIndex(0); }}>Clear form</button>
            {checked && <strong role="status" className={allAccepted ? 'lab-pass' : 'lab-fail'}>
              {allAccepted ? 'All five field formats accepted.' : 'Some fields need correction.'}
            </strong>}
          </div>
        </form>
        <p className="lab-note">Use sample data. The demo checks field formats only and does not submit an application.</p>
      </> : <>
        <section className="lab-intro">
          <GitBranch aria-hidden="true" />
          <h1>Automata visualizer</h1>
          <p>Follow a form rule from its regular expression to a machine that accepts or rejects your input.</p>
        </section>
        <section className="lab-panel lab-controls" aria-label="Pattern and test input">
          <div>
            <label htmlFor="rule">Pattern source</label>
            <select id="rule" value={source} onChange={event => inspect(event.target.value)}>
              {rules.map(rule => <option key={rule.id} value={rule.id}>{rule.label}</option>)}
              <option value="custom">Custom regex</option>
            </select>
          </div>
          <div>
            <label htmlFor="pattern">Regular expression</label>
            <input id="pattern" value={pattern} readOnly={Boolean(selected)} maxLength={256} spellCheck={false}
              onChange={event => { setCustom({ ...custom, regex: event.target.value }); setStepIndex(0); }} />
          </div>
          <div>
            <label htmlFor="test-input">{selected ? 'Form value' : 'Test string'}</label>
            <input id="test-input" value={input} maxLength={inputLimit} spellCheck={false}
              placeholder={selected?.example} onChange={event => {
                if (selected) updateField(selected.id, event.target.value);
                else { setCustom({ ...custom, input: event.target.value }); setStepIndex(0); }
              }} />
          </div>
          <div className="lab-row lab-wide">
            {selected && <>
              <button onClick={() => updateField(selected.id, selected.example)}>Use example</button>
              <button onClick={() => setPage('form')}>Back to application</button>
              {fieldResult && <span className={fieldResult.accepted ? 'lab-pass' : 'lab-fail'}>{fieldResult.message}</span>}
            </>}
            {!selected && <p>Whole-string matching. Supports ASCII literals, grouping, alternation, character classes, and quantifiers.</p>}
          </div>
          {compiled.machines && <div className="lab-wide"><strong>Postfix</strong><p className="lab-mono">{compiled.machines.postfix.join(' ')}</p></div>}
          {compiled.error && <p role="alert" className="lab-fail lab-wide">{compiled.error}</p>}
        </section>

        {machine && <section className="lab-panel lab-machine">
          <div className="lab-row lab-stage-buttons" aria-label="Conversion stage">
            {stages.map(item => <button key={item.id} aria-pressed={stage === item.id}
              onClick={() => { setStage(item.id); setStepIndex(0); }}>{item.title}</button>)}
          </div>
          <div className="lab-row lab-heading">
            <div><h2>{stageInfo.title}</h2><p>{stageInfo.method} · {machine.states.length} states · {machine.transitions.length} transitions</p></div>
            {machine.states.some(state => state.isTrap) && <label className="lab-checkbox">
              <input type="checkbox" checked={showTrap} onChange={event => setShowTrap(event.target.checked)} /> Show trap state
            </label>}
          </div>
          <div className="lab-diagram" ref={graph} tabIndex={0} aria-label="Scrollable automaton diagram">
            <MachineGraph machine={machine} step={step} showTrap={showTrap} />
          </div>
          <p className="lab-note">An incoming arrow marks the start state. A double circle marks an accepting state. Gold highlights the current step.</p>
          {trace.error && <p role="alert" className="lab-fail">{trace.error}</p>}
          {step && results && <section className="lab-trace" aria-label="String simulation">
            <div className="lab-row">
              <button disabled={stepIndex === 0} onClick={() => setStepIndex(0)}>Reset</button>
              <button disabled={stepIndex === 0} onClick={() => setStepIndex(stepIndex - 1)}>Previous</button>
              <button className="lab-primary" disabled={stepIndex === lastStep} onClick={() => setStepIndex(stepIndex + 1)}>Next symbol</button>
              <button disabled={stepIndex === lastStep} onClick={() => setStepIndex(lastStep)}>Run to end</button>
            </div>
            <p role="status">Step {stepIndex} of {lastStep} · {step.description}</p>
            {stepIndex === lastStep && <strong className={results.isAccepted ? 'lab-pass' : 'lab-fail'}>{results.isAccepted ? 'ACCEPT' : 'REJECT'}</strong>}
          </section>}
          <details>
            <summary>Transition table</summary>
            <p>Start <code>{machine.startState}</code> · Accepting <code>{machine.acceptStates.join(', ') || 'None'}</code></p>
            <div className="lab-table"><table>
              <thead><tr><th>From</th><th>Symbol</th><th>To</th></tr></thead>
              <tbody>{machine.transitions.map((edge, index) => <tr key={index}><td>{edge.from}</td><td>{edge.symbol === ' ' ? 'space' : edge.symbol}</td><td>{edge.to}</td></tr>)}</tbody>
            </table></div>
          </details>
          <div className="lab-row lab-footer">
            <button onClick={downloadJson}>Export JSON</button>
            <button onClick={() => exportElementAsSVG(graph.current, `idshield-${stage}.svg`)}>Export SVG</button>
            <button onClick={() => exportElementAsPNG(graph.current, `idshield-${stage}.png`)}>Export PNG</button>
          </div>
        </section>}
      </>}
    </main>
  </div>;
}
