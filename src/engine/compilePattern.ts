import { minimizeDFA } from './hopcroft';
import { parseRegex } from './parser';
import { buildSubsetDFA } from './subset';
import { buildThompsonNFA } from './thompson';

export function compilePattern(pattern: string) {
  const { ast, postfix } = parseRegex(pattern);
  const nfa = buildThompsonNFA(ast);
  const dfa = buildSubsetDFA(nfa);
  return { ast, postfix, nfa, dfa, minimal: minimizeDFA(dfa) };
}
