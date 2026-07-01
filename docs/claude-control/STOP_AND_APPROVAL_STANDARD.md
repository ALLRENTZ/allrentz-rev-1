---
title: Stop and Approval Standard
domain: claude-control
status: active
authority: subordinate to /ALLRENTZ_CONSTITUTION.md and docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md
last_reviewed: 2026-07-01
---

# Stop and Approval Standard

This file standardizes the *shape* of stop conditions, approval requests,
and required reports for any Task Capsule. It does not define what
requires human approval — that's owned by
`docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md` and
`docs/engineering/p7-verify-doctrine.md`. This file exists so every
session invokes that authority the same way instead of restating it
differently each time.

---

## Standard Stop Conditions

Stop immediately if any of the following is true. Task Capsules may add
task-specific stop conditions on top of this list, never remove from it.

1. Current branch is not the one named in the Task Capsule's BRANCH field.
2. `git status` shows staged changes that weren't expected.
3. A file or folder named as "required to exist" in the Task Capsule is
   missing.
4. Existing files already contain a similar or overlapping artifact —
   report the overlap rather than duplicating it.
5. The task, as scoped, would require modifying a file outside
   AUTHORIZED FILES (including CLAUDE.md, `.claude/`, `.github/`, `src/`,
   `supabase/`, or governance/doctrine files, unless the Task Capsule
   explicitly authorizes exactly that file).
6. Any authorized command fails.
7. A needed command is not on the AUTHORIZED COMMANDS list.
8. Output is too broad or ambiguous to safely interpret.
9. You are uncertain.
10. Stop if the action falls under any Mandatory Human Approval Stop in
    docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md. See that file
    for the current authoritative list.

When stopping, report:
1. Why you stopped (which condition above, or which task-specific one).
2. Last command run.
3. Exact output.
4. What approval is needed next.

---

## Approval Request Format

Use this shape any time a command, file, or scope change is needed that
isn't already authorized:

```
APPROVAL REQUEST

1. Exact command or change requested:
2. Why it is needed:
3. Whether it reads or modifies files/data:
4. Risk level (low / medium / high, and why):
5. Expected output or result:
```

Do not proceed on an implied "yes." Wait for an explicit approval string
before running the requested command or touching the requested file.

---

## Required Report Format

Use this shape for the report that follows any read-only phase, before
files are created or edited (the "placement audit" pattern):

```
1. Branch and git status:
   branch:
   tracked modifications:
   staged changes:
   untracked files:

2. Existing evidence inspected:
   <relevant file>:
   <relevant folder>:
   existing overlapping artifact found: YES or NO

3. Recommended path / approach:
   path or approach:
   reason:
   risk:

4. Files or changes proposed:
   item 1: purpose:
   item 2: purpose:
   ...

5. Conflicts:
   existing overlapping material:
   risk of duplication:
   recommended handling:

6. Approval requested — use exactly one:
   SAFE TO BUILD / SAFE TO PROCEED
   NEED APPROVAL BEFORE BUILD
   BLOCKED
   UNKNOWN
```

Use this shape for the closing report after implementation:

```
1. Files created/changed (exhaustive list).
2. Confirmation no forbidden files changed.
3. git diff summary (scoped to the authorized paths).
4. git status -sb.
5. Whether changed files are limited to the approved set — YES or NO.
6. Any issue or uncertainty.
7. Final readiness — use exactly one:
   READY FOR REVIEW
   BLOCKED
   UNKNOWN
```

---

## Principles behind this standard

- **Evidence over confidence.** Every stop, every report line, cites a
  command output or a file:line — not a recollection or a guess.
- **Narrow first, expand only on request.** A Task Capsule's scope is a
  ceiling. Hitting the ceiling is a stop condition and an Approval
  Request, not silent expansion.
- **Uniform vocabulary.** Using the same report and approval shapes every
  session makes output easy to scan and hard to misread — that's the
  entire point of this kit.
