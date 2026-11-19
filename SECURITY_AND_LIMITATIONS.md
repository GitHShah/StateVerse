# Security and limitations

This is an independent educational simulation. It must not be used as an authentication service, real benefit decision system, Aadhaar client or fraud-prevention guarantee. Profiles, credentials and eligibility are fictional. The visible fixed token DEMO-OTP-42 is intentionally not secret. No crypto, SMS, biometrics or official e-KYC checks occur.

## Enforced teaching rules

Consent and verified active sessions precede access/submission. Failures consume a finite retry budget; re-request cannot reset it. Used/expired OTPs are rejected. Consent withdrawal/logout invalidate session trust. Claim uniqueness is checked by identity+service in the current store. Every outcome records an explanation. Malformed and oversized input is rejected at engine boundaries. Storage failure does not report successful submission.

## Boundaries

- Client code and browser storage are user-editable. There is no trusted server, transactional database, rate limiting across clients, cryptographic authentication or tamper-resistant audit.
- BrowserClaims is persistent per browser origin but not atomic across tabs. Clear/rewrite localStorage bypasses duplicate tracking. Claims of all statuses block a second submission in the demo.
- Session state and traces are in memory; page reload starts a new session. Retry lockout is per demo session, not per person across sessions.
- Runtime expiry is checked on credential use/protected actions. UI does not continuously tick a state into EXPIRED when idle.
- Bank/exam/public-service presets share verification and application collection, but specialized eligibility remains manual review.
- Policy JSON is analyzed separately; it does not replace the runtime protocol. DSL policies add restrictions; mandatory guards remain enabled.
- Formal checker guarantees are restricted to finite model assumptions. It does not verify all JavaScript, browser behavior, database races or real identity evidence.
- ASCII regex subset: no backreferences/lookaround; $ and ^ are literal in the legacy parser. Compilation/expression limits are not universal resource guarantees. Legacy Doctor uses heuristics, not certified ReDoS analysis. Legacy graph/code exports have not been certified for every alphabet or language.
- General CFG parsing, arbitrary CNF/GNF conversion, general grammar-to-PDA compiler, LBA, universal/multitape/nondeterministic TM interpreters are not implemented. Relevant theory and scoped examples are provided.
- The app is a local SPA, not a hardened deployed service. A production system would require a trusted API, transactional unique constraints, credential provider, consent policy, secure session lifecycle, threat modeling and broader testing.
