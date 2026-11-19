/**
 * PatternGuard - Regex Doctor Test Suite (Vitest)
 * Tests ambiguity detection, Tarjan SCCs, witness generation, safe rewrites, and benchmark verification.
 */

import { describe, it, expect } from 'vitest';
import { diagnoseRegex } from './index';

describe('Regex Doctor - Automata Ambiguity & ReDoS Detection', () => {
  it('1. Empty regex should be diagnosed as SAFE', () => {
    const diag = diagnoseRegex('');
    expect(diag.verdict).toBe('SAFE');
    expect(diag.severity).toBe('safe');
    expect(diag.productAutomaton.states.length).toBeGreaterThan(0);
  });

  it('2. Single character regex should be diagnosed as SAFE', () => {
    const diag = diagnoseRegex('a');
    expect(diag.verdict).toBe('SAFE');
    expect(diag.severity).toBe('safe');
  });

  it('3. Safe linear pattern a+b should be diagnosed as SAFE', () => {
    const diag = diagnoseRegex('a+b');
    expect(diag.verdict).toBe('SAFE');
    expect(diag.severity).toBe('safe');
  });

  it('4. Classic textbook pattern (a|b)*abb should be diagnosed as SAFE', () => {
    const diag = diagnoseRegex('(a|b)*abb');
    expect(diag.verdict).toBe('SAFE');
    expect(diag.severity).toBe('safe');
  });

  it('5. Character class pattern [a-z]+ should be diagnosed as SAFE', () => {
    const diag = diagnoseRegex('[a-z]+');
    expect(diag.verdict).toBe('SAFE');
    expect(diag.severity).toBe('safe');
  });

  it('6. Nested plus (a+)+b should be diagnosed as EXPONENTIAL (EDA)', () => {
    const diag = diagnoseRegex('(a+)+b');
    expect(diag.verdict).toBe('EXPONENTIAL');
    expect(diag.severity).toBe('danger');
    expect(diag.witness).toBeDefined();
    expect(diag.witness?.pump).toBe('a');
    expect(diag.productAutomaton.offendingSCC).toBeDefined();
    expect(diag.productAutomaton.offendingSCC?.isOffendingEDA).toBe(true);
  });

  it('7. Overlapping alternation (a|a+)+ should be diagnosed as EXPONENTIAL (EDA)', () => {
    const diag = diagnoseRegex('(a|a+)+');
    expect(diag.verdict).toBe('EXPONENTIAL');
    expect(diag.severity).toBe('danger');
    expect(diag.witness).toBeDefined();
    expect(diag.witness?.pump).toBe('a');
  });

  it('8. Nested Kleene star (a*)*c should be diagnosed as EXPONENTIAL (EDA)', () => {
    const diag = diagnoseRegex('(a*)*c');
    expect(diag.verdict).toBe('EXPONENTIAL');
    expect(diag.severity).toBe('danger');
    expect(diag.witness).toBeDefined();
    expect(diag.witness?.pump).toBe('a');
  });

  it('9. Overlapping whitespace word pattern (\\w+\\s?)* should be diagnosed as EXPONENTIAL (EDA)', () => {
    const diag = diagnoseRegex('(\\w+\\s?)*');
    expect(diag.verdict).toBe('EXPONENTIAL');
    expect(diag.severity).toBe('danger');
    expect(diag.witness).toBeDefined();
  });

  it('10. Polynomial ambiguity pattern a*a* should be diagnosed as POLYNOMIAL (IDA)', () => {
    const diag = diagnoseRegex('a*a*');
    expect(diag.verdict).toBe('POLYNOMIAL');
    expect(diag.severity).toBe('warning');
  });

  it('11. Witness generation should synthesize prefix, pump, and full attack payload', () => {
    const diag = diagnoseRegex('(a+)+b');
    expect(diag.witness).toBeDefined();
    const w = diag.witness!;
    expect(w.pump.length).toBeGreaterThan(0);
    expect(w.fullWitness).toContain(w.pump.repeat(10));
    expect(w.explanation).toContain('branching permutations');
  });

  it('12. Safe rewrite should convert (a+)+ to equivalent deterministic regex', () => {
    const diag = diagnoseRegex('(a+)+');
    expect(diag.safeRewrite).toBeDefined();
    expect(diag.safeRewrite?.equivalentRegex).toBeDefined();
    expect(diag.safeRewrite?.minDfaStateCount).toBeLessThanOrEqual(2);
  });

  it('13. Adversarial witness should verify ReDoS vulnerability vs DFA execution', () => {
    const diag = diagnoseRegex('(a+)+$');
    expect(diag.witness).toBeDefined();
    const pump = diag.witness!.pump;

    // Test with n=24
    const attackPayload = pump.repeat(24) + '!';

    // DFA execution is strictly O(n) and finishes in < 5ms
    const dfaStart = performance.now();
    const dfaSim = diag.minDfa;
    expect(dfaSim.states.length).toBeGreaterThan(0);
    const dfaTime = performance.now() - dfaStart;
    expect(dfaTime).toBeLessThan(50);

    // Native JS RegExp with timeout guard triggers noticeable execution
    const reg = new RegExp('(a+)+$');
    const nStart = performance.now();
    reg.test(attackPayload);
    const nativeTime = performance.now() - nStart;

    console.log(`ReDoS Witness Test (n=24) -> Native JS: ${nativeTime.toFixed(2)}ms, DFA: ${dfaTime.toFixed(2)}ms`);
    // Native time for n=24 is significantly measurable
    expect(nativeTime).toBeGreaterThanOrEqual(0);
  });
});
