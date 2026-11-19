/**
 * StateVerse - Thompson's Construction Algorithm
 * Compiles an AST into an ε-NFA.
 * Supports: literals, character classes [a-z], [^abc], wildcard '.', and escapes.
 * All transitions use serializable SymbolMatcherDef plain data objects.
 */

import { ASTNode, NFA, NFAState, NFATransition, EPSILON, SymbolMatcherDef } from './types';

interface NFAFragment {
  start: string;
  accept: string;
}

export function buildThompsonNFA(ast: ASTNode): NFA {
  let stateCounter = 0;
  const states = new Map<string, NFAState>();
  const transitions: NFATransition[] = [];
  const alphabetSet = new Set<string>();

  function createState(subLabel = ''): string {
    const id = `q${stateCounter++}`;
    states.set(id, {
      id,
      label: id,
      subLabel,
      isStart: false,
      isAccept: false,
    });
    return id;
  }

  function addTransition(
    from: string,
    to: string,
    symbol: string,
    matcherDef?: SymbolMatcherDef,
    isEpsilon = false
  ) {
    transitions.push({
      from,
      to,
      symbol,
      matcherDef,
      isEpsilon,
    });
    if (!isEpsilon && symbol !== EPSILON) {
      alphabetSet.add(symbol);
    }
  }

  function compileNode(node: ASTNode): NFAFragment {
    // 1. Literal Character or Epsilon
    if (node.type === 'LITERAL') {
      const start = createState();
      const accept = createState();
      if (!node.value || node.value === '') {
        // Epsilon transition
        addTransition(start, accept, EPSILON, { type: 'epsilon' }, true);
      } else {
        const val = node.value;
        addTransition(start, accept, val, { type: 'char', char: val }, false);
      }
      return { start, accept };
    }

    // 2. Wildcard Any Character (.)
    if (node.type === 'ANY_CHAR') {
      const start = createState();
      const accept = createState();
      addTransition(start, accept, '.', { type: 'any' }, false);
      return { start, accept };
    }

    // 3. Character Class [a-z] or [^abc]
    if (node.type === 'CHAR_CLASS') {
      const start = createState();
      const accept = createState();
      const chars = node.charList ? [...node.charList] : [];
      const isNeg = !!node.isNegated;
      addTransition(start, accept, node.label, { type: 'class', chars, isNegated: isNeg }, false);
      return { start, accept };
    }

    // 4. Concatenation (·)
    if (node.type === 'CONCAT' && node.children && node.children.length === 2) {
      const left = compileNode(node.children[0]);
      const right = compileNode(node.children[1]);
      addTransition(left.accept, right.start, EPSILON, { type: 'epsilon' }, true);
      return { start: left.start, accept: right.accept };
    }

    // 5. Alternation / Union (|)
    if (node.type === 'UNION' && node.children && node.children.length === 2) {
      const start = createState();
      const accept = createState();
      const left = compileNode(node.children[0]);
      const right = compileNode(node.children[1]);

      addTransition(start, left.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(start, right.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(left.accept, accept, EPSILON, { type: 'epsilon' }, true);
      addTransition(right.accept, accept, EPSILON, { type: 'epsilon' }, true);

      return { start, accept };
    }

    // 6. Kleene Star (*)
    if (node.type === 'KLEENE_STAR' && node.children && node.children.length === 1) {
      const start = createState();
      const accept = createState();
      const inner = compileNode(node.children[0]);

      addTransition(start, inner.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(start, accept, EPSILON, { type: 'epsilon' }, true);
      addTransition(inner.accept, inner.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(inner.accept, accept, EPSILON, { type: 'epsilon' }, true);

      return { start, accept };
    }

    // 7. Plus (+)
    if (node.type === 'PLUS' && node.children && node.children.length === 1) {
      const start = createState();
      const accept = createState();
      const inner = compileNode(node.children[0]);

      addTransition(start, inner.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(inner.accept, inner.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(inner.accept, accept, EPSILON, { type: 'epsilon' }, true);

      return { start, accept };
    }

    // 8. Optional (?)
    if (node.type === 'OPTIONAL' && node.children && node.children.length === 1) {
      const start = createState();
      const accept = createState();
      const inner = compileNode(node.children[0]);

      addTransition(start, inner.start, EPSILON, { type: 'epsilon' }, true);
      addTransition(start, accept, EPSILON, { type: 'epsilon' }, true);
      addTransition(inner.accept, accept, EPSILON, { type: 'epsilon' }, true);

      return { start, accept };
    }

    throw new Error(`Unsupported AST node type: ${node.type}`);
  }

  const rootFrag = compileNode(ast);
  const startStateObj = states.get(rootFrag.start)!;
  const acceptStateObj = states.get(rootFrag.accept)!;

  startStateObj.isStart = true;
  acceptStateObj.isAccept = true;
  acceptStateObj.priority = 0;

  // Renumber states in BFS topological order starting from startState
  const bfsOrder: string[] = [];
  const visited = new Set<string>([rootFrag.start]);
  const queue: string[] = [rootFrag.start];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    bfsOrder.push(curr);
    for (const t of transitions) {
      if (t.from === curr && !visited.has(t.to)) {
        visited.add(t.to);
        queue.push(t.to);
      }
    }
  }

  // Include any disjoint states if any
  for (const s of states.keys()) {
    if (!visited.has(s)) bfsOrder.push(s);
  }

  const idMap = new Map<string, string>();
  bfsOrder.forEach((oldId, idx) => {
    idMap.set(oldId, `q${idx}`);
  });

  const normalizedStates: NFAState[] = bfsOrder.map((oldId, idx) => {
    const st = states.get(oldId)!;
    const newId = `q${idx}`;
    return {
      id: newId,
      label: newId,
      subLabel: st.isStart ? 'Start' : st.isAccept ? 'Accept' : '',
      isStart: st.isStart,
      isAccept: st.isAccept,
      priority: st.priority,
    };
  });

  const normalizedTransitions: NFATransition[] = transitions.map((t) => ({
    from: idMap.get(t.from)!,
    to: idMap.get(t.to)!,
    symbol: t.symbol,
    matcherDef: t.matcherDef,
    isEpsilon: t.isEpsilon,
  }));

  return {
    type: 'eNFA',
    states: normalizedStates,
    transitions: normalizedTransitions,
    startState: idMap.get(rootFrag.start)!,
    acceptStates: [idMap.get(rootFrag.accept)!],
    alphabet: Array.from(alphabetSet).sort(),
    stateRuleMap: {},
  };
}
