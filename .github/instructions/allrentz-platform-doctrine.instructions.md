---
applyTo: "**"
---

# ALLRENTZ Platform Doctrine

## What ALLRENTZ Is

ALLRENTZ is an industrial equipment rental coordination platform for:
- refineries
- terminals
- turnaround and shutdown projects
- maintenance operations
- industrial jobsites

Primary users: customer procurement teams, rental vendors, operations managers, ALLRENTZ admin/manager staff.

Primary problems solved:
- equipment sourcing speed
- vendor compliance visibility
- rental lifecycle coordination
- workflow accountability across actors

## What ALLRENTZ Must Not Become

- A consumer marketplace or generic SaaS rental app
- A fully automated procurement engine (not at MVP stage, not without human confirmation)
- A system that makes authoritative decisions on behalf of users
- A platform with fake metrics, fake AI claims, or fake operational data
- A system that conceals workflow state from the actors responsible for it

## Operational Trust Principles

- No fake metrics. No inflated vendor counts. No fake availability indicators.
- No misleading AI claims. SmartMatch is a demo/workflow filter, not a production AI engine. [VERIFIED: CLAUDE.md]
- Operational data must reflect verified platform state, not aspirational state.
- Demo and simulation data must never contaminate production operational records. [VERIFIED: is_simulated flag enforced on rental_requests and organizations]
- Trust is earned through accuracy, transparency, and workflow reliability — not UI complexity.

## Authority Ownership

- Operational authority is derived and enforced server-side only. [VERIFIED: rfq-transition Edge Function]
- Authority priority order for RFQ transitions: admin/manager → customer org member → vendor with accepted quote. [VERIFIED]
- The frontend may display, collect input, and surface actions. The frontend may not define operational truth, authorize transitions, or bypass authority checks.
- No frontend call may directly mutate authoritative operational state. [VERIFIED: transition_rfq_status() gated to service_role only]

## Workflow Determinism

- Every operational state change must be traceable to an actor, a source classification, and a timestamp.
- No state change may occur without a corresponding audit event. [VERIFIED: transition_rfq_status() atomically writes audit_events + rfq_operational_status]
- If audit event recording fails, the transition must fail. [VERIFIED: ALLRENTZ_CONSTITUTION.md Event Integrity Rule]
- Status transitions must follow an approved allowlist. Unlisted transitions are rejected at the DB layer. [VERIFIED: transition_rfq_status() allowlist enforcement]

## Industrial Operational Realism

- Vendors may still coordinate via calls, texts, and spreadsheets. The platform must support them, not require they abandon those behaviors.
- Refinery and terminal environments contain real compliance and scheduling friction. Do not design around it.
- Manual override paths must always exist at the admin and operations level.
- Field usability takes priority over technical elegance.
- Low-tech fallback workflows are a feature, not a deficiency.

## AI Philosophy Constraints

- AI is Layer 10 in the ALLRENTZ operational authority order — not Layer 1. [VERIFIED: ALLRENTZ_CONSTITUTION.md]
- AI outputs are never authoritative by default.
- AI may assist workflow decisions. AI may not execute them without explicit human confirmation.
- All AI-assisted actions must be logged with non-authoritative source classification. [DOCTRINE: not yet implemented]
- Real vendor matching from the database has not been built. [VERIFIED: CLAUDE.md]
- Autonomous agents, cross-agent coordination, and predictive procurement AI are explicitly deferred. [VERIFIED: MASTER_PRIORITY_BOARD.md DO NOT BUILD YET]
