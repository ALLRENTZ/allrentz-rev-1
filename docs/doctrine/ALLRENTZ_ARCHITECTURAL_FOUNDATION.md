---
title: ALLRENTZ Architectural Foundation
domain: doctrine
status: active
authority: subordinate to /ALLRENTZ_CONSTITUTION.md; controls product and engineering implementation decisions
related: /ALLRENTZ_CONSTITUTION.md, docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md, docs/engineering/authority-first-loop.md, docs/engineering/ai-governance.md
last_reviewed: 2026-07-21
---

# ALLRENTZ Architectural Foundation

This doctrine is the non-negotiable architectural foundation for ALLRENTZ. It operationalizes the Constitution without replacing it. If the two conflict, `/ALLRENTZ_CONSTITUTION.md` wins and this document must be corrected.

ALLRENTZ is the governed execution and authority layer for industrial rental operations. It is not merely a marketplace, listing platform, quote inbox, generic workflow tool, or frontend-led application.

ALLRENTZ governs not only workflow, but also the **meaning, source, quality, relationships, authority, state, evidence, version, and permitted use** of every material business object. It exists to create trusted operational understanding, controlled execution, and accountability throughout the industrial rental lifecycle.

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

The final governing standard is:

> **ALLRENTZ must control the meaning, source, quality, relationships, authority, state, evidence, version, and permitted use of every material business object. Every consequential action must be tenant-scoped, fail-closed, backend-authoritative, atomic, concurrency-safe, auditable, and followed by a clearly owned next authorized action.**
