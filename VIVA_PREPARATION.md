# Viva preparation

**What problem does IDShield solve?** It detects violations of explicitly defined authentication ordering and application policies in a synthetic identity service.

**Where is the actual DFA?** identityModel creates Q, Σ, START, {ACCESS} and one δ edge per state/event. IdentityEngine consumes guard-classified events using that relation.

**Why Mealy?** An output depends on state and event: the same state may deny access while allowing consent. A Moore conversion splits states by incoming output and introduces INIT.

**Is OTP comparison a DFA operation?** No. A guard compares the synthetic credential, checks its timestamp/use bit and emits a finite outcome. The DFA enforces sequencing and bounded attempt state.

**How do retries remain finite?** For fixed k, OTP_0 through OTP_(k-1) plus LOCKED suffice. Configuring k constructs a new finite machine.

**Why not use a DFA for duplicate records?** An ordinary finite automaton cannot remember arbitrary unbounded identifiers. A persistent lookup supplies a duplicate/nonduplicate result.

**How is a shortest violation found?** BFS on protocol state × three boolean monitors; unit-cost edges guarantee shortest trace length.

**Are dead states bugs?** Not necessarily. LOCKED or LOGGED_OUT may intentionally have no accepting continuation. The report identifies structure; interpretation depends on policy.

**Is minimization Hopcroft?** No. The inherited implementation performs repeated partition refinement. The original naming was incorrect; no Hopcroft complexity is claimed.

**How do NFA and DFA agree?** A DFA subset state represents all NFA states reachable after the consumed prefix, including epsilon closure. Acceptance is subset intersection with F.

**What does the CFG recognize?** A deliberately small POLICY grammar, not arbitrary CFGs. Semantic checks restrict names of requirements/actions.

**Why PDA?** Arbitrarily nested scope depth requires unbounded stack memory in the mathematical model. A bounded UI input is an implementation resource limit.

**Does the TM prove a program loops?** No. It reports observed acceptance/rejection, otherwise UNKNOWN at the chosen bound. General halting is undecidable.

**Which topics are only theoretical?** General LBA/UTM/multitape/multitrack/nondeterministic TM behavior, general undecidability, some closure constructions and pumping proofs. See SYLLABUS_MAPPING.md for precise status.

**Is it production secure?** No. Fixed mock credentials, editable client storage, local session resets and absence of a trusted backend make it a teaching simulator.
