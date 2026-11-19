import { minimizeDFA } from '../engine/hopcroft';
import { parseRegex } from '../engine/parser';
import { simulateAutomaton } from '../engine/simulator';
import { buildSubsetDFA } from '../engine/subset';
import { buildThompsonNFA } from '../engine/thompson';
import type { DFA } from '../engine/types';

export const rules = [
  { id: 'application', label: 'Application ID', pattern: 'APP-[0-9]{4}-[0-9]{4}', example: 'APP-2026-1234', hint: 'APP, four digits, then a four-digit serial' },
  { id: 'roll', label: 'Student roll number', pattern: '(CS|EC|ME)[0-9]{7}', example: 'CS2026123', hint: 'CS, EC, or ME followed by seven digits' },
  { id: 'email', label: 'Institutional email', pattern: '[a-z][a-z0-9]*@campus\\.example', example: 'student24@campus.example', hint: 'A lowercase account at the fictional campus.example domain' },
  { id: 'course', label: 'Course code', pattern: '(CSE|ECE|MEC)-[0-9]{3}', example: 'CSE-101', hint: 'CSE, ECE, or MEC followed by a hyphen and three digits' },
  { id: 'pin', label: 'Postal PIN', pattern: '[1-9][0-9]{5}', example: '302017', hint: 'Six digits starting with a nonzero digit' },
] as const;

export function compilePattern(pattern: string) {
  const { ast, postfix } = parseRegex(pattern);
  const nfa = buildThompsonNFA(ast);
  const dfa = buildSubsetDFA(nfa);
  return { ast, postfix, nfa, dfa, minimal: minimizeDFA(dfa) };
}

export const fieldMachines = Object.fromEntries(
  rules.map(rule => [rule.id, compilePattern(rule.pattern)]),
);

export const inputLimit = 128;

export function validateField(machine: DFA, input: string) {
  if (/[^\x00-\x7f]/.test(input)) return { accepted: false, message: 'Use ASCII characters for this rule.' };
  const result = simulateAutomaton(machine, input);
  if (result.isAccepted) return { accepted: true, message: 'Format accepted.' };

  const traps = new Set(machine.states.filter(state => state.isTrap).map(state => state.id));
  const failure = result.steps.findIndex(step =>
    step.charIndex >= 0 && (!step.activeStates.length || step.activeStates.every(id => traps.has(id))),
  );
  const previous = result.steps[failure < 0 ? result.steps.length - 1 : failure - 1];
  const expected = machine.transitions
    .filter(edge => previous?.activeStates.includes(edge.from) && !traps.has(edge.to))
    .map(edge => edge.symbol === ' ' ? 'space' : edge.symbol);
  const step = result.steps[failure];
  const reason = step
    ? `Character ${step.charIndex + 1} (${JSON.stringify(step.symbol)}) is invalid.`
    : 'Input ended before reaching an accepting state.';
  return { accepted: false, message: expected.length ? `${reason} Expected ${expected.join(' or ')}.` : reason };
}
