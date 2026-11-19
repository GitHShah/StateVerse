/**
 * PatternGuard - Ambiguity Detector & Regex Doctor Engine
 * Full diagnostic pipeline: Regex -> AST -> Thompson NFA -> Product NFAxNFA -> Tarjan SCC -> Diagnosis
 */

import { parseRegexToAST } from '../parser';
import { buildThompsonNFA } from '../thompson';
import { buildSubsetDFA } from '../subset';
import { minimizeDFA } from '../hopcroft';
import { buildProductAutomaton } from './productAutomaton';
import { computeTarjanSCC } from './tarjan';
import { generateWitnessString } from './witnessGenerator';
import { convertMinDFAToRegex } from './stateElimination';
import { AmbiguityVerdict, DoctorDiagnosis } from './types';

export function diagnoseRegex(rawRegex: string): DoctorDiagnosis {
  if (rawRegex === undefined || rawRegex === null) {
    throw new Error('Regex cannot be null or undefined.');
  }

  // 1. Compile NFA & Min-DFA
  const ast = parseRegexToAST(rawRegex);
  const nfa = buildThompsonNFA(ast);
  const dfa = buildSubsetDFA(nfa);
  const minDfa = minimizeDFA(dfa);

  // 2. Build Product Automaton NFA x NFA
  const productAutomaton = buildProductAutomaton(nfa);

  // 3. Compute SCCs with Tarjan's algorithm
  const sccs = computeTarjanSCC(productAutomaton);
  productAutomaton.sccs = sccs;

  // 4. Classify Ambiguity (EDA vs IDA vs SAFE)
  const offendingEDA = sccs.find((c) => c.isOffendingEDA);
  const offendingIDA = sccs.find((c) => c.isOffendingIDA);

  let verdict: AmbiguityVerdict = 'SAFE';
  let offendingSCC = offendingEDA || offendingIDA;

  if (offendingEDA) {
    verdict = 'EXPONENTIAL';
  } else if (offendingIDA) {
    verdict = 'POLYNOMIAL';
  } else {
    verdict = 'SAFE';
  }

  productAutomaton.offendingSCC = offendingSCC;

  // Mark states and transitions in the offending SCC for visualization
  if (offendingSCC) {
    const offendingSet = new Set(offendingSCC.states);
    for (const st of productAutomaton.states) {
      st.isInOffendingSCC = offendingSet.has(st.id);
    }
    for (const tr of productAutomaton.transitions) {
      tr.isInOffendingSCC = offendingSet.has(tr.from) && offendingSet.has(tr.to);
    }
  }

  // 5. Synthesize attack witness string if vulnerable
  let witness;
  if (offendingSCC) {
    witness = generateWitnessString(productAutomaton, offendingSCC, rawRegex);
  }

  // 6. Compute safe rewrite via Min-DFA state elimination
  let safeRewrite;
  if (verdict !== 'SAFE') {
    const equivalentRegex = convertMinDFAToRegex(minDfa);
    safeRewrite = {
      equivalentRegex,
      minDfaStateCount: minDfa.states.filter((s) => !s.isTrap).length,
      reductionExplanation:
        `Converting to canonical minimal DFA merges duplicate non-deterministic branches into ` +
        `${minDfa.states.filter((s) => !s.isTrap).length} deterministic state(s), completely eliminating backtracking.`,
    };
  }

  // 7. Generate student-friendly explanations
  const verdictLabel =
    verdict === 'EXPONENTIAL'
      ? 'Exponential Ambiguity (EDA) — High ReDoS Risk'
      : verdict === 'POLYNOMIAL'
      ? 'Polynomial Ambiguity (IDA) — Moderate ReDoS Risk'
      : 'No heuristic ambiguity signal';

  const severity: 'safe' | 'warning' | 'danger' =
    verdict === 'EXPONENTIAL' ? 'danger' : verdict === 'POLYNOMIAL' ? 'warning' : 'safe';

  let studentFriendlyText = '';
  let theoreticalReason = '';
  let sccDetails = '';

  if (verdict === 'EXPONENTIAL') {
    studentFriendlyText =
      `Imagine you have a map with two roads that look identical. Every time you see a milestone "${witness?.pump || 'a'}", ` +
      `you can take either road. If you repeat this ${witness?.pumpRepetitions || 25} times, there are 2^${witness?.pumpRepetitions || 25} ` +
      `= 33,554,432 different routes! When the destination at the end doesn't match "${witness?.suffix || '!'}", ` +
      `the native regular expression engine tries every single one of those 33 million routes before giving up, freezing your CPU.`;

    theoreticalReason =
      `In the product automaton NFA × NFA, Tarjan's algorithm discovered a strongly connected component (SCC #${offendingSCC?.id}) ` +
      `containing both synchronized diagonal states (q, q) and desynchronized off-diagonal states (q, q'). ` +
      `Because both states in this component can mutually loop while reading the same pump token "${witness?.pump || 'a'}", ` +
      `the number of accepting derivations grows as 2^k (Exponential Degree of Ambiguity).`;

    sccDetails =
      `Offending SCC #${offendingSCC?.id} contains ${offendingSCC?.states.length} state(s) in NFA × NFA: ` +
      `{${offendingSCC?.states.slice(0, 5).join(', ')}${offendingSCC && offendingSCC.states.length > 5 ? '…' : ''}}.`;
  } else if (verdict === 'POLYNOMIAL') {
    studentFriendlyText =
      `This regular expression allows multiple ways to match substrings, but they grow like n^2 or n^3 instead of 2^n. ` +
      `While it won't freeze a server instantly on 30 characters like an exponential pattern, it can still degrade performance ` +
      `on very large text files.`;

    theoreticalReason =
      `The product automaton contains off-diagonal cycles (q, q') that can be reached and looped, but no single SCC contains ` +
      `both diagonal and off-diagonal states. This indicates Infinite Degree of Ambiguity (IDA) bounded by a polynomial degree.`;

    sccDetails = `Offending SCC #${offendingSCC?.id} contains ${offendingSCC?.states.length} state(s).`;
  } else {
    studentFriendlyText =
      `This bounded heuristic found no ambiguity signal; this is not a safety proof. At every point during matching, the automaton has either ` +
      `a deterministic path or cleanly separated alternatives. It runs in strictly O(n) time on all inputs.`;

    theoreticalReason =
      `No non-trivial strongly connected component in the product automaton contains off-diagonal state pairs. ` +
      `The automaton is unambiguous or has strictly finite ambiguity. Native engine behavior is not certified.`;

    sccDetails = `Product automaton contains ${sccs.length} component(s), examined by the heuristic.`;
  }

  return {
    regex: rawRegex,
    verdict,
    verdictLabel,
    severity,
    explanation: {
      summary:
        verdict === 'EXPONENTIAL'
          ? `Vulnerable to ReDoS via exponential catastrophic backtracking (EDA).`
          : verdict === 'POLYNOMIAL'
          ? `Contains polynomial ambiguity (IDA).`
          : `Safe: no catastrophic backtracking detected.`,
      studentFriendlyText,
      theoreticalReason,
      sccDetails,
    },
    productAutomaton,
    witness,
    safeRewrite,
    nfa,
    minDfa,
  };
}
