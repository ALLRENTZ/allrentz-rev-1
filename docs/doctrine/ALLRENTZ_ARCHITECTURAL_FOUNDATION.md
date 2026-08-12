---
title: ALLRENTZ Architectural Foundation
domain: doctrine
lifecycle_status: active
governance_state: approved
authorized_scope: governing product and engineering doctrine; no runtime or contractual rule authorization
authorization_reference: Patrick McGriff, bounded documentation-only governing-product integration, 2026-08-12
authority: subordinate to /ALLRENTZ_CONSTITUTION.md; controls product and engineering implementation decisions
related: /ALLRENTZ_CONSTITUTION.md, docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md, docs/product/rental-lifecycle-framework.md, docs/engineering/stop-rent-authority-implementation-contract.md, docs/engineering/authority-first-loop.md, docs/engineering/ai-governance.md
last_reviewed: 2026-08-12
---

# ALLRENTZ Architectural Foundation

This doctrine is the non-negotiable architectural foundation for ALLRENTZ. It operationalizes the Constitution without replacing it. If the two conflict, `/ALLRENTZ_CONSTITUTION.md` wins and this document must be corrected.

ALLRENTZ is the governed execution and authority layer for industrial rental operations. It is not merely a marketplace, listing platform, quote inbox, generic workflow tool, or frontend-led application.

ALLRENTZ governs not only workflow, but also the **meaning, source, quality, relationships, authority, state, evidence, version, and permitted use** of every material business object. It exists to create trusted operational understanding, controlled execution, and accountability throughout the industrial rental lifecycle.

## Governing product role

**APPROVED DOCTRINE** — ALLRENTZ is the customer-centered, multi-vendor governance and execution platform for industrial rental operations. The customer controls one operating workspace across fragmented rental supply; vendors participate through governed relationships rather than isolated portals or informal message chains. Accepted terms, authorized actors, verified evidence, and deterministic backend commands—not market convention, a screen label, or a party's preference—control consequential authority.

The governing product promise is:

> Source the controlling facts, determine authority, execute the authorized action, reconcile the commercial result, and improve the next rental without weakening the evidence chain.

This promise is implemented through five control pillars:

1. **Source** — preserve accepted terms, operational facts, evidence, provenance, versions, and uncertainty.
2. **Determine** — apply published, scoped, deterministic rules to authorized objects and fail closed when coverage or evidence is incomplete.
3. **Execute** — perform the permitted state change through one atomic backend command and immutable audit event.
4. **Reconcile** — compare operational determinations, custody and condition evidence, invoices, credits, disputes, and closeout outcomes without rewriting history.
5. **Improve** — measure governed outcomes and use verified patterns to improve sourcing, terms, readiness, logistics, and vendor performance.

The pillars are a control model, not permission to claim that every supporting object or workflow is already implemented. Current implementation boundaries are recorded separately in `docs/engineering/stop-rent-authority-implementation-contract.md`.

## Nine rental clock-control principles

The following are **APPROVED DOCTRINE** and required target architecture. Approval
of these principles does not represent their target objects or states as already
implemented.

1. **Separate state tracks** — Billing, request, rule coverage, vendor response,
   pickup, custody, condition, compliance, reconciliation, dispute, and correction
   remain independently governed. No single status may silently control all tracks.
2. **Immutable material authority history** — Material events, evidence,
   evaluation attempts, determinations, disputes, and corrections are append-only
   or immutably versioned. Ordinary workflows never overwrite or delete what
   originally occurred. Security, privacy, and legally required disposition use a
   governed redaction or tombstone process that preserves an auditable record
   without retaining prohibited content.
3. **Contract traceability** — Every financial rule and determination traces to
   governed source bytes or reference, digest, document and version, stable clause
   locator and canonical excerpt, amendments, precedence result, applicable object
   scope, approved rule/evaluator versions, reviewer authority, and supporting
   evidence.
4. **Distinct fail-closed outcomes** — Rule coverage, evaluation, determination,
   and dispute are separate tracks. Rule coverage may be covered, unknown, or
   blocked; an evaluation attempt may complete or block; an authoritative
   determination exists only after successful evaluation; and a dispute is
   recorded independently. The system never collapses these meanings into one
   ambiguous status.
5. **Append-only corrections** — A governed correction creates a new superseding
   record with reason, evidence, approval, and lineage. The original authoritative
   record remains preserved and visible to authorized reviewers.
6. **Pickup and custody separation** — Pickup request, scheduling, attempt,
   physical pickup, custody transfer, yard receipt, condition inspection, and
   billing cessation are distinct facts. None determines another without the
   accepted contractual rule and canonical backend action.
7. **AI without authority** — AI may extract, classify, compare, flag, and explain
   candidate information. It cannot publish rules, establish scope, choose a
   financial timestamp, change a determination, or resolve a dispute.
