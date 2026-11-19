import { describe, expect, it } from 'vitest';
import { simulateAutomaton } from '../engine/simulator';
import { fieldMachines, rules, validateField } from './validation';

describe('scholarship rules and visualizer', () => {
  it.each(rules)('$label agrees across all three stages', rule => {
    const { nfa, dfa, minimal } = fieldMachines[rule.id];
    for (const [input, accepted] of [[rule.example, true], [`_${rule.example}`, false], ['', false]] as const) {
      for (const machine of [nfa, dfa, minimal]) {
        expect(simulateAutomaton(machine, input).isAccepted).toBe(accepted);
      }
      expect(validateField(minimal, input).accepted).toBe(accepted);
    }
  });

  it('distinguishes an invalid character from incomplete input', () => {
    const machine = fieldMachines.application.minimal;
    expect(validateField(machine, 'APP-20A6-1234').message).toContain('Character 7 ("A")');
    expect(validateField(machine, 'APP-2026').message).toContain('Input ended');
  });
});
