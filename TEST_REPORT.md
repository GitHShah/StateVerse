# Test report — 17 November 2026

## Automated evidence

Baseline: 37 tests passed in 3 suites before implementation. After identity/formal implementation and regression fixes: **114 tests passed in 4 suites** (77 new tests + 37 preserved). `npm run build` passed TypeScript checking and Vite production bundling. Vite reports a nonfatal main-bundle size warning (>500 kB); lazy splitting is a future optimization.

New tests exercise actual IdentityEngine transitions and claim stores: valid authentication, invalid OTP, expiry at the boundary, replay, all five retry limits, consent sequencing, withdrawal, access before verification, logout, session expiry, alternative path, duplicate claims across engine sessions, eligibility outcomes/boundaries, open-service requirement, compiled permissions, forged guard events, malformed/oversized events, invalid identifiers, nonfinite input, failed persistence and malformed stored records.

Formal tests cover safe model, shortest one-event bypass, missing/conflicting/unreachable states, malformed models, policy grammar/derivations/errors, both PDA acceptance modes and mismatch failures, unary TM, accepting/rejecting a^n b^n examples, bounded UNKNOWN, input bounds, Mealy-to-Moore output construction, useful-symbol CFG simplification and bounded PCP.

Regex regressions compare NFA, epsilon-free NFA, DFA and minimized results on representative inputs (including whitespace/newline), GNFA round trips including epsilon/optional/literal operators, textbook four-state minimization and oversized expansions. Representative samples are not exhaustive language equivalence proofs.

## Observed browser walkthrough

Chrome successfully loaded IDShield at http://127.0.0.1:5174 after the local server was started outside the network-restricted sandbox. The initial sandbox server at port 5173 could not be reached; this was an environment socket restriction.

Observed: synthetic identity submission → consent → mock OTP issuance → entering DEMO-OTP-42 → VERIFIED → protected ACCESS → scholarship ACCEPTED (income 120000, score 86) → repeat submission DENY with DUPLICATE_CLAIM. The table retained exactly one accepted synthetic record. These observations are UI evidence, not only unit tests.

Visual inspection identified crowded legacy graph geometry; the identity view now uses a compact original SVG with all states, current outgoing transitions and the latest event. The complete transition table remains available. Submission feedback is repeated beside the application form. Navigation returns to the page top.

## Frontend revision requested during work

The user requested a GTA V-like game appearance. Added an original fictional SVG city map, mission selection/launch controls, map zoom, briefing panels, event-derived HUD counters, horizontal operations navigation, and responsive olive/charcoal/lime styling. No official GTA artwork or external map data is required. Core service and formal algorithms remain unchanged by this visual revision. Final build/UI checks are recorded after inspection.

## Limits of testing

No comprehensive automated browser suite, cross-browser/mobile-device matrix, production security audit or concurrent multi-tab persistence test was performed. Original Doctor native benchmark test is timing-sensitive and does not establish security; its GUI benchmark now uses a terminable worker. Browser localStorage and client state are not trusted security boundaries.

## Final release check — 18 November 2026

Production build passed. All 121 tests passed across 5 suites, including 7 story-mission tests covering every mission, rejected choices, lockout, and isolated policy fault injection. Full graphical movement playtesting remains limited by browser automation availability.

