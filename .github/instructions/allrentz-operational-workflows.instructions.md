---
applyTo: "**"
---

# ALLRENTZ Operational Workflows

## Workflows Must Mirror Real Behavior

- Design workflows for how industrial customers and vendors actually behave — not how an idealized SaaS user would behave.
- Assume many vendors still coordinate via calls, texts, email, and spreadsheets.
- Assume refinery and terminal sites have compliance gates, scheduling windows, and access restrictions.
- Do not remove manual steps simply because they could be automated.
- Manual fallback workflows are a requirement at MVP stage, not a deficiency to eliminate.

## Operational State Must Be Explicit

- Every RFQ has an explicit operational status that reflects verified platform state. [VERIFIED: operational_status column on rental_requests, app_rfq_status enum]
- Status must not be inferred from related records. It must be stored and enforced authoritatively.
- Unknown or ambiguous status is a defect, not an acceptable interim state.

## Workflow Transitions Must Be Deterministic

- Allowed RFQ transitions are defined in an explicit allowlist. [VERIFIED: transition_rfq_status() allowlist]
- Transitions outside the allowlist are rejected. No exceptions without schema-level approval.
- Terminal statuses (completed, cancelled, rejected) cannot be transitioned further. [VERIFIED]
- Each transition produces exactly one audit event and one rfq_operational_status record. [VERIFIED]
- Duplicate transitions to the same status are rejected. [VERIFIED]

## Actor Separation

Operational actions are segregated by actor type:

- **Customer actions**: org members (owner, admin, member role) of the RFQ's customer organization, archived_at IS NULL. Source = customer_action. [VERIFIED]
- **Vendor actions**: org members (non-viewer, non-archived) whose organization has an accepted quote on the RFQ. Source = vendor_action. [VERIFIED]
- **Admin actions**: users with user_roles.role IN ('admin', 'manager'). Source = admin_action. [VERIFIED]
- **System actions**: source = system (no actor_id). [VERIFIED: transition_rfq_status() supports NULL actor_id]

Viewer-role members may not perform transitions for any actor type. [VERIFIED]
Archived memberships may not perform transitions. [VERIFIED]

## Auditability Requirements

- Every workflow transition must produce a traceable audit record. [VERIFIED]
- Audit records must capture: actor_id, actor_role, source classification, old status, new status, correlation_id, timestamp.
- Source classification must be deterministic: admin_action, customer_action, vendor_action, or system. [VERIFIED]
- Admin overrides must be flagged explicitly in audit metadata (admin_override: true). [VERIFIED: P1-3A Gate 2]
- Rejected transitions must produce no audit record. The DB must remain unchanged on 403. [VERIFIED: membership authority tests, 34/34 pass]

## Manual Override Governance

- Admin and manager roles may perform transitions that bypass customer/vendor authority checks.
- Manual overrides are logged with source = admin_action and admin_override = true in metadata.
- Manual overrides do not bypass the status transition allowlist. Terminal statuses remain terminal.
- All manual override capability is server-side. The frontend may surface the option; it may not execute it directly.

## Reason Code Evolution

- Current transitions accept a freeform reason text field. [VERIFIED]
- Future transitions should evolve toward structured reason_code (enum) + optional reason_detail (text). [DOCTRINE: ALLRENTZ_CONSTITUTION.md Operational Reason Code Doctrine]
- Do not implement reason codes until the workflow state machine and audit schema are stable.
- Do not add reason_code columns or enums until explicitly approved.

## Future Orchestration Boundaries

- Automated workflow progression (e.g., auto-advancing RFQ status) is a future capability only. [FUTURE]
- No background job, cron task, or AI agent may mutate operational state without an explicit, auditable actor record.
- Workflow orchestration at scale requires reason code support, audit completeness, and replay capability before it can be trusted.
- Autonomous agents may not execute transitions. They may only surface recommendations for human confirmation. [FUTURE]
