---
title: P7 Verify Doctrine — Formal Workflow Safety and Advanced Verification
domain: engineering
status: draft
authority: subordinate to /ALLRENTZ_CONSTITUTION.md
source: derives from Constitution "Formal Workflow Safety and Advanced Verification Doctrine" (authority layer 4 — Verification & Testing Authority)
last_reviewed: 2026-06-29
---

# P7 Verify Doctrine

**P7 = P7-VERIFY, the reusable production-blocker verification harness workstream under Priority 2 Operational Stabilization.**

This file is the operational expansion of the Constitution's **Formal Workflow Safety and Advanced Verification Doctrine** section. Doctrine is owned by `/ALLRENTZ_CONSTITUTION.md`. If this file conflicts with the Constitution, the Constitution wins and this file is corrected.

---

## Core Principle

AI may recommend.
Tests verify.
Database authority decides.
State contracts enforce.
Runtime action classification blocks unsafe actions.
Humans approve high-risk changes.

---

## Package A — Formal Workflow Safety and Advanced Verification

### Rule 1 — Workflow State-Transition Contracts

Critical workflows must eventually have explicit state-transition contracts.

**Initial critical workflows:**

- RFQ lifecycle
- Vendor quote submission
- Customer approval
- Dispatch
- Completion
- Invoicing
- Payment status
- Audit log creation
- Membership verification
- Admin override

**Each contract must define:**

| Field | Description |
|---|---|
| Allowed states | The complete set of valid states for this workflow |
| Allowed transitions | State → state pairs that are permitted |
| Forbidden transitions | State → state pairs that must never succeed |
| Required actor authority | Who may trigger each transition (role, org, RLS check) |
| Required database mutation | Which tables must be written, in what order |
| Required audit event | The `audit_events` entry that must be recorded atomically |
| Required tests | Edge Function test, RLS test, DB function test, browser smoke |
| Rollback considerations | What to undo, in what order, if the mutation fails mid-transaction |

**Current status:** The RFQ lifecycle contract is partially defined by the Edge Function allowlist and `transition_rfq_status()`. Contracts for all remaining critical workflows are pending and must be defined before those workflows are promoted to production.

---

### Rule 2 — Authority Source Hierarchy

Operational authority must never be inferred from UI behavior.

| Source | Authority level |
|---|---|
| Database state (table rows, constraints, enums) | Authoritative |
| RLS policies | Authoritative |
| Edge Function contracts | Authoritative |
| `audit_events` records | Authoritative |
| `transition_rfq_status()` allowlist | Authoritative |
| Frontend display, button state, UI flow | Evidence only — never authority |
| Claude's inference from UI behavior | Never authoritative |

If a UI action appears to succeed but the database does not reflect the expected state, the database state is correct and the UI is wrong.

---

### Rule 3 — Verification Failure Artifact (VFA)

A Verification Failure Artifact is required for: production blockers, authority failures, RLS drift, migration drift, audit-event failures, CORS/Edge Function contract failures, bad assumptions that affected implementation, failed verification that changes the known bug class list, or any failure requiring human approval before correction.

**VFA schema:**

| Field | Description |
|---|---|
| `date` | YYYY-MM-DD |
| `workflow` | e.g. "RFQ lifecycle — draft → submitted" |
| `branch` | git branch at time of failure |
| `failed_state_or_action` | what was attempted |
| `expected_behavior` | what should have happened |
| `actual_behavior` | what actually happened |
| `verification_layer` | Gate 1 / Gate 3 / Gate 5 / browser / manual SQL / etc. |
| `root_cause_hypothesis` | best current explanation |
| `evidence_reviewed` | files, SQL output, logs, network responses reviewed |
| `correction_applied` | migration name, policy change, code change, or "none yet" |
| `regression_test_added` | test name or "pending" |
| `new_verifier_rule_proposed` | rule text or "none" |
| `human_approval_required` | yes / no — and why |
| `final_status` | open / resolved / deferred |

VFAs are stored in `docs/engineering/vfa/` as individual markdown files named `YYYY-MM-DD-<workflow-slug>.md`. Create that directory when the first VFA is written.

---

### Rule 4 — File-Based Causal Memory

ALLRENTZ must use file-based causal memory before any graph database is introduced.

**Causal memory note schema:**

| Field | Description |
|---|---|
| `cause` | what event, assumption, or gap triggered the problem |
| `effect` | what broke or was at risk |
| `evidence` | verification output, SQL result, error message, or test failure |
| `impacted_workflow` | which workflow(s) were affected |
| `related_files` | migration files, policy files, Edge Function, frontend component |
| `related_failure_class` | RLS gap / migration drift / authority bypass / demo contamination / stale contract / scope creep / missing audit / other |
| `test_added` | test name or "pending" |
| `future_prevention_rule` | what would have caught this earlier |
| `last_verified_date` | YYYY-MM-DD |
| `confidence_level` | confirmed / probable / hypothesis |

