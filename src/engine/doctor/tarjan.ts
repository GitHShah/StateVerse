/**
 * PatternGuard - Tarjan's Strongly Connected Components (SCC) Algorithm
 * Analyzes the product graph NFA x NFA to partition states into SCCs
 * and identify exponential (EDA) or polynomial (IDA) ambiguity.
 */

import { ProductAutomaton, SCCComponent } from './types';

export function computeTarjanSCC(automaton: ProductAutomaton): SCCComponent[] {
  const { states, transitions } = automaton;

  // Build adjacency list and record self-loops
  const adj = new Map<string, string[]>();
  const selfLoops = new Set<string>();

  for (const s of states) {
    adj.set(s.id, []);
  }

  for (const t of transitions) {
    if (adj.has(t.from)) {
      adj.get(t.from)!.push(t.to);
    }
    if (t.from === t.to) {
      selfLoops.add(t.from);
    }
  }

  const index = new Map<string, number>();
  const lowlink = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const sccs: SCCComponent[] = [];

  let currentIndex = 0;
  let sccCounter = 0;

  function strongConnect(u: string) {
    index.set(u, currentIndex);
    lowlink.set(u, currentIndex);
    currentIndex++;
    stack.push(u);
    onStack.add(u);

    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (!index.has(v)) {
        strongConnect(v);
        lowlink.set(u, Math.min(lowlink.get(u)!, lowlink.get(v)!));
      } else if (onStack.has(v)) {
        lowlink.set(u, Math.min(lowlink.get(u)!, index.get(v)!));
      }
    }

    // Check if u is root of an SCC
    if (lowlink.get(u) === index.get(u)) {
      const componentStates: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        componentStates.push(w);
      } while (w !== u);

      const isTrivial = componentStates.length === 1 && !selfLoops.has(u);

      let hasDiagonal = false;
      let hasOffDiagonal = false;

      for (const sId of componentStates) {
        const isDivergent = sId.endsWith('*');
        const [left, right] = sId.replace('*', '').split(',');
        if (isDivergent || left !== right) {
          hasOffDiagonal = true;
        } else {
          hasDiagonal = true;
        }
      }

      // Non-trivial SCC criteria
      const isOffendingEDA = !isTrivial && hasDiagonal && hasOffDiagonal;
      const isOffendingIDA = !isTrivial && !isOffendingEDA && hasOffDiagonal;

      const scc: SCCComponent = {
        id: sccCounter++,
        states: componentStates,
        isTrivial,
        hasDiagonal,
        hasOffDiagonal,
        isOffendingEDA,
        isOffendingIDA,
      };

      sccs.push(scc);
    }
  }

  for (const s of states) {
    if (!index.has(s.id)) {
      strongConnect(s.id);
    }
  }

  return sccs;
}
