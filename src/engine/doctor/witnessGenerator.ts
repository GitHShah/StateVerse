/**
 * StateVerse - Adversarial Witness Generator
 * Synthesizes the minimal attack payload (prefix + pump^k + suffix)
 * using BFS on the product automaton.
 */

import { ProductAutomaton, SCCComponent, WitnessString } from './types';

export function generateWitnessString(
  automaton: ProductAutomaton,
  offendingSCC: SCCComponent,
  rawRegex: string,
  defaultRepetitions = 25
): WitnessString {
  const sccStateSet = new Set(offendingSCC.states);

  // Group transitions by from state
  const outEdges = new Map<string, Array<{ to: string; symbol: string }>>();
  for (const t of automaton.transitions) {
    if (!outEdges.has(t.from)) {
      outEdges.set(t.from, []);
    }
    outEdges.get(t.from)!.push({ to: t.to, symbol: t.symbol });
  }

  // 1. Find shortest prefix from startState to any state in offendingSCC
  let prefix = '';
  let entryState = offendingSCC.states[0];

  if (sccStateSet.has(automaton.startState)) {
    entryState = automaton.startState;
    prefix = '';
  } else {
    // BFS to find closest SCC state
    const queue: Array<{ state: string; path: string }> = [{ state: automaton.startState, path: '' }];
    const visited = new Set<string>([automaton.startState]);
    let foundEntry = false;

    while (queue.length > 0) {
      const { state, path } = queue.shift()!;
      if (sccStateSet.has(state)) {
        entryState = state;
        prefix = path;
        foundEntry = true;
        break;
      }

      const neighbors = outEdges.get(state) || [];
      for (const { to, symbol } of neighbors) {
        if (!visited.has(to)) {
          visited.add(to);
          // If symbol is an equivalence class like [0-9], pick its first representative
          const cleanChar = symbol.startsWith('[') && symbol.endsWith(']') ? symbol[1] : symbol;
          queue.push({ state: to, path: path + cleanChar });
        }
      }
    }

    if (!foundEntry) {
      entryState = offendingSCC.states[0];
      prefix = '';
    }
  }

  // 2. Find shortest cycle (pump) within the offending SCC starting at entryState
  let pump = '';

  // Check for immediate self-loop on entryState
  const entryEdges = outEdges.get(entryState) || [];
  const selfLoop = entryEdges.find((e) => e.to === entryState);
  if (selfLoop) {
    pump = selfLoop.symbol.startsWith('[') && selfLoop.symbol.endsWith(']') ? selfLoop.symbol[1] : selfLoop.symbol;
  } else {
    // BFS for cycle back to entryState inside offendingSCC
    const cycleQueue: Array<{ state: string; path: string }> = [];
    for (const { to, symbol } of entryEdges) {
      if (sccStateSet.has(to)) {
        const cleanChar = symbol.startsWith('[') && symbol.endsWith(']') ? symbol[1] : symbol;
        cycleQueue.push({ state: to, path: cleanChar });
      }
    }

    const cycleVisited = new Set<string>();
    while (cycleQueue.length > 0) {
      const { state, path } = cycleQueue.shift()!;
      if (state === entryState) {
        pump = path;
        break;
      }

      if (cycleVisited.has(state)) continue;
      cycleVisited.add(state);

      const nextEdges = outEdges.get(state) || [];
      for (const { to, symbol } of nextEdges) {
        if (sccStateSet.has(to) && (!cycleVisited.has(to) || to === entryState)) {
          const cleanChar = symbol.startsWith('[') && symbol.endsWith(']') ? symbol[1] : symbol;
          cycleQueue.push({ state: to, path: path + cleanChar });
        }
      }
    }
  }

  // Fallback pump if cycle not found from entryState
  if (!pump) {
    // Look for any edge inside SCC
    for (const s of offendingSCC.states) {
      const edges = outEdges.get(s) || [];
      for (const e of edges) {
        if (sccStateSet.has(e.to)) {
          pump = e.symbol.startsWith('[') && e.symbol.endsWith(']') ? e.symbol[1] : e.symbol;
          break;
        }
      }
      if (pump) break;
    }
  }
  if (!pump) {
    pump = 'a';
  }

  // Construct a candidate without executing untrusted native regex on the UI thread.
  const suffix = '!';
  void rawRegex;

  const fullWitness = prefix + pump.repeat(defaultRepetitions) + suffix;

  return {
    prefix,
    pump,
    suffix,
    fullWitness,
    pumpRepetitions: defaultRepetitions,
    explanation:
      `Attack payload structure: prefix "${prefix}" primes the automaton state, ` +
      `pumping "${pump}" ${defaultRepetitions} times creates 2^${defaultRepetitions} branching permutations in backtracking engines, ` +
      `and terminal suffix "${suffix}" forces full failure with exhaustive backtracking.`,
  };
}
