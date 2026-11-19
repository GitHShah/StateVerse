# Existing project audit — 17 November 2026

Audit recorded before implementation edits. Original: PatternGuard, a browser-only React 18 / TypeScript / Vite application using Zustand, Tailwind and React Flow. No backend or identity service exists. Source inventory includes engine, doctor, six pages, graph/scanner components, worker bridge, exports and three test suites. Generated dist and installed dependencies are not authored source.

| Category | /10 | Evidence |
|---|---:|---|
| Theoretical correctness | 5 | Thompson and subset construction work on tested examples; minimization is repeated partition refinement, not Hopcroft's work-list algorithm. ASCII sampling omits newline and other symbols; regex elimination has an unrelated fallback. |
| Real-world usefulness | 5 | Useful pattern scanner and lexer; signatures are not proof of attacks or identity. |
| Syllabus coverage | 4 | Strong regular-language coverage; no policy CFG, PDA, TM or decidability lab. |
| Technical implementation | 6 | Typed pure engine, serializable worker data; unsafe synchronous native regex timing and insufficient resource bounds. |
| UI/UX | 6 | Functional dark tabs, graph, tape, tables and exports; dense interface without a coherent end-to-end service. |
| Architecture | 7 | Engine/UI separation reusable; application state and persistence need explicit service contracts. |
| Reliability/testing | 5 | Baseline: 37 tests pass in 3 files. Tests miss identity, resource limits and conversion equivalence edge cases. |
| Improvement opportunity | 9 | Reuse compiler/visualizer; build guarded identity transitions, persistent claims and finite-model verification. |

## Findings

- Scanner restarts at successive offsets; worst-case substring scanning is quadratic, despite linear-time claims. Fixed-DFA whole-string matching is linear.
- Native RegExp calls are synchronous: checking a deadline after execution does not interrupt them. Doctor witnesses also benchmark native patterns synchronously.
- `$` is a literal in the custom parser, unlike the native benchmark's anchor.
- Doctor SCC heuristics and bounded exploration do not establish universal ReDoS safety. Generated code/export correctness is not established for every equivalence class.
- Partition labels can collide; character classes explicitly exclude newline. Numeric subset sorting lacks a stable tie break.
- No authentication, consent, session, scholarship, policy enforcement or storage integrity model.

## Reuse and direction

Preserve all original laboratory source and expose it as the legacy toolkit. Reuse regex parsing, Thompson construction, subset conversion, partition refinement and graph rendering. Keep existing tests. The original scanner is a useful secondary laboratory, but identity workflow validation offers a clearer service scenario and meaningful graph safety properties; no migration is necessary.

## Baseline execution

`npm test`: 37/37 pass. `npm run build` and local Vite startup were initiated during audit; final build/runtime evidence is recorded in TEST_REPORT.md. No source was changed during inspection. Build regenerates disposable dist artifacts only.
