# Formal models

## Identity protocol

For retry limit k in {1,...,5}, Q = {START, IDENTIFIED, CONSENTED, OTP_0,...,OTP_(k-1), VERIFIED, ACCESS, LOCKED, REVOKED, LOGGED_OUT, EXPIRED}. Initial state START; accepting set {ACCESS}. Alphabet = {SELECT, CONSENT, REQUEST, GOOD, BAD, ALTERNATIVE, ACCESS, WITHDRAW, LOGOUT, EXPIRE}.

`identityModel(k)` constructs exactly one edge per Q × alphabet pair. Unpermitted actions self-loop with DENY (or REQUIRE_VERIFICATION for access). BAD advances OTP_i to OTP_(i+1), with the last failure entering LOCKED. GOOD and the allowed ALTERNATIVE enter VERIFIED; ACCESS then enters the accepting state. Revocation/logout/expiry leave trusted states. The runtime is a guarded Mealy-style transducer: λ returns ALLOW, DENY, RETRY, LOCK or REQUIRE_VERIFICATION. The DFA accepts sequences ending in service-access state; an allowed intermediate action need not be DFA acceptance.

The external event VERIFY is classified into GOOD/BAD by a mock credential service. OTP validity is abstracted as absent/live/expired/used; sessions as inactive/active/expired. Timestamps are not finite-state arithmetic. EXPIRE is trusted guard input, not an accepted public action. The graph is a protocol abstraction, not the entire application state space.

## Safety product

Product nodes (q,c,v,s) pair model state with consent, verification and session booleans. Successful CONSENT sets c. Successful GOOD/ALTERNATIVE sets v,s. WITHDRAW/LOGOUT clear trust; EXPIRE clears v,s. Any ALLOW access or accepting destination without all three flags violates the property. BFS explores unit-cost edges, giving a shortest violating event trace. The model assumes guard outcomes are sound and revocation events are faithfully supplied. The checker cannot establish credential authenticity, storage integrity or arbitrary software security.

## Policy CFG

Policy → POLICY Name { Statements }
Statements → Statement Statements | ε
Statement → REQUIRE Requirement ; | ALLOW Action ;
Requirement → CONSENT | IDENTITY_VERIFIED | SESSION_ACTIVE
Action → ACCESS | SUBMIT_APPLICATION

Names are lexical identifiers. The parser is specialized recursive structure recognition, with full token coverage and bounded source length. Duplicate/unknown clauses are semantic errors. Tree expansion yields actual leftmost/rightmost derivations. Empty clause lists are syntactically valid but grant no access.

## PDA

Input symbols are BEGIN_SESSION, END_SESSION, BEGIN_VERIFICATION, END_VERIFICATION. Stack alphabet {SESSION, VERIFICATION, bottom}. Push on BEGIN; matching pop on END; mismatch rejects. The end marker is accepted only with the bottom marker remaining, then it is removed. Final-state mode additionally enters accept. Both accept the same balanced two-bracket language, including epsilon. This models nesting, not identity evidence.

## TM

Each program has start q0, explicit (state,read) → (next,write,direction) rules, blank _, and accept/reject halts. Missing rules reject. The sparse two-way tape is copied for each displayed configuration. Unary successor writes one additional 1. The a^n b^n machine marks each a with X and matching b with Y, then checks that only Y remains. Rejection and budget exhaustion are distinct. n=0 is accepted. The looping program illustrates inconclusive bounded execution.
