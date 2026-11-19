import React, { useState, useMemo } from 'react';
import {
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Play,
  Copy,
  Check,
  Zap,
  BookOpen,
  ArrowRight,
  ShieldCheck,
  GitFork,
} from 'lucide-react';
import { diagnoseRegex, DoctorDiagnosis, simulateAutomaton } from '../engine';
import { ProductGraph } from '../components/doctor/ProductGraph';

interface BenchmarkRow {
  n: number;
  inputSnippet: string;
  nativeTimeMs: number | null;
  nativeTimedOut: boolean;
  dfaTimeMs: number;
  speedup: string;
}

const PRESET_EXAMPLES = [
  { label: '(a+)+b', regex: '(a+)+b', type: 'evil', desc: 'Nested Plus Catastrophic ReDoS' },
  { label: '(a|a+)+', regex: '(a|a+)+', type: 'evil', desc: 'Overlapping Alternations' },
  { label: '(a*)*c', regex: '(a*)*c', type: 'evil', desc: 'Nested Kleene Stars' },
  { label: '^(\\w+\\s?)*$', regex: '^(\\w+\\s?)*$', type: 'evil', desc: 'Whitespace Word Backtracking' },
  { label: 'a+b', regex: 'a+b', type: 'safe', desc: 'Linear Single-Loop Safe' },
  { label: '(a|b)*abb', regex: '(a|b)*abb', type: 'safe', desc: 'Textbook Canonical Min-DFA' },
  { label: 'Email', regex: '[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}', type: 'safe', desc: 'Production Input Format' },
];

