---
applyTo: "**"
---

# ALLRENTZ Build Discipline

## One Concern Per Implementation Cycle

- Implement only the explicitly approved task.
- Do not expand scope, refactor adjacent code, or introduce abstractions beyond what the task requires.
- Three similar lines is better than a premature abstraction.
- If you identify a related problem while implementing, flag it — do not fix it silently.

## Verification-First Development

- Understand the current behavior before changing it.
- Inspect relevant files before writing code.
- Confirm the exact failure or gap before proposing a fix.
- Do not propose a fix based on assumption. State UNKNOWN where verification is missing.
- Do not claim work is complete without running verification commands and confirming output.

## No Opportunistic Refactors

- Do not rename files, reorganize directories, or restructure working code unless explicitly asked.
- Do not improve style, clean up unrelated logic, or adjust naming in files you touch incidentally.
- Do not add error handling for scenarios that cannot happen.
- Do not add fallbacks that silently degrade behavior.

## Migration Governance

- No schema change without an approved migration file.
- Never stack new migrations on unverified baseline state.
- Migrations must apply cleanly. Verify before marking complete.
- Migrations are append-only. Do not modify previously applied migrations.
- Schema drift must be understood and resolved before new migrations are written.

## Operational Stability Over Speed

- A correct, slow change is better than a fast, broken change.
- Do not ship partial implementations. If a task cannot be completed safely, stop and report.
- Do not introduce silent fallbacks to mock or demo data for authenticated operational flows.
- MVP stability takes precedence over feature velocity.

## No Hidden Scope Expansion

- If a task requires touching a protected operational zone (auth, RLS, migrations, workflow state machine, audit, billing, compliance), flag it explicitly before proceeding.
- Do not install new packages without explicit approval.
- Do not modify config files unless explicitly instructed.
- Do not touch .env files.

## Board and Task Discipline

- After every approved operational commit, mark the corresponding board task `[x]` and append the commit hash. [VERIFIED: MASTER_PRIORITY_BOARD.md convention]
- Board hash annotations reference the commit that completed the operational work — not subsequent housekeeping commits. [VERIFIED: updated governance rule 2026-05-28]
- Do not amend commits solely to update a board hash annotation. That creates a recursive correction loop.
- Do not mark board items complete until verification has passed and results have been reported.
- Do not start the next priority item until the current item is reported, approved, and committed.

## Definition of Done

A change is not complete unless:
- the build passes
- operational authority is preserved
- auditability is preserved
- no demo contamination is introduced
- no RLS regression is introduced
- acceptance criteria are validated and results reported
