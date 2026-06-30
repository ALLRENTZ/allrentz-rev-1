---
title: Authority-First Build Loop
domain: engineering
status: draft
authority: subordinate to /ALLRENTZ_CONSTITUTION.md
source: derived from /ALLRENTZ_CONSTITUTION.md (Operational Authority Order; Root Before Branches; Scope Discipline)
last_reviewed: 2026-06-29
---

# Authority-First Build Loop

The practical engineering loop for applying the Constitution day to day. This file is a **how-to**; the doctrine it enforces is owned by `/ALLRENTZ_CONSTITUTION.md`. If the two ever conflict, the Constitution wins and this file is corrected.

## The order (do not skip layers)

Per the Constitution's Operational Authority Order, build foundation before branches:

1. Access Authority
2. Schema / Migration Authority
3. Event Authority
4. Verification & Testing Authority — see `p7-verify-doctrine.md`
5. State Authority
6. Workflow Ownership Authority
7. Compliance Authority
8. Commercial Quote Authority
9. Operational Coordination
10. Intelligence / AI — see `ai-governance.md`

## The loop, per change

1. **Locate the layer.** Identify which authority layer the change touches. If it touches a lower layer that is unstable, stop and fix that first (Root Before Branches).
2. **Confirm preconditions** (Scope Discipline Rule): current layer stable, auditable, authoritative; migration baseline stable; event integrity exists; no demo contamination risk; backend authority preserved.
3. **Build server-side first.** Frontend may display, collect, suggest — never define operational truth (Backend Authority Rule).
4. **Record the event.** No authoritative state change without an authoritative event (Event Integrity Rule).
5. **Verify against Definition of Done** before marking complete — see `p7-verify-doctrine.md` for the full verification checklist, VFA requirement, and runtime action classification rules.
6. **Update `/MASTER_PRIORITY_BOARD.md`** with the commit hash.

## Anti-patterns this loop prevents

- Patching a UI symptom over a backend authority gap
- Stacking new architecture on unstable migrations
- Letting AI or demo data write authoritative state
