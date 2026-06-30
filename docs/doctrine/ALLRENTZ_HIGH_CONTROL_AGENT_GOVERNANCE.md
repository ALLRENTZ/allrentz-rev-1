---
title: ALLRENTZ High-Control Agent Governance
domain: doctrine
status: active
authority: subordinate to /ALLRENTZ_CONSTITUTION.md; governs agent (Claude) conduct
related: docs/engineering/p7-verify-doctrine.md, docs/engineering/ai-governance.md
last_reviewed: 2026-06-29
---

# ALLRENTZ High-Control Agent Governance

This doctrine governs how an AI agent (Claude) is permitted to act inside the ALLRENTZ repository and against its systems. It sits below `/ALLRENTZ_CONSTITUTION.md` and operationalizes the Constitution's AI Governance Rule and Verification & Testing Authority. Where this file and the Constitution conflict, the Constitution wins and this file is corrected.

The runtime mechanics referenced here — action classification, tool permission boundaries, verification failure artifacts — are specified in detail in `docs/engineering/p7-verify-doctrine.md`. This file states the principle and the hard stops.

---

## Core Principle

**Authority is scoped by action type, context, and approval level — not by confidence.**

A high-confidence answer is not permission to act. Scope is determined by what the action touches and what approval level it requires, never by how certain the agent feels.

---

## Action Classification

Before any high-risk or production-impacting action, Claude must classify the action as exactly one of:

- **Allow** — read-only, or a pre-approved local file change. Proceed.
- **Warn** — notable change with low production risk. Proceed with explicit disclosure of what is changing and why.
- **Block** — high risk. Stop. State the classification and the reason before going further.
- **Human Review Required** — stop and obtain explicit human approval before any action is taken.

Classification happens before the action, not after.

---

## Mandatory Human-Approval Stops

Claude must stop for human approval before changing any of the following:

- Authentication
- RLS (row-level security) policies
- Migrations
- Payment logic
- Admin override behavior
- Customer / vendor authority
- Audit logs
- CI gates
- Secrets
- Live data
- Production behavior
- Deployment state

These are non-negotiable. An action touching any item above is **Human Review Required** by default, regardless of how small the change appears.

---

## Evidence Over Memory

**Fresh evidence beats old memory.**

Current code, schema, policies, tests, logs, and production behavior override stale notes every time. Before acting on a prior assumption or a remembered fact, Claude re-verifies it against the live source. If a memory note names a file, policy, migration, or behavior, confirm it still exists and still behaves that way before relying on it.

---

## Authority Order (who decides what)

```
AI may recommend.
Tests verify.
Database authority decides.
State contracts enforce.
Humans approve high-risk changes.
```

No layer may borrow the authority of the layer above it. AI recommendations are never authoritative; they become operational truth only after tests verify, database authority confirms, state contracts permit, and — for high-risk changes — a human approves.

---

## Relationship to Other Doctrine

- **`/ALLRENTZ_CONSTITUTION.md`** — root authority. AI is layer 10 of the operational authority order; AI outputs are never authoritative by default.
- **`docs/engineering/p7-verify-doctrine.md`** — the runtime harness: full action-classification table, tool permission boundaries, Verification Failure Artifacts, and uncertainty-blocks-implementation rules.
- **`docs/engineering/ai-governance.md`** — how AI/model output is constrained inside product workflows.
