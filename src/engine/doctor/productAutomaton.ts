/**
 * PatternGuard - Product Automaton Builder (NFA x NFA)
 * Constructs the synchronized product automaton between two copies of the Thompson NFA.
 * Accurately detects multi-path epsilon derivations (EDA) and off-diagonal cycles (IDA).
 */

import { NFA, matchesSymbol } from '../types';
import { partitionAlphabet } from '../subset';
import { ProductAutomaton, ProductState, ProductTransition } from './types';

export interface NFAMove {
  target: string;
  symbol: string;
  pathKey: string;
}

/**
 * Computes epsilon-closures and first-edge reachability.
 */
export function buildEpsTransitions(nfa: NFA): {
  epsClosure: Map<string, Set<string>>;
  firstEdgesMap: Map<string, Map<string, string[]>>; // firstEdgesMap[from][target] = array of first edge IDs
} {
  const epsClosure = new Map<string, Set<string>>();
  const firstEdgesMap = new Map<string, Map<string, string[]>>();

  const epsEdges = nfa.transitions
    .filter((t) => t.isEpsilon || t.symbol === 'ε')
    .map((t, idx) => ({ from: t.from, to: t.to, id: `eps_${idx}_${t.from}->${t.to}` }));

  // Precompute epsilon closure for each state
  for (const st of nfa.states) {
    const closure = new Set<string>([st.id]);
    const stack = [st.id];
    while (stack.length > 0) {
      const curr = stack.pop()!;
      for (const e of epsEdges) {
        if (e.from === curr && !closure.has(e.to)) {
          closure.add(e.to);
          stack.push(e.to);
        }
      }
    }
    epsClosure.set(st.id, closure);
  }

  // Precompute first edges from `st.id` that can reach each target `u` in epsClosure(st.id)
  for (const st of nfa.states) {
    const targetEdges = new Map<string, string[]>();

    // If st.id == u, direct path
    targetEdges.set(st.id, ['direct']);

    const outgoing = epsEdges.filter((e) => e.from === st.id);
    for (const e of outgoing) {
      const destClosure = epsClosure.get(e.to) ?? new Set([e.to]);
      for (const reachableTarget of destClosure) {
        if (!targetEdges.has(reachableTarget)) {
          targetEdges.set(reachableTarget, []);
        }
        if (!targetEdges.get(reachableTarget)!.includes(e.id)) {
          targetEdges.get(reachableTarget)!.push(e.id);
        }
      }
    }

    firstEdgesMap.set(st.id, targetEdges);
  }

  return { epsClosure, firstEdgesMap };
}

/**
 * Finds all character moves from a state `s` reading symbol `rep`:
 * s ->(eps*) u ->(rep) v.
 * Returns target `v` and unique `pathKey` distinguishing parallel paths.
 */
export function getMovesFromState(
  s: string,
  rep: string,
  nfa: NFA,
  epsClosure: Map<string, Set<string>>,
  firstEdgesMap: Map<string, Map<string, string[]>>
): NFAMove[] {
  const moves: NFAMove[] = [];
  const sClosure = epsClosure.get(s) ?? new Set([s]);
  const sEdgeMap = firstEdgesMap.get(s);

  const nonEpsTransitions = nfa.transitions
    .filter((t) => !t.isEpsilon && t.symbol !== 'ε')
    .map((t, idx) => ({ from: t.from, to: t.to, symbol: t.symbol, matcherDef: t.matcherDef, id: `char_${idx}` }));

  for (const t of nonEpsTransitions) {
    if (sClosure.has(t.from)) {
      let matches = false;
      if (t.matcherDef) {
        matches = matchesSymbol(t.matcherDef, rep);
      } else if (t.symbol === '.') {
        matches = rep !== '\n';
      } else {
        matches = t.symbol === rep;
      }

      if (matches) {
        const availableFirstEdges = sEdgeMap?.get(t.from) || ['direct'];
        for (const fEdge of availableFirstEdges) {
          const pathKey = `${t.id}_via_${fEdge}`;
          moves.push({
            target: t.to,
            symbol: t.symbol,
            pathKey,
          });
        }
      }
    }
  }

  return moves;
}