8. **Governed shadow mode** — Every new financial evaluator first runs in a
   non-authoritative comparison mode against a governed reference set approved by
   the required product, contract, finance, and legal authorities. Shadow execution
   cannot mutate lifecycle state, determinations, invoices, accounting records, or
   financial outcomes. Production activation requires separately approved release
   thresholds, negative tests, drift controls, monitoring, rollback criteria, and
   evaluator-version lineage.
9. **Invoice reconciliation** — Every final invoice charge within the governed
   scope is compared with accepted terms, applicable rule, system determination,
   rental scope, rate terms, evidence, and supported exceptions. Rental accrual,
   tax, transport, damage, cleaning, missing-component, and other charge families
   remain separately classified. A reconciliation result cannot rewrite the
   determination that it consumes.

### Approval boundary

This doctrine approves the required behavior and design direction only. It does
not approve a specific contract interpretation, a universal stop-rent trigger, a
new `demobilizing → off_rent` pathway, granular rental-object activation, a
financial evaluator, a billing calculation, production billing automation, or a
legal interpretation. It cannot expand the existing guarded database mechanism.

The following remain blocked until supported by governed evidence and separately
approved authority:

- **contractual rules** — the controlling accepted documents, clause precedence,
  applicability, exceptions, and rule publisher;
- **granular object authority** — rental order, line, serialized unit, quantity
  allocation, kit instance, and component identities and relationships;
- **evaluator activation** — deterministic specification, governed reference set,
  verification thresholds, release decision, monitoring, and rollback;
- **billing calculations** — rate source, period, cutoff, rounding, time zone,
  minimums, taxes/fees, exception treatment, and reproducible examples; and
- **legal interpretations** — enforceability, jurisdiction, notice, evidence,
  amendments, disputes, retention, and legally controlling meaning.

When an applicable published rule is absent, rule coverage remains `UNKNOWN`, the
evaluation attempt must fail closed as blocked, and no determination or lifecycle
transition may occur.

---

## Governing Execution Rule

Every material workflow must remain traceable through:

> **Object → Authorized Action → State Change → Audit Event → Next Step**

A screen, database row, or successful request is not proof that a valid business action occurred. The object must have defined meaning, trustworthy data, scoped authority, a valid canonical state, backend enforcement, evidence, and an owned next action.

---

## Mandatory Evaluation Contract

Every material feature and implementation decision must answer all of the following:

1. **Business object** — What real business object is being controlled?
2. **Data definition and authoritative source** — Which fields define it, which fields are required, and what source is authoritative?
3. **Validation and normalization** — Is the data complete, accurate, current, normalized, and internally consistent?
4. **Object relationships** — How does it relate to the customer, vendor, organization, RFQ, RFQ item, qualification, invitation, quote, approval, order, rental, document, invoice, or performance record?
5. **Person and organization authority** — Which authenticated person and tenant organization may view or act on this specific object, and through which qualifying relationship?
6. **Canonical state** — What is the single authoritative current state?
7. **State-permitted actions** — Which actions are permitted in that state, and by whom?
8. **Backend-controlled transition** — What valid state change occurs, and where is it enforced authoritatively?
9. **Required evidence** — Which documents, signatures, approvals, timestamps, or operational proof support the action?
10. **Audit event** — Who acted, for which organization, when, why, what changed, and what was the result?
11. **Next authorized action** — What happens next, who owns it, and which prerequisites and blocking conditions apply?

If any answer is missing or ambiguous, the implementation is incomplete. Uncertainty involving authority, tenant scope, state, evidence, or data ownership must block consequential behavior until it is resolved.

---

## Control Priority and Implementation Sequence

The control priority is:

> **Authority stack first → Data integrity second → Controlled workflow third → AI assistance afterward**

“Authority stack first” means authority has the highest control priority. Defining the business object, its data contract, and its relationships is a prerequisite to evaluating that authority correctly.

The practical implementation sequence is:

> **Business meaning → Data contract → Authority → Validation → Canonical state → Atomic backend action → Evidence and audit → Role-scoped interface → AI assistance**

Do not build a frontend action before the underlying object, authority, validation, state, and audit model are understood. AI may assist with matching, normalization, comparison, extraction, recommendations, and summaries only after these foundations are reliable. AI output may never create authority or operational truth by itself.

### Restricted AI role

**APPROVED DOCTRINE** — AI may extract candidate clauses, classify documents, map evidence, identify discrepancies, draft explanations, and recommend review priorities. Every AI-produced value remains an untrusted proposal carrying source references, model/version provenance, confidence or uncertainty, and a required human or deterministic validation path.

AI must not:

- publish or activate a contractual rule;
- accept terms or establish object scope;
- select an authoritative stop-rent or billing timestamp;
- resolve an ambiguity, dispute, exception, custody event, or financial adjustment;
- create a hidden override or substitute for organization, relationship, RLS, approval, evidence, or backend-command authority; or
- convert a research finding or product hypothesis into operational truth.

