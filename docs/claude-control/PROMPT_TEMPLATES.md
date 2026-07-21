---
title: Prompt Templates
domain: claude-control
status: active
authority: subordinate to ALLRENTZ_CONTROL_BLOCK.md and TASK_CAPSULE_TEMPLATE.md
last_reviewed: 2026-07-01
---

# Prompt Templates

Six task types, each pairing `ALLRENTZ_CONTROL_BLOCK.md` with a
`TASK_CAPSULE_TEMPLATE.md` shaped for that kind of work. Copy the relevant
template, fill in the brackets, and paste the Control Block ahead of it.

---

## 1. Read-Only Audit

Use when you want findings without any file changes.

```
TASK CAPSULE — READ-ONLY AUDIT

BRANCH
<expected branch name>

OBJECTIVE
Audit <file/area> for <specific concern — e.g. fake data, trust issues,
authority bypass, drift from doctrine>. Do not edit yet.

EXPECTED BEHAVIOR
A findings report: what is wrong, where, and why it matters. No files
change as a result of this task.

ACTUAL BEHAVIOR
Unknown — that's what the audit determines.

KNOWN EVIDENCE:
[Paste exact current evidence from PowerShell, Git, Supabase,
browser/runtime output, test output, or prior approved report.]

AUTHORIZED FILES
Read only: <paths>

FORBIDDEN FILES AND FOLDERS
Everything not listed above. In particular: do not edit the audited files.

CHANGED FILE BUDGET
0. This is read-only. Any file change is out of scope.

AUTHORIZED COMMANDS
<read-only commands only — git status, git log, git diff, Select-String,
Get-ChildItem, Test-Path, cat-equivalents. No install/build/test/deploy.>

STOP CONDITIONS
Standard set (see STOP_AND_APPROVAL_STANDARD.md), plus:
- Stop if the audit would require running code, not just reading it.

REQUIRED REPORT
Standard shape (see STOP_AND_APPROVAL_STANDARD.md) plus a findings list:
finding / file:line / why it matters / severity (fyi, warn, block).
```

---

## 2. Root Cause Audit

Use when something is broken and the cause is not yet known. Still
read-only; the difference from (1) is it's driven by a symptom, not a
general sweep.

```
TASK CAPSULE — ROOT CAUSE AUDIT

BRANCH
<expected branch name>

OBJECTIVE
Determine the root cause of <symptom — e.g. "customer dashboard fails to
load for vendor-role users">. Do not fix yet.

EXPECTED BEHAVIOR
A single, evidence-backed root cause statement, with the exact file:line
or query result that proves it. If multiple contributing factors exist,
rank them.

ACTUAL BEHAVIOR
<the observed symptom, with reproduction steps or logs if available>

KNOWN EVIDENCE
<logs, error messages, prior VFA/causal notes if any exist>

AUTHORIZED FILES
Read only: <paths — start narrow, expand only if the trail leads there>

FORBIDDEN FILES AND FOLDERS
Everything not listed above.

CHANGED FILE BUDGET
0. This is read-only.

AUTHORIZED COMMANDS
<read-only commands — reading code, git blame/log, reading logs/tests>

STOP CONDITIONS
Standard set, plus:
- Stop if root-causing requires touching production data or live systems.
- Stop if the trail leads outside AUTHORIZED FILES — report and request
  scope expansion rather than following it silently.

REQUIRED REPORT
Standard shape plus: root cause statement, supporting evidence, and
confidence (CONFIRMED by direct evidence, or UNVERIFIED — labeled as such).
```

---

## 3. Minimal Implementation

Use once an approach is agreed and you're doing the smallest change that
satisfies the objective.

```
TASK CAPSULE — MINIMAL IMPLEMENTATION

BRANCH
<expected branch name>

OBJECTIVE
Implement <the approved minimal fix — reference the audit or approval
that authorized it>.

EXPECTED BEHAVIOR
<what should work after this change, stated as a testable outcome>

ACTUAL BEHAVIOR
<current broken/missing behavior>

KNOWN EVIDENCE:
[Paste exact current evidence from PowerShell, Git, Supabase,
browser/runtime output, test output, or prior approved report.]

AUTHORIZED FILES
Editable only after approval: <paths — the minimal set>

FORBIDDEN FILES AND FOLDERS
Everything not listed above. Do not refactor adjacent code.

CHANGED FILE BUDGET
Expected changed files: <N> maximum
Allowed changed files:
1. <path> — <purpose>

AUTHORIZED COMMANDS
<the specific edit + verification commands needed — no install/build
unless the task explicitly requires it and it's listed>

STOP CONDITIONS
Standard set, plus:
- Stop if the fix falls under any Mandatory Human Approval Stop in
  docs/doctrine/ALLRENTZ_HIGH_CONTROL_AGENT_GOVERNANCE.md.
- Stop if the minimal fix turns out to require more files than budgeted.

REQUIRED REPORT
Standard shape plus: diff summary (git diff), and confirmation the
changed-file list matches the budget exactly.

Do not commit. Do not push. Wait for explicit approval before either.
```

