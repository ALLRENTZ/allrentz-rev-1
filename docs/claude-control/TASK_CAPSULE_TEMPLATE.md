---
title: Task Capsule Template
domain: claude-control
status: active
authority: subordinate to ALLRENTZ_CONTROL_BLOCK.md
last_reviewed: 2026-07-01
---

# Task Capsule Template

A Task Capsule is the small, disposable, per-task fragment that pairs with
the (stable) `ALLRENTZ_CONTROL_BLOCK.md`. Fill in every section before
starting work. An empty or vague section is a stop condition, not something
to improvise past.

---

## Template

```
TASK CAPSULE

BRANCH
[Expected branch name]

OBJECTIVE
One problem only. State it in one or two sentences.

EXPECTED BEHAVIOR
What should be true when this task is done.

ACTUAL BEHAVIOR
What is true right now (the gap this task closes).

KNOWN EVIDENCE
What you already know, and where it came from (file, command output,
prior report). Not memory, not assumption.

AUTHORIZED FILES

Read only:
<paths>

Editable only after audit / after approval:
<paths>

FORBIDDEN FILES AND FOLDERS
<paths — list explicitly, do not rely on "everything else">

CHANGED FILE BUDGET
Expected changed files: <N> maximum
Allowed changed files:
1. <path> — <purpose>
2. <path> — <purpose>
...
No other changed files allowed.

AUTHORIZED COMMANDS
You may run only the following commands:
1. <exact command>
2. <exact command>
...
No other commands are authorized.

EXECUTION RULE (if the task has a report/approval checkpoint)
Run only commands <N> through <M> first.
Then stop and report before touching files.
Do not run commands <M+1> through <last> until the report confirms
readiness.

STOP CONDITIONS
See STOP_AND_APPROVAL_STANDARD.md. The branch-mismatch stop condition
checks the current branch against the BRANCH field above. List any
task-specific additions here.

REQUIRED REPORT
See STOP_AND_APPROVAL_STANDARD.md for the standard shape. List any
task-specific additions here.
```

---

## Filling it out — guidance

- **BRANCH**: the exact branch this task expects to run on. If the repo
  is on a different branch, that's a stop condition, not a judgment call.
- **OBJECTIVE**: one problem. If you find yourself listing two objectives,
  split into two Task Capsules.
- **AUTHORIZED FILES / FORBIDDEN FILES**: be explicit. "Do not touch
  anything outside the list" is implied but the list must still be
  exhaustive enough that there's no ambiguity.
- **CHANGED FILE BUDGET**: a hard ceiling. If the real work needs more
  files than budgeted, that's a stop condition — report it, don't quietly
  expand scope.
- **AUTHORIZED COMMANDS**: exact commands, not categories. "git status" is
  authorized; "any git command" is not.
- Every Task Capsule pairs with `ALLRENTZ_CONTROL_BLOCK.md`. It narrows
  scope; it does not loosen the Control Block's hard limits.
