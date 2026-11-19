import type { DFA, NFA } from '../engine/types';
import { minimizeDFA } from '../engine/hopcroft';
import { simulateAutomaton } from '../engine/simulator';

function reachableMachine(start: string, alphabet: string[], next: (state: string, symbol: string) => string,
  accepting: (state: string) => boolean, trap: (state: string) => boolean): DFA {
  const ids = new Set([start]);
  const transitions: DFA['transitions'] = [];
  for (const from of ids) {
    for (const symbol of alphabet) {
      const to = next(from, symbol);
      ids.add(to);
      transitions.push({ from, to, symbol });
    }
  }
  return { type: 'DFA', startState: start, alphabet, transitions, acceptStates: [...ids].filter(accepting),
    states: [...ids].map(id => ({ id, label: id, isStart: id === start, isAccept: accepting(id), isTrap: trap(id) })) };
}

export const metro = reachableMachine('q0', ['I','T','O'], (state, symbol) => {
  if (state === 'q0' && symbol === 'I') return 'q1';
  if (state === 'q1' && symbol === 'T') return 'q1';
  if (state === 'q1' && symbol === 'O') return 'q2';
  return 'q_dead';
}, state => state === 'q2', state => state === 'q_dead');

const score = (id: string) => id.slice(1,-1).split(',').map(Number);
export type ChaseSettings = { target: number; balls: number; sixes?: boolean };
export const defaultChase: ChaseSettings = { target: 8, balls: 3, sixes: true };
export const limits = { target: 60, balls: 12 };
export const deliveries = [
  { symbol: '0', label: 'Dot ball', runs: 0, legal: 1 },
  { symbol: '1', label: 'Single', runs: 1, legal: 1 },
  { symbol: '4', label: 'Boundary', runs: 4, legal: 1 },
  { symbol: '6', label: 'Six', runs: 6, legal: 1 },
  { symbol: 'W', label: 'Wide', runs: 1, legal: 0 },
] as const;

export function buildChase({ target, balls, sixes = true }: ChaseSettings) {
  if (!Number.isInteger(target) || target < 1 || target > limits.target ||
      !Number.isInteger(balls) || balls < 1 || balls > limits.balls) throw Error('Invalid chase settings.');
  const accept = (id: string) => id !== 'dead' && score(id)[0] >= target;
  const reject = (id: string) => id === 'dead' || (!accept(id) && score(id)[1] === balls);
  const dfa = reachableMachine('(0,0)', deliveries.filter(d => sixes || d.symbol !== '6').map(d => d.symbol), (state, symbol) => {
    if (accept(state) || reject(state)) return 'dead';
    const [runs, used] = score(state);
    const delivery = deliveries.find(d => d.symbol === symbol)!;
    return `(${runs + delivery.runs},${used + delivery.legal})`;
  }, accept, reject);
  const nfa: NFA = { ...dfa, type: 'eNFA' };
  return { dfa, nfa, minimal: minimizeDFA(dfa), ast: null, postfix: [] };
}

export function journey(input: string) {
  const trace = simulateAutomaton(metro,input);
  const failure = trace.steps.findIndex(step => step.activeStates.includes('q_dead'));
  const step = trace.steps[failure];
  const previous = trace.steps[failure-1]?.activeStates[0];
  const reason = previous === 'q0' ? 'Tap in before transferring or tapping out.' :
    previous === 'q1' ? 'Double tap-in while a ticket is active.' : 'The gate closed after tap-out.';
  return { trace, failure, message: step ? `Step ${failure} · index ${step.charIndex} · ${previous} received ${step.symbol}. ${reason}` : '' };
}