---

## 4. Verification

Use to confirm a change actually does what it claims, before it's
reported as done.

```
TASK CAPSULE — VERIFICATION

BRANCH
<expected branch name>

OBJECTIVE
Verify that <change / commit / PR> produces <expected outcome>.

EXPECTED BEHAVIOR
Verification passes with cited evidence (command output, test result,
or observed behavior) — not an assertion that it "should work."

ACTUAL BEHAVIOR
Unverified as of this task.

KNOWN EVIDENCE:
[Paste exact current evidence from PowerShell, Git, Supabase,
browser/runtime output, test output, or prior approved report.]

AUTHORIZED FILES
Read only: <changed files, related tests>

CHANGED FILE BUDGET
0, unless the verification task is explicitly authorized to write a new
test file — then list it.

AUTHORIZED COMMANDS
<test run commands, git diff, git log, read-only queries — exact
commands only>

STOP CONDITIONS
Standard set, plus:
- Stop if verification requires production data or live state — request
  approval per docs/engineering/p7-verify-doctrine.md instead of
  improvising against live systems.

REQUIRED REPORT
Standard shape plus: PASS/FAIL per expected outcome, with the exact
command output or file:line evidence for each.
```

---

## 5. Closeout

Use after verification passes, to close the loop on the priority board /
tracking doc.

```
TASK CAPSULE — CLOSEOUT

BRANCH
<expected branch name>

OBJECTIVE
Close out <task/board item> now that verification has passed.

EXPECTED BEHAVIOR
The tracking doc (e.g. MASTER_PRIORITY_BOARD.md) reflects the completed
task, marked [x], with the commit hash appended on that line only.

ACTUAL BEHAVIOR
Task is implemented and verified but not yet marked complete.

KNOWN EVIDENCE:
[Paste exact current evidence from PowerShell, Git, Supabase,
browser/runtime output, test output, or prior approved report.]

AUTHORIZED FILES
Editable only after approval: <the single tracking doc line/file>

FORBIDDEN FILES AND FOLDERS
Everything else. Closeout does not touch implementation files.

CHANGED FILE BUDGET
1 file, 1 line changed (plus the commit hash annotation).

AUTHORIZED COMMANDS
git log (to get the commit hash), the edit itself, git diff, git status.

STOP CONDITIONS
Standard set, plus:
- Stop if verification has not actually passed yet — closeout is not a
  substitute for verification.

REQUIRED REPORT
Standard shape plus: the exact line changed and the commit hash used.

Do not commit unless explicitly asked. Do not push.
```

---

## 6. Next Task Selection

Use when picking what to work on next, without committing to doing it yet.

```
TASK CAPSULE — NEXT TASK SELECTION

BRANCH
<expected branch name>

OBJECTIVE
Identify the next task per <priority doc — e.g. MASTER_PRIORITY_BOARD.md
/ P2 remediation plan>. Do not implement anything yet.

EXPECTED BEHAVIOR
A single recommended next task, with the reason it's next (priority order,
dependency, freeze boundary status), and what Task Capsule template it
would use once approved.

ACTUAL BEHAVIOR
Multiple candidate tasks may be open; priority is not yet confirmed for
this session.

KNOWN EVIDENCE:
[Paste exact current evidence from PowerShell, Git, Supabase,
browser/runtime output, test output, or prior approved report.]

AUTHORIZED FILES
Read only: <priority board, remediation plan, relevant docs>

CHANGED FILE BUDGET
0. Selection only.

AUTHORIZED COMMANDS
<read-only commands — reading the priority doc, git log for recent
completions>

STOP CONDITIONS
Standard set, plus:
- Stop if the priority doc and current repo state disagree about what's
  already done — report the discrepancy rather than guessing.

REQUIRED REPORT
Standard shape plus: recommended next task, why it's next, and which
prompt template (1-5 above) it should use.
```