If deterministic authority cannot be established without AI judgment, the result is `UNKNOWN` or blocked—not an inferred action.

---

## Non-Negotiable Execution Guarantees

### 1. Deny by default and fail closed

Missing, unresolved, stale, conflicting, expired, or unverified authority must block the action. A missing check must never become permission.

### 2. Tenant and relationship scope

A role alone never grants authority. Authorization must include the authenticated person, tenant organization, active ownership or membership, qualifying invitation or qualification relationship, object identity, and simulation scope where applicable.

### 3. One canonical mutation path

Every material action must use one approved backend command, function, or transaction boundary. Direct client table writes, alternate frontend mutation paths, and hidden fallbacks are prohibited for authoritative actions.

### 4. Atomic execution

The business mutation, state transition, evidence linkage, and audit event must commit together or roll back together. Partial authoritative execution is a failure.

### 5. Concurrency and replay safety

Backend actions must reject stale state, duplicate submissions, conflicting concurrent actions, and unauthorized retries. Commands must be idempotent where replay is expected or operationally plausible.

### 6. Data provenance and versioning

Material data must retain its source, capture time, effective time, verification status, and version where applicable. Submitted RFQs, quotes, approvals, and commercial terms must not be silently rewritten.

### 7. Explicit uncertainty

Missing, unknown, unverified, conflicting, expired, and not-applicable are distinct states. The system must preserve those distinctions and must never fabricate certainty.

### 8. Immutable auditability and correlation

Material audit events must identify the actor, actor organization, object, prior state, resulting state, reason, source, timestamp, outcome, and correlation ID. Audit history must not be alterable through ordinary client workflows.

### 9. Structured denial reasons

Rejected material actions must return deterministic, non-sensitive reason codes. Denials must be diagnosable without leaking credentials, cross-tenant data, or protected object details.

### 10. Executable positive and negative verification

Every material authority, validation, state-transition, tenant-isolation, and replay rule requires executable verification. Tests must prove both the permitted path and the forbidden path; successful-path tests alone are insufficient.

### 11. Untrusted boundaries

User input, vendor input, imported data, external integrations, uploaded documents, extracted values, and AI output remain untrusted until validated against the object contract and authority model.

### 12. Owned next action

A next step must identify its owner, triggering state, prerequisites, and blocking conditions. Merely displaying a button or status is not workflow control.

---

## Data Trust Standard

Database rows are not trustworthy merely because they exist. Authoritative data requires defined business meaning, provenance, validation, tenant scope, relationships, permitted uses, and an applicable version.

ALLRENTZ must distinguish between:

- displaying information;
- understanding what the information means;
- validating whether it is trustworthy;
- determining who may use it; and
- controlling what may happen because of it.

Unverified, incomplete, stale, duplicated, conflicting, or ambiguous information must not be treated as authoritative fact. Validation must never erase meaningful uncertainty or provenance.

---

## Acceptance Standard

A material feature is not complete until repository evidence demonstrates:

- a defined business object and data contract;
- an authoritative source and validation rules;
- explicit tenant and relationship-scoped authority;
- canonical state and valid transitions;
- one backend-authoritative, atomic mutation path;
- concurrency and replay handling appropriate to the action;
- evidence linkage and immutable correlated audit history;
- structured safe denials;
- positive and negative authority, isolation, validation, and state tests; and
- a clearly owned next authorized action.

## Governed product outcomes

**APPROVED DOCTRINE** — Product success must be measured by controlled outcomes, not by clicks, page views, AI usage, or workflow volume alone. Governed metrics must retain the object scope, source events, calculation version, comparison period, exclusion rules, and uncertainty needed to reproduce the result.

The target outcome families are:

- time from authorized need to comparable quote coverage;
- quote coverage and comparison completeness;
- approval and dispatch cycle time;
- rentals with complete accepted-term, evidence, and determination provenance;
- requested-stop-to-determination and determination-to-pickup duration, with delay attribution kept separate from billing authority;
- invoice lines automatically reconciled, exception rate, dispute cycle time, and verified credits;
- vendor acknowledgment, pickup, evidence, invoice-accuracy, and resolution performance; and
- prevented or corrected unsupported accrual, reported only when a reproducible counterfactual and approved accounting definition exist.

**PRODUCT HYPOTHESIS** — These outcome families can create compounding customer value and defensibility by connecting commercial authority to operational execution across vendors.

**UNKNOWN** — Baselines, targets, formulas, owners, materiality thresholds, and financial attribution rules remain unapproved until the metric catalog and its source contracts are governed. Marketing claims such as “savings,” “leakage prevented,” or “billing eliminated” must not be published from estimates or AI classifications.

The final governing standard is:

> **ALLRENTZ must control the meaning, source, quality, relationships, authority, state, evidence, version, and permitted use of every material business object. Every consequential action must be tenant-scoped, fail-closed, backend-authoritative, atomic, concurrency-safe, auditable, and followed by a clearly owned next authorized action.**