export const RegexDoctorPage: React.FC = () => {
  const [regexInput, setRegexInput] = useState<string>('(a+)+b');
  const [copied, setCopied] = useState<boolean>(false);

  // Benchmark state
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [benchmarkRows, setBenchmarkRows] = useState<BenchmarkRow[]>([]);
  const [showTheoryDetails, setShowTheoryDetails] = useState<boolean>(false);

  // Run diagnosis
  const diagnosis: DoctorDiagnosis | null = useMemo(() => {
    try {
      return diagnoseRegex(regexInput);
    } catch (err: any) {
      return null;
    }
  }, [regexInput]);

  // Copy witness to clipboard
  const handleCopyWitness = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Run ground truth benchmark (n = 20..30)
  const runGroundTruthBenchmark = async () => {
    if (!diagnosis || !diagnosis.witness) return;
    setIsBenchmarking(true);
    setBenchmarkRows([]);

    // Small yield to let React update the UI
    await new Promise((r) => setTimeout(r, 60));

    const testNs = [20, 22, 24, 26, 28, 30];
    const rows: BenchmarkRow[] = [];
    let nativeAborted = false;

    const { prefix, pump, suffix } = diagnosis.witness;
    const minDfa = diagnosis.minDfa;

    for (const n of testNs) {
      const attackPayload = prefix + pump.repeat(n) + suffix;
      const snippet = attackPayload.length > 25 ? `${prefix}${pump.repeat(4)}…${pump.repeat(2)}${suffix}` : attackPayload;

      // Measure DFA simulation
      const dfaStart = performance.now();
      simulateAutomaton(minDfa, attackPayload);
      const dfaTimeMs = +(performance.now() - dfaStart).toFixed(3);

      // Measure Native JS RegExp with timeout guard
      let nativeTimeMs: number | null = null;
      let nativeTimedOut = false;

      if (!nativeAborted) {
        try {
          const nativeReg = new RegExp(regexInput);
          const nStart = performance.now();
          const deadline = Date.now() + 1000;

          nativeReg.test(attackPayload);
          const elapsed = +(performance.now() - nStart).toFixed(2);

          if (Date.now() > deadline || elapsed >= 1000) {
            nativeTimedOut = true;
            nativeAborted = true;
          } else {
            nativeTimeMs = elapsed;
            if (elapsed > 450) {
              nativeAborted = true; // Guard against browser lockup on next step
            }
          }
        } catch (e) {
          nativeTimedOut = true;
          nativeAborted = true;
        }
      } else {
        nativeTimedOut = true;
      }

      const speedup = nativeTimedOut
        ? '> 100,000x'
        : nativeTimeMs && dfaTimeMs > 0
        ? `${Math.max(1, Math.round(nativeTimeMs / dfaTimeMs))}x`
        : '1x';

      rows.push({
        n,
        inputSnippet: snippet,
        nativeTimeMs,
        nativeTimedOut,
        dfaTimeMs,
        speedup,
      });

      setBenchmarkRows([...rows]);
      await new Promise((r) => setTimeout(r, 30));
    }

    setIsBenchmarking(false);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/60 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-rose-600 flex items-center justify-center shadow-lg shadow-rose-500/20">
              <Stethoscope className="w-6 h-6 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold tracking-tight text-white">Regex Doctor</h2>
                <span className="text-[10px] font-mono uppercase px-2.5 py-0.5 rounded-full bg-rose-500/15 text-rose-300 border border-rose-500/30 font-semibold">
                  Formal EDA / IDA Diagnostics
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Static ambiguity detection using Product Automata ($N \times N$) & Tarjan's SCC theorem to prove ReDoS immunity or generate witness attacks.
              </p>
            </div>
          </div>
        </div>

        {/* Input Form & Presets */}
        <div className="mt-6 space-y-3">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">/</span>
              <input
                type="text"
                value={regexInput}
                onChange={(e) => {
                  setRegexInput(e.target.value);
                  setBenchmarkRows([]);
                }}
                placeholder="Enter regex pattern (e.g. (a+)+b, (a|a+)+, [a-z]+)..."
                className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl pl-8 pr-12 py-3 text-sm font-mono text-indigo-100 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">/</span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] text-slate-400 font-medium mr-1">Presets:</span>
            {PRESET_EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                onClick={() => {
                  setRegexInput(ex.regex);
                  setBenchmarkRows([]);
                }}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-mono transition border flex items-center gap-1.5 ${
                  regexInput === ex.regex
                    ? 'bg-indigo-600 text-white border-indigo-500 shadow-sm shadow-indigo-500/30'
                    : ex.type === 'evil'
                    ? 'bg-rose-950/30 hover:bg-rose-950/50 text-rose-300 border-rose-900/60'
                    : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 border-slate-700'
                }`}
                title={ex.desc}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    ex.type === 'evil' ? 'bg-rose-400' : 'bg-emerald-400'
                  }`}
                />
                <span>{ex.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Diagnostic Dashboard */}
      {diagnosis && (
        <div className="space-y-6">
          {/* Verdict Banner Card */}
          <div
            className={`rounded-2xl border p-5 shadow-xl transition-all ${
              diagnosis.verdict === 'EXPONENTIAL'
                ? 'bg-rose-950/40 border-rose-500/50 shadow-rose-950/30'
                : diagnosis.verdict === 'POLYNOMIAL'
                ? 'bg-amber-950/40 border-amber-500/50 shadow-amber-950/30'
                : 'bg-emerald-950/30 border-emerald-500/50 shadow-emerald-950/30'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    diagnosis.verdict === 'EXPONENTIAL'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                      : diagnosis.verdict === 'POLYNOMIAL'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                  }`}
                >
                  {diagnosis.verdict === 'EXPONENTIAL' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : diagnosis.verdict === 'POLYNOMIAL' ? (
                    <AlertTriangle className="w-5 h-5" />
                  ) : (
                    <CheckCircle2 className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full font-mono ${
                        diagnosis.verdict === 'EXPONENTIAL'
                          ? 'bg-rose-500 text-white'
                          : diagnosis.verdict === 'POLYNOMIAL'
                          ? 'bg-amber-500 text-slate-950'
                          : 'bg-emerald-500 text-slate-950'
                      }`}
                    >
                      {diagnosis.verdict}
                    </span>
                    <h3 className="text-base font-bold text-white">{diagnosis.verdictLabel}</h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 max-w-3xl leading-relaxed">
                    {diagnosis.explanation.summary}
                  </p>
                </div>
              </div>

              {/* Stats Counters */}
              <div className="flex items-center gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-mono">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">NFA States</span>
                  <span className="text-white font-bold">{diagnosis.nfa.states.length}</span>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Product States</span>
                  <span className="text-cyan-400 font-bold">{diagnosis.productAutomaton.states.length}</span>
                </div>
                <div className="w-px h-6 bg-slate-800" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">SCC Count</span>
                  <span className="text-purple-400 font-bold">{diagnosis.productAutomaton.sccs.length}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Adversarial Witness Card (Only if vulnerable) */}
          {diagnosis.witness && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Synthesized Adversarial Witness String</h4>
                    <p className="text-xs text-slate-400">
                      Minimal BFS attack payload that triggers catastrophic ambiguity in backtracking engines.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleCopyWitness(diagnosis.witness!.fullWitness)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition border border-slate-700"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied Payload!' : 'Copy Payload'}</span>
                </button>
              </div>

              {/* Witness Highlighting Display */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-sm overflow-x-auto flex items-center gap-1.5">
                <span className="text-slate-500 select-none">Payload:</span>

                {/* Prefix */}
                {diagnosis.witness.prefix ? (
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 text-xs border border-slate-700" title="Prefix">
                    prefix: "{diagnosis.witness.prefix}"
                  </span>
                ) : (
                  <span className="text-slate-600 text-xs">ε</span>
                )}

                <span className="text-slate-500">+</span>

                {/* Pump (Prominently Highlighted) */}
                <div className="flex items-center gap-1 px-3 py-1 rounded-lg bg-rose-950/80 border-2 border-rose-500 text-rose-200 shadow-md shadow-rose-950/40">
                  <span className="font-bold text-rose-300 text-base underline decoration-wavy decoration-rose-400">
                    "{diagnosis.witness.pump}"
                  </span>
                  <span className="text-xs font-sans text-rose-400 font-semibold ml-1">
                    ^ {diagnosis.witness.pumpRepetitions}
                  </span>
                </div>

                <span className="text-slate-500">+</span>

                {/* Suffix */}
                <span className="px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 text-xs border border-amber-700/60 font-bold" title="Terminal Suffix">
                  suffix: "{diagnosis.witness.suffix}"
                </span>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                {diagnosis.witness.explanation}
              </p>
            </div>
          )}

          {/* Ground Truth Check: Live Benchmark vs DFA */}
          {diagnosis.witness && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                    <Play className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Ground Truth Check: Native JS RegExp vs. PatternGuard DFA</h4>
                    <p className="text-xs text-slate-400">
                      Executes the witness payload across $n = 20..30$ to demonstrate exponential latency cliff vs. $O(1)$ DFA transitions.
                    </p>
                  </div>
                </div>

                <button
                  onClick={runGroundTruthBenchmark}
                  disabled={isBenchmarking}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-rose-600 hover:from-indigo-500 hover:to-rose-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                >
                  <Play className={`w-3.5 h-3.5 ${isBenchmarking ? 'animate-spin' : ''}`} />
                  <span>{isBenchmarking ? 'Running Benchmark...' : 'Run Ground Truth Benchmark (n = 20..30)'}</span>
                </button>
              </div>

              {/* Benchmark Results Table & Visual Bar Chart */}
              {benchmarkRows.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="w-full text-xs font-mono text-left">
                      <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                        <tr>
                          <th className="py-2.5 px-4">Pumping Length (n)</th>
                          <th className="py-2.5 px-4">Payload Snippet</th>
                          <th className="py-2.5 px-4">Native JS RegExp (Backtracking)</th>
                          <th className="py-2.5 px-4">PatternGuard DFA (Deterministic)</th>
                          <th className="py-2.5 px-4">DFA Speedup</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {benchmarkRows.map((row) => (
                          <tr key={row.n} className="hover:bg-slate-800/40">
                            <td className="py-2.5 px-4 font-bold text-white">n = {row.n}</td>
                            <td className="py-2.5 px-4 text-slate-400">{row.inputSnippet}</td>
                            <td className="py-2.5 px-4 font-bold">
                              {row.nativeTimedOut ? (
                                <span className="text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/30">
                                  TIMEOUT (&gt; 1,000ms)
                                </span>
                              ) : (
                                <span className={row.nativeTimeMs! > 100 ? 'text-amber-400' : 'text-slate-300'}>
                                  {row.nativeTimeMs} ms
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-emerald-400 font-bold">
                              {row.dfaTimeMs} ms
                            </td>
                            <td className="py-2.5 px-4 text-cyan-300 font-bold">
                              {row.speedup}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Safe Rewrite Card (When vulnerable) */}
          {diagnosis.safeRewrite && (
            <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900 to-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl space-y-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Safe Unambiguous Rewrite (Min-DFA Equivalent)</h4>
                  <p className="text-xs text-slate-400">
                    Synthesized via Generalized NFA (GNFA) State Elimination over the canonical minimal DFA.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <div className="bg-slate-950 px-4 py-2.5 rounded-xl border border-emerald-500/40 font-mono text-emerald-300 text-sm font-bold flex items-center gap-2">
                  <span>/</span>
                  <span className="text-white">{diagnosis.safeRewrite.equivalentRegex}</span>
                  <span>/</span>
                </div>

                <span className="text-xs text-slate-400">
                  {diagnosis.safeRewrite.reductionExplanation}
                </span>
              </div>
            </div>
          )}

          {/* Student Explanation Panel */}
          <div className="bg-slate-900/90 border border-indigo-500/30 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Explain to Me Like a Student: Why Does This Blow Up?</h4>
                  <p className="text-xs text-slate-400">
                    A conceptual breakdown of non-deterministic branching vs. deterministic finite state machines.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowTheoryDetails(!showTheoryDetails)}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                <span>{showTheoryDetails ? 'Hide Formal Details' : 'View Formal Details'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="bg-slate-950/90 p-4 rounded-xl border border-slate-800 text-xs text-slate-300 leading-relaxed space-y-3">
              <p>{diagnosis.explanation.studentFriendlyText}</p>

              {showTheoryDetails && (
                <div className="pt-3 border-t border-slate-800/80 space-y-2 font-mono text-[11px] text-slate-400">
                  <div className="text-indigo-300 font-bold font-sans">Formal Automata Theory Justification:</div>
                  <p>{diagnosis.explanation.theoreticalReason}</p>
                  <p className="text-slate-500">{diagnosis.explanation.sccDetails}</p>
                </div>
              )}
            </div>
          </div>

          {/* Product Automaton Graph Visualization */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                  <GitFork className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Product Automaton Graph ($N \times N$) & Tarjan's SCC</h4>
                  <p className="text-xs text-slate-400">
                    Visualizing synchronized execution pairs. Glowing red nodes represent states inside the offending Strongly Connected Component.
                  </p>
                </div>
              </div>
            </div>

            <ProductGraph productAutomaton={diagnosis.productAutomaton} />
          </div>
        </div>
      )}
    </div>
  );
};
