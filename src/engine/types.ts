/**
 * StateVerse Automata Engine - Core Types
 * Pure TypeScript, no UI dependencies. Fully serializable for Web Worker structured cloning.
 */

export const EPSILON = 'ε';

export type ASTNodeType =
  | 'LITERAL'
  | 'CHAR_CLASS'
  | 'ANY_CHAR'
  | 'CONCAT'
  | 'UNION'
  | 'KLEENE_STAR'
  | 'PLUS'
  | 'OPTIONAL'
  | 'REPEAT';

export interface ASTNode {
  id: string;
  type: ASTNodeType;
  value?: string;           // For LITERAL
  charList?: string[];      // For CHAR_CLASS (serializable plain array)
  isNegated?: boolean;      // For [^...]
  min?: number;             // For REPEAT {m,n}
  max?: number;             // For REPEAT {m,n} (Infinity for {m,})
  operator?: string;
  label: string;
  children?: ASTNode[];
}

export type SymbolMatcherDef =
  | { type: 'char'; char: string }
  | { type: 'class'; chars: string[]; isNegated?: boolean }
  | { type: 'any' }
  | { type: 'epsilon' };

/**
 * Pure evaluation function for serializable SymbolMatcherDef.
 */
export function matchesSymbol(matcher: SymbolMatcherDef | undefined, ch: string): boolean {
  if (!matcher) return false;
  switch (matcher.type) {
    case 'char':
      return ch === matcher.char;
    case 'any':
      return ch !== '\n';
    case 'class': {
      const found = matcher.chars.includes(ch);
      return matcher.isNegated ? !found : found;
    }
    case 'epsilon':
      return false;
    default:
      return false;
  }
}

export interface EquivClass {
  id: number;
  label: string;
  representative: string;
  chars?: string[];
}

/**
 * Pure evaluation function for serializable EquivClass.
 */
export function matchesEquivClass(eq: EquivClass, ch: string): boolean {
  if (eq.chars && eq.chars.length > 0) {
    return eq.chars.includes(ch);
  }
  return ch === eq.representative;
}

export interface NFATransition {
  from: string;
  to: string;
  symbol: string;           // Character, class label, or EPSILON
  matcherDef?: SymbolMatcherDef;
  isEpsilon?: boolean;
}

export interface NFAState {
  id: string;
  label: string;
  subLabel?: string;
  isStart: boolean;
  isAccept: boolean;
  isTrap?: boolean;
  priority?: number;
}

export interface NFA {
  type: 'eNFA';
  states: NFAState[];
  transitions: NFATransition[];
  startState: string;
  acceptStates: string[];
  alphabet: string[];
  stateRuleMap?: Record<string, { ruleId: string; priority: number }>;
}

export interface DFATransition {
  from: string;
  to: string;
  symbol: string;
}

export interface DFAState {
  id: string;
  label: string;
  subLabel?: string;
  nfaStates?: string[];
  mergedStates?: string[];
  isStart: boolean;
  isAccept: boolean;
  isTrap: boolean;
  matchedRules?: Array<{ ruleId: string; priority: number }>;
}

export interface DFA {
  type: 'DFA' | 'MinDFA';
  states: DFAState[];
  transitions: DFATransition[];
  startState: string;
  acceptStates: string[];
  alphabet: string[];
  equivClasses?: EquivClass[];
  reductionPct?: number;
}

export interface SimulationStep {
  stepIndex: number;
  charIndex: number;
  symbol: string | null;
  activeStates: string[];
  activeEdges: string[];
  description: string;
}

export interface SimulationResult {
  isAccepted: boolean;
  steps: SimulationStep[];
  path: string[];
}

export class ParseError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(`At position ${position}: ${message}`);
    this.name = 'ParseError';
    this.position = position;
  }
}