Causal memory notes are stored in `docs/engineering/causal/` as individual markdown files named `YYYY-MM-DD-<slug>.md`. Create that directory when the first note is written.

---

### Rule 5 — Meta-Improvement Boundary

Claude may **propose** improvements to:

- Verification specs
- Failure templates (VFA schema, causal memory schema)
- Known bug class notes
- Test coverage strategy
- Documentation structure
- Claude instructions in `CLAUDE.md` or `ALLRENTZ_CONSTITUTION.md`

Claude must **not** automatically rewrite or enforce:

- Production workflow authority
- Security rules
- RLS policy
- Payment logic
- Migration policy
- CI gates
- Compliance behavior
- Customer/vendor permission boundaries

All proposed meta-improvements require a human approval step before any file is modified. The proposal must be shown in full before any change is made.

---

### Rule 6 — Uncertainty Blocks Implementation

If any of the following are unclear, stop and request evidence before proceeding:

- Authority (who may act)
- RLS behavior (what rows are visible to whom)
- Workflow state (what the current DB state actually is)
- Compliance impact (does this touch a regulated field or action)
- Payment impact (does this touch billing, invoicing, or deposit logic)
- Audit behavior (will this action be recorded authoritatively)
- Production risk (could this affect live operational data)
- Data ownership (who owns this record — customer, vendor, platform)
- Customer/vendor boundary (does this cross a permission boundary)

Uncertainty is not a blocker to be worked around. It is a signal to stop, investigate, and confirm before acting.

---

## Package B — High-Control Agent Governance Runtime Rules

For the governance-principle layer, see `docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md`.
This file defines the operational runtime mechanics used during P7-VERIFY work.

### Rule 7 — Tool Permission Boundaries

Claude's authority is scoped by action type, not confidence level.

Permission levels:

- **Read-only:** inspect files, schema, logs, tests, documentation, branch state, git status, and workflow history.
- **Draft/propose:** show the full proposal before any file is touched.
- **Local change:** edit approved repo files only when explicitly authorized per task.
- **High-risk change:** stop and request approval before proceeding.
- **Production-impacting change:** requires evidence package, rollback path, and explicit human approval.

Claude confidence is not permission.
Claude reasoning is not approval.
Claude output is not production authority.

---

### Rule 8 — Runtime Action Classification

Before any high-risk action, Claude must state the classification:

- **Allow** — read-only or pre-approved local file change
- **Warn** — notable change, low production risk; disclose before proceeding
- **Block** — high-risk; stop and await approval
- **Human Review Required** — explicit approval required before any action

High-risk actions include Supabase migrations, RLS changes, auth changes, payment logic changes, admin override behavior, delete operations, production deploys, customer/vendor authority changes, audit log behavior changes, and CI enforcement changes.

No high-risk action executes until the classification is stated and approval is received when required.

---

### Rule 9 — Human Approval Gates

The following always require explicit human approval before execution:

- Schema migrations
- RLS policy changes
- Auth configuration changes
- Payment or billing logic changes
- Production deploys
- Deleting records, columns, tables, or files
- Changes to audit log schema or behavior
- Changes to customer/vendor authority or permission boundaries
- Changes to CI enforcement

Approval in one session does not carry to other sessions or contexts.

---

### Rule 10 — Evidence Package Requirement

Before executing any high-risk or production-impacting action, state:

1. **Objective** — what this change is meant to accomplish
2. **Evidence reviewed** — files, schema, logs, or tests inspected
3. **Action proposed** — exact change to be made
4. **Risks identified** — what could go wrong
5. **Rollback path** — how to undo the change if it fails

The evidence package must appear before the action is taken, not after.

---

### Rule 11 — Fresh Evidence Beats Old Memory

Old memory, recalled context, and prior-session assumptions are not authority.

Before acting on recalled information about schema, RLS policies, workflow state, or permission boundaries, verify against current code, current database state, or the current migration chain.

If live state contradicts memory, trust live state and discard stale memory.

---

### Rule 12 — Final Operating Rule

AI may recommend.
Tests verify.
Database authority decides.
State contracts enforce.
Runtime action classification blocks unsafe actions.
Humans approve high-risk changes.

---

## Open Items

- [ ] Create `docs/engineering/vfa/` directory and write first VFA when next qualifying failure occurs
- [ ] Create `docs/engineering/causal/` directory and write first causal note
- [ ] Define state-transition contract for vendor quote submission workflow
- [ ] Define state-transition contract for customer approval workflow
- [ ] Define state-transition contracts for: dispatch, completion, invoicing, payment status, audit log creation, membership verification, admin override
- [ ] Cross-link workflow contracts to `docs/product/rental-lifecycle-framework.md` when that doc is populated
