---
title: ALLRENTZ Claude Code Prompt Operating Kit
domain: claude-control
status: active
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md
last_reviewed: 2026-07-01
---

# ALLRENTZ Claude Code Prompt Operating Kit

This folder is a reusable prompt kit for structuring Claude Code sessions
in this repo. It does not define authority or governance — that lives in
`/ALLRENTZ_CONSTITUTION.md`, `docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md`,
and `docs/engineering/p7-verify-doctrine.md`. This kit exists so that
authority gets invoked the same, tighter way every session, instead of a
new ad hoc giant prompt each time.

## Start Here

Pick your situation:

| Situation | Use this template |
|---|---|
| Need to pick the next task | Next Task Selection |
| Need to inspect without changes | Read-Only Audit |
| Something is broken | Root Cause Audit |
| Fix already approved | Minimal Implementation |
| Need to prove behavior | Verification |
| Need to close a task | Closeout |

All six templates are in `PROMPT_TEMPLATES.md`.

**Operating flow:**

1. Pick the task type.
2. Copy the Control Block from `ALLRENTZ_CONTROL_BLOCK.md`.
3. Copy the matching Task Capsule from `PROMPT_TEMPLATES.md`.
4. Fill in branch, known evidence, authorized files, and authorized
   commands.
5. Paste into Claude Code.
6. Do not approve edits until Claude returns the required report.

## Files in this kit

| File | Purpose |
|---|---|
| `ALLRENTZ_CONTROL_BLOCK.md` | The stable session-opening block: source of truth, evidence rule, command-bounded execution, design integrity rule. Paste once per session. |
| `TASK_CAPSULE_TEMPLATE.md` | The per-task fragment: branch, objective, expected/actual behavior, authorized files, changed-file budget, authorized commands. Fill in fresh per task, or start from one of the six ready-made templates below. |
| `PROMPT_TEMPLATES.md` | Six ready-to-fill Task Capsule variants: read-only audit, root cause audit, minimal implementation, verification, closeout, next-task selection. |
| `STOP_AND_APPROVAL_STANDARD.md` | The standard shape for stop conditions, approval requests, and required reports (placement-audit report and closing report), used across all task types. |

## What this kit is not

- Not a replacement for `/ALLRENTZ_CONSTITUTION.md` or
  `docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md`. Those decide
  what requires human approval; this kit only standardizes how that gets
  invoked in a prompt.
- Not application, database, or CI configuration. Nothing here changes
  runtime behavior — it's prompt structure only.
- Not a dashboard, tracking board, or status system. Task/board tracking
  stays in `MASTER_PRIORITY_BOARD.md` and the existing `docs/engineering/`
  doctrine.

## Why this exists

The old pattern was pasting one long, freshly-written control prompt at
the start of every session. That's slow to write, easy to get subtly
wrong, and hard to compare across sessions. The fix: split the stable
part (the Control Block) from the per-task part (the Task Capsule), and
standardize the handful of recurring shapes (stop conditions, approval
requests, reports) once.