/**
 * Builds the product automaton NFA x NFA for ambiguity detection.
 */
export function buildProductAutomaton(nfa: NFA): ProductAutomaton {
  const { epsClosure, firstEdgesMap } = buildEpsTransitions(nfa);
  const equivClasses = partitionAlphabet(nfa.transitions);
  const acceptSet = new Set(nfa.acceptStates);

  const alphabet = equivClasses.length > 0
    ? equivClasses.map((eq) => ({ label: eq.label, rep: eq.representative }))
    : nfa.alphabet.length > 0
    ? nfa.alphabet.map((sym) => ({ label: sym, rep: sym }))
    : [];

  const startId = `${nfa.startState},${nfa.startState}`;
  const productStatesMap = new Map<string, ProductState>();
  const productTransitions: ProductTransition[] = [];
  const edgeDedupe = new Set<string>();

  function getOrCreateState(left: string, right: string, isDivergent = false): ProductState {
    const id = isDivergent ? `${left},${right}*` : `${left},${right}`;
    if (productStatesMap.has(id)) {
      return productStatesMap.get(id)!;
    }

    const isStart = id === startId;
    const isDiagonal = !isDivergent && left === right;
    const isAccept = acceptSet.has(left) && acceptSet.has(right);

    const state: ProductState = {
      id,
      left,
      right,
      isDiagonal,
      isStart,
      isAccept,
    };
    productStatesMap.set(id, state);
    return state;
  }

  // Initialize start state
  getOrCreateState(nfa.startState, nfa.startState);

  const queue: string[] = [startId];
  const visited = new Set<string>([startId]);
  const MAX_PRODUCT_STATES = 1500;

  while (queue.length > 0 && productStatesMap.size < MAX_PRODUCT_STATES) {
    const currId = queue.shift()!;
    const baseId = currId.replace('*', '');
    const [left, right] = baseId.split(',');

    for (const { label, rep } of alphabet) {
      const leftMoves = getMovesFromState(left, rep, nfa, epsClosure, firstEdgesMap);
      const rightMoves = getMovesFromState(right, rep, nfa, epsClosure, firstEdgesMap);

      if (leftMoves.length === 0 || rightMoves.length === 0) continue;

      for (const m1 of leftMoves) {
        for (const m2 of rightMoves) {
          const isDivergent = m1.target === m2.target && m1.pathKey !== m2.pathKey;
          const targetState = getOrCreateState(m1.target, m2.target, isDivergent);

          const edgeKey = `${currId}-${label}->${targetState.id}`;
          if (!edgeDedupe.has(edgeKey)) {
            edgeDedupe.add(edgeKey);
            productTransitions.push({
              from: currId,
              to: targetState.id,
              symbol: label,
            });
          }

          if (isDivergent) {
            const canonicalDiag = getOrCreateState(m1.target, m1.target, false);
            const returnKey = `${targetState.id}-ε->${canonicalDiag.id}`;
            if (!edgeDedupe.has(returnKey)) {
              edgeDedupe.add(returnKey);
              productTransitions.push({
                from: targetState.id,
                to: canonicalDiag.id,
                symbol: label,
              });
            }
          }

          if (!visited.has(targetState.id)) {
            visited.add(targetState.id);
            queue.push(targetState.id);
          }
        }
      }
    }
  }

  const allProductStates = Array.from(productStatesMap.values());
  const actualAccepts = allProductStates.filter((s) => s.isAccept).map((s) => s.id);

  return {
    states: allProductStates,
    transitions: productTransitions,
    startState: startId,
    acceptStates: actualAccepts,
    sccs: [],
  };
}
