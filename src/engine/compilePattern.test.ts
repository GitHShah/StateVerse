import { describe, expect, it } from 'vitest';
import { simulateAutomaton } from './simulator';
import { compilePattern } from './compilePattern';

const rules = [
  { label: 'Application ID', pattern: 'APP-[0-9]{4}-[0-9]{4}', example: 'APP-2026-1234' },
  { label: 'Student roll number', pattern: '(CS|EC|ME)[0-9]{7}', example: 'CS2026123' },
  { label: 'Institutional email', pattern: '[a-z][a-z0-9]*@campus\\.example', example: 'student24@campus.example' },
  { label: 'Course code', pattern: '(CSE|ECE|MEC)-[0-9]{3}', example: 'CSE-101' },
  { label: 'Postal PIN', pattern: '[1-9][0-9]{5}', example: '302017' },
] as const;

describe('scholarship rules and visualizer', () => {
  it.each(rules)('$label agrees across all three stages', rule => {
    const { nfa, dfa, minimal } = compilePattern(rule.pattern);
    for (const [input, accepted] of [[rule.example, true], [`_${rule.example}`, false], ['', false]] as const) {
      for (const machine of [nfa, dfa, minimal]) {
        expect(simulateAutomaton(machine, input).isAccepted).toBe(accepted);
      }
    }
  });
});
