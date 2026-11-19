import type { DFA } from '../engine/types';

export function scoreAt(id: string) {
  const [runs, balls] = id.slice(1, -1).split(',').map(Number);
  return { runs, balls };
}

export function replayInnings(machine: DFA, sequence: string) {
  const path = [machine.startState];
  const symbols: string[] = [];
  const terminal = new Set(machine.states.filter(s => s.isAccept || s.isTrap).map(s => s.id));
  let state = machine.startState;
  for (const symbol of sequence) {
    if (terminal.has(state)) break;
    const edge = machine.transitions.find(t => t.from === state && t.symbol === symbol);
    if (!edge) break;
    state = edge.to;
    symbols.push(symbol);
    path.push(state);
  }
  return { state, path, symbols, won: machine.acceptStates.includes(state), done: terminal.has(state),
    unused: sequence.slice(symbols.length) };
}
