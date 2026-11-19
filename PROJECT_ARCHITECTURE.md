# Architecture

React/TypeScript/Vite are retained. No migration, backend, network identity integration or cryptography is required for a synthetic browser simulator.

```text
React pages (src/App.tsx)
  -> IdentityEngine.dispatch(Event)
     -> input validation / credential & expiry guards
     -> explicit total identityModel transition relation
     -> Mealy decision + explanatory audit entry
     -> ClaimStore (BrowserClaims or isolated MemoryClaims)
  -> formal.ts (policy parser, product BFS, PDA, TM)
  -> extensions.ts (epsilon elimination, grammar, Moore, bounded PCP)
  -> preserved engine / LegacyApp / worker bridge
```

IdentityEngine owns protocol/session state. Its clock and ClaimStore are injected for deterministic tests. Credential checking classifies VERIFY into GOOD/BAD; callers cannot forge these symbols. Each protected event rechecks consent, finite protocol state, expiry and compiled permissions. SUBMIT_APPLICATION additionally requires opened ACCESS state, bounded eligibility values and a successful duplicate-checked write.

BrowserClaims stores only synthetic claim records under idshield.claims.v1. Read/parse/write errors fail closed on submission. Persistence is local and not an atomic multi-tab database. Attack scripts use MemoryClaims and dispatch ordinary events; clock-advance script steps alter the injected clock, not a predetermined outcome.

Policy Studio JSON edits affect the analysis model only. Applying policy source changes the current portal engine's permitted actions/requirements. Mandatory application guards cannot be disabled through the DSL. Reset creates a new engine and default policy; normal portal claims remain. Moving into/out of Attack Lab deliberately creates a separate session.

The UI shows all denied operations rather than disabling every out-of-order action, enabling defensive demonstrations. The graph displays state-changing edges; the complete table includes all self-loops. Current state, last edge, output and event trace derive from engine state.

The original regex core is separate from UI. ASCII is the documented supported alphabet. Worker benchmark can terminate expensive native regex execution. Legacy Doctor remains explicitly heuristic.
