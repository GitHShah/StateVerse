/**
 * PatternGuard - Regex Doctor Types
 * Pure TypeScript definitions for ambiguity detection, product automata,
 * witness generation, and safe rewrites.
 */

import { NFA, DFA } from '../types';

export type AmbiguityVerdict = 'SAFE' | 'POLYNOMIAL' | 'EXPONENTIAL';

export interface ProductState {
  id: string; // e.g. "q0,q0"
  left: string; // state in NFA 1
  right: string; // state in NFA 2
  isDiagonal: boolean;
  isStart: boolean;
  isAccept: boolean;
  sccId?: number;
  isInOffendingSCC?: boolean;
}

export interface ProductTransition {
  from: string;
  to: string;
  symbol: string;
  isInOffendingSCC?: boolean;
}

export interface SCCComponent {
  id: number;
  states: string[];
  isTrivial: boolean; // single node without self-loop
  hasDiagonal: boolean;
  hasOffDiagonal: boolean;
  isOffendingEDA: boolean; // contains both diagonal and off-diagonal
  isOffendingIDA: boolean; // contains off-diagonal cycle
}

export interface ProductAutomaton {
  states: ProductState[];
  transitions: ProductTransition[];
  startState: string;
  acceptStates: string[];
  sccs: SCCComponent[];
  offendingSCC?: SCCComponent;
}

export interface WitnessString {
  prefix: string;
  pump: string;
  suffix: string;
  fullWitness: string; // e.g. prefix + pump^25 + suffix
  pumpRepetitions: number;
  explanation: string;
}

export interface BenchmarkStep {
  repetitionN: number;
  inputSnippet: string;
  nativeTimeMs: number | null;
  nativeTimedOut: boolean;
  dfaTimeMs: number;
  speedupRatio: string;
}

export interface DoctorDiagnosis {
  regex: string;
  verdict: AmbiguityVerdict;
  verdictLabel: string;
  severity: 'safe' | 'warning' | 'danger';
  explanation: {
    summary: string;
    studentFriendlyText: string;
    theoreticalReason: string;
    sccDetails: string;
  };
  productAutomaton: ProductAutomaton;
  witness?: WitnessString;
  safeRewrite?: {
    equivalentRegex: string;
    minDfaStateCount: number;
    reductionExplanation: string;
  };
  nfa: NFA;
  minDfa: DFA;
}
