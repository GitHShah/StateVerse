# Syllabus mapping

Status: **A** application implementation; **L** educational laboratory implementation; **T** theoretical/scoped explanation; **N** not implemented generally. A scoped example does not imply a general algorithm.

| Unit | Concept | Status | Evidence / boundary |
|---|---|---|---|
| 1 | Formal DFA, alphabet, δ, initial/accept states | A/L | identityModel and full table; legacy engine types |
| 1 | NFA, epsilon-NFA, epsilon closure | L | Thompson, subset.ts; zero-epsilon NFA output |
| 1 | Diagrams, tables, state traces | A/L | ProtocolGraph, legacy Visualizer, decision trace |
| 1 | NFA-to-DFA | L | Reachable subset construction |
| 1 | Epsilon elimination | L | extensions.eliminateEpsilon; workbench |
| 1 | DFA minimization | L | Repeated partition refinement; not Hopcroft |
| 1 | Mealy machine | A | Explicit edge outputs |
| 1 | Moore machine / Mealy-to-Moore | L | Destination-output state splitting, INIT convention |
| 1 | Moore-to-Mealy | T | Put destination state's output on each incoming transition; no separate converter |
| 2 | Regex parser, Thompson, regex-to-NFA-to-DFA | L | Preserved compiler, ASCII subset |
| 2 | DFA-to-regex | L | Corrected bounded GNFA elimination |
| 2 | Right-linear grammar conversions | L/T | DFA-to-grammar generated; reverse construction explained, not a general parser |
| 2 | Equivalence demonstrations | L | Workbench input comparison and regression tests; representative testing is not a proof of arbitrary implementation equivalence |
| 2 | Closure: union, concatenation, star | L | Thompson constructions |
| 2 | Closure: intersection/complement | T | Product and accepting-set flip explained; no interactive general operators |
| 2 | Pumping lemma | T | a^n b^n nonregularity proof in Theory |
| 3 | Security-policy CFG and compilation | A/L | Typed policy rules enforce portal permissions |
| 3 | Parse trees, leftmost/rightmost derivations | L | Actual parser tree and frontier expansion |
| 3 | Ambiguity/unambiguous grammar | T | Expression example and delimited DSL explanation |
| 3 | CFG simplification | L | Generating/reachable-symbol fixed points, scoped demo |
| 3 | General epsilon/unit elimination | N | Not claimed |
| 3 | CNF/GNF conversion | T | Constructive scoped a^n b^n normal forms; arbitrary input conversion N |
| 4 | PDA push/pop/nested scopes | L | runPDA and step visualization |
| 4 | Empty-stack / final-state acceptance | L | Both modes with explicit end marker |
| 4 | CFG-to-PDA equivalence | T | Balanced-scope construction and induction argument; general compiler N |
| 4 | TM tape/head/states/rules/halting/budget | L | runTM, sparse tape and configurations |
| 4 | Unary arithmetic / nonregular language | L | Unary successor and a^n b^n |
| 4 | Multitape/multitrack/nondeterministic/encoded TM | T | Equal recognition power and encoding explained; general simulators N |
| 5 | Recursive / recursively enumerable | T | Decider vs recognizer explanation |
| 5 | Chomsky hierarchy | T | Language-machine inclusion view |
| 5 | Context-sensitive / LBA | T | Linear tape bound and decidability explanation; LBA simulator N |
| 5 | Universal TM | T | Encoded interpreter concept; UTM interpreter N |
| 5 | Halting Problem / undecidability | T/L | Theory plus UNKNOWN bounded TM demonstration |
| 5 | PCP | L/T | Bounded BFS up to depth 8; general undecidability explained |
| Cross-unit | Finite policy safety verification | A/L | Product monitor BFS, shortest counterexample and diagnostics |

Primary implemented application contributions are finite protocol enforcement, Mealy outputs, executable policy clauses and ordinary guarded/persistent service logic. PDA and TM are intentionally educational extensions, not identity-authentication mechanisms.

## Theory references

Course topic organization and further study: [MIT 18.404J lecture notes](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/lecture-notes/) and [MIT reading list](https://ocw.mit.edu/courses/18-404j-theory-of-computation-fall-2020/pages/readings/). These cover automata, CFG/PDA correspondence, Turing machines and undecidability. The software's implemented scope is determined by the mapping above, not by the reference course's full coverage.
