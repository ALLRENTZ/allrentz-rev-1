---
title: ALLRENTZ Control Block
domain: claude-control
status: active
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md
last_reviewed: 2026-07-01
---

# ALLRENTZ Control Block

Paste this block at the start of any Claude Code session that will touch this
repository. It sets session-wide behavior. It does not replace governance —
it invokes it consistently.

> This file is a reusable **template fragment**, not a task. Pair it with a
> filled-in `TASK_CAPSULE_TEMPLATE.md` for the specific job at hand.

---

## Text to paste

```
ALLRENTZ CONTROL BLOCK

You are operating under strict command bounded execution.

Fresh repo evidence beats memory. Current code, schema, policies, tests,
logs, and production behavior override stale notes, prior sessions, or
summaries every time.

Active engineering source of truth:
C:\Users\prmcg\allrentz-main

Obsidian / operational-brain is reference only and does not control repo
behavior unless explicitly authorized.

Do not assume. If unknown, say UNKNOWN and stop.
Do not infer from old memory, old notes, previous sessions, or summaries.

You may only run commands listed under AUTHORIZED COMMANDS in the attached
Task Capsule. Do not run substitute, equivalent, exploratory, or cleanup
commands. Do not run install, build, test, deploy, migration, reset,
staging, commit, or push commands unless explicitly listed.

If another command is needed, stop and request approval using the
Approval Request format in STOP_AND_APPROVAL_STANDARD.md.

Standard stop conditions, including branch mismatch, staged changes,
uncertainty, and scope limits, are defined in STOP_AND_APPROVAL_STANDARD.md
and apply to every session.

Every conclusion must cite current evidence: command output, git output,
or an exact file path and line reference. Do not say "likely," "probably,"
or "should work" unless clearly labeled UNVERIFIED.

Design integrity rule — reject any approach that:
1. Bypasses RLS.
2. Bypasses auth.
3. Bypasses role checks.
4. Bypasses vendor authority.
5. Bypasses customer authority.
6. Bypasses approval gates.
7. Duplicates business logic in the wrong layer.
8. Hardcodes demo behavior.
9. Adds hidden fallbacks.
10. Ships UI-only fixes that leave backend state broken.
11. Runs unbounded command execution.
12. Runs broad exploratory audits outside the Task Capsule scope.
13. Substitutes commands not on the authorized list.
14. Commits or pushes without explicit approval.

Governance references (do not restate — cite):
- /ALLRENTZ_CONSTITUTION.md
- docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md
- docs/engineering/p7-verify-doctrine.md

A Task Capsule (see TASK_CAPSULE_TEMPLATE.md) follows this block and
defines the one problem being solved in this session.
```

---

## Notes

- The Control Block is stable across sessions. Only the Task Capsule below it
  changes per task.
- If the Control Block and a Task Capsule ever conflict, the Task Capsule's
  narrower scope wins for that session — but the Control Block's hard limits
  (no substitute commands, no unapproved commit/push, no bypassing
  RLS/auth/authority) are never overridden by a Task Capsule.
- This file does not grant authority. It structures how existing authority
  (Constitution, doctrine, human approval) gets invoked in a session.
