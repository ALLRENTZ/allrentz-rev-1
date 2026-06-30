# ALLRENTZ Operational Constitution

Version: 1.0
Status: Active
Purpose: Root operational governance for ALLRENTZ

---

# Core Principle

ALLRENTZ is an operational infrastructure platform, not a UI-first application.

The platform must prioritize:

1. operational truth
2. authority systems
3. workflow enforcement
4. auditability
5. compliance integrity
6. schema stability
7. backend authority
8. operational trust

before:
- feature expansion
- dashboard complexity
- speculative AI
- automation layers
- UI polish

---

# Root Before Branches

Do not patch symptoms.

Fix:
- authority boundaries
- schema integrity
- event integrity
- workflow integrity
- state enforcement
- compliance verification
- migration stability

before building additional layers.

No feature may bypass foundational operational authority.

---

# Operational Authority Order

ALLRENTZ must be built in this order:

1. Access Authority
2. Schema/Migration Authority
3. Event Authority
4. Verification & Testing Authority
5. State Authority
6. Workflow Ownership Authority
7. Compliance Authority
8. Commercial Quote Authority
9. Operational Coordination
10. Intelligence / AI

AI is Layer 10, not Layer 1.

---

# Backend Authority Rule

The frontend may:
- display
- collect input
- suggest actions

The frontend may NOT:
- define operational truth
- authoritatively transition workflow state
- finalize operational records
- bypass validation
- assign compliance approval

Operational authority belongs server-side.

---

# Event Integrity Rule

Authoritative operations require authoritative event recording.

If authoritative event recording fails:
the operation must fail.

No authoritative state change may occur without an authoritative event.

---

# Operational Reason Code Doctrine

Future operational transitions should evolve toward structured reason classification:
- a mandatory `reason_code` (enum) identifying the operational cause
- an optional `reason_detail` (text) for free-form context

Freeform `reason` text alone is insufficient for:
- deterministic operational semantics
- operational memory and replay
- audit intelligence and dispute analysis
- workflow analytics
- compliance traceability
- future AI-assisted orchestration

Do NOT implement reason codes until the workflow state machine and audit schema are stable.
When the time comes, reason codes belong at the DB layer first, enforced in `transition_rfq_status()`.

---

# Demo Isolation Rule

Simulation/demo data must never:
- pollute operational records
- appear authoritative
- affect reporting
- affect SmartMatch decisions
- affect operational metrics
- influence real workflows

All simulated records must be explicitly marked:
is_simulated = true

---

# AI Governance Rule

AI outputs are never authoritative by default.

AI-generated:
- recommendations
- SmartMatch suggestions
- workflow proposals
- operational insights

must pass through authoritative workflow validation before becoming operational truth.

AI may assist operations.
AI may not define operational truth.

All AI-assisted actions must be logged as non-authoritative events.

---

# Migration Safety Rule

No schema work may proceed until:
- migration baseline is verified
- schema drift is understood
- authoritative schema state is confirmed

Never stack new architecture on unstable migrations.

---

# Failure & Recovery Rule

Every critical operational workflow must define:
- failure behavior
- rollback behavior
- retry behavior
- partial completion handling
- operational recovery ownership

No workflow is production-safe until recovery paths are defined.

---

# Formal Workflow Safety and Advanced Verification Doctrine

Critical workflows must have explicit state-transition contracts defining allowed states, allowed transitions, forbidden transitions, required actor authority, required database mutations, required audit events, required tests, and rollback considerations. Critical workflows include: RFQ lifecycle, vendor quote submission, customer approval, dispatch, completion, invoicing, payment status, audit log creation, membership verification, and admin override.

Operational authority must never be inferred from UI behavior. Database state, RLS policies, Edge Function contracts, and audit logs are authoritative. UI behavior and AI inference are evidence only — never authority.

Every production blocker, authority failure, RLS drift, migration drift, audit-event failure, CORS or Edge Function contract failure, bad assumption that affected implementation, or failure requiring human approval must produce a Verification Failure Artifact before correction is applied.

Causal memory must be file-based before any graph database is introduced. Each causal note records cause, effect, evidence, impacted workflow, related files, failure class, test added, prevention rule, last verified date, and confidence level.

Meta-improvement of verification specs, failure templates, test coverage strategy, and Claude instructions is allowed only as a proposal requiring human approval. Claude must not automatically rewrite or enforce production workflow authority, security rules, RLS policy, payment logic, migration policy, CI gates, compliance behavior, or customer/vendor permission boundaries.

Uncertainty in authority, RLS behavior, workflow state, compliance impact, payment impact, audit behavior, production risk, data ownership, or customer/vendor boundary blocks implementation until evidence is confirmed.

See `docs/engineering/p7-verify-doctrine.md` for operational schemas, artifact templates, workflow contract definitions, and production-grade agent safety rules.

---

# Simplicity Rule

Prefer:
- explicit systems
- traceable systems
- enforceable systems
- boring systems
- auditable systems

Avoid:
- premature abstractions
- speculative architecture
- unnecessary complexity
- distributed coordination too early
- architecture theater

---

# Scope Discipline Rule

Before building anything new, verify:
- current layer is stable
- current layer is auditable
- current layer is authoritative
- migration baseline is stable
- event integrity exists
- no demo contamination risk exists
- backend authority is preserved

If those conditions are not met:
do not expand scope.

---

# Definition of Done

A change is not complete unless:
- migrations apply cleanly
- build passes
- operational authority is preserved
- auditability is preserved
- no demo contamination is introduced
- no RLS regression is introduced
- acceptance criteria are validated

---

# Protected Operational Zones

The following systems require heightened review and caution:

- authentication
- RLS policies
- migrations
- workflow state machines
- compliance systems
- billing systems
- audit systems
- backend authority enforcement

Changes affecting these areas must prioritize operational integrity over implementation speed.

---

# Failure Prevention Principle

Operational trust is more important than feature velocity.

ALLRENTZ must favor:
- correctness
- traceability
- recoverability
- enforceability

over:
- rapid expansion
- speculative automation
- UI complexity
- premature intelligence layers

The foundation must remain stable before scaling upward.
