---
applyTo: "**"
---

# ALLRENTZ Supabase Data Rules

## Authority Layer

- The database is the authoritative source of operational state. Not the frontend. Not the Edge Function response.
- Edge Functions orchestrate and derive authority. The database enforces it.
- The frontend displays and collects. It does not authorize.
- Direct client writes to operational tables are prohibited. All operational mutations flow through server-side functions with appropriate authority checks.

## Transition Enforcement

- `transition_rfq_status()` is the only authorized path for RFQ status changes. [VERIFIED]
- It is a SECURITY DEFINER function. EXECUTE is granted to service_role only — not to authenticated or anon. [VERIFIED]
- The rfq-transition Edge Function calls it via the service role client after completing server-side authority checks. [VERIFIED]
- No client, frontend call, or direct SQL INSERT may bypass transition_rfq_status() for status changes.

## Audit System

- `log_audit_event()` is a SECURITY DEFINER function callable only via service_role. [VERIFIED]
- Audit events are immutable once written. Do not UPDATE or DELETE audit_events rows.
- Every authoritative state change must produce an audit event. If audit writing fails, the transaction must roll back. [VERIFIED: ALLRENTZ_CONSTITUTION.md Event Integrity Rule]
- Audit events include: correlation_id, entity_type, entity_id, event_type, actor_id, actor_role, source, old_value, new_value, metadata, is_simulated. [VERIFIED]
- related_rfq_id on audit_events is SET NULL on rental_request DELETE — rows persist with null RFQ reference. [VERIFIED]

## Organization Isolation

- `organization_memberships` enforces org boundary for customer and vendor authority. [VERIFIED]
- RLS on organization_memberships: authenticated users may SELECT only their own non-archived memberships. [VERIFIED]
- No INSERT, UPDATE, or DELETE policy exists for authenticated on organization_memberships — client writes produce no rows affected, not 403. [VERIFIED]
- Archived memberships (archived_at IS NOT NULL) are excluded from all authority checks. [VERIFIED]
- Viewer-role memberships grant read access only — not transition authority. [VERIFIED]

## Demo Isolation

- All simulated records must carry is_simulated = true. [VERIFIED: rental_requests, organizations]
- Simulated records must never appear in operational reporting, metrics, or SmartMatch decisions.
- Demo data must not contaminate production RFQ workflows, audit trails, or compliance records.
- is_simulated is not a soft flag — it is a hard separation requirement.

## RLS Expectations

- RLS is the last line of defense, not the primary one. Authority checks in Edge Functions must run first.
- RLS rejection on UPDATE/DELETE may return HTTP 200 with 0 rows affected — not 403. Do not rely on HTTP status alone for write protection verification. Verify via row count or DB state. [VERIFIED: membership authority tests]
- All new tables on operational data must have explicit RLS policies. No table may silently allow public or authenticated access without review.
- service_role bypasses RLS by design. Edge Functions using the service client must implement their own authority checks before any write.

## Migration Discipline

- Migrations are the only approved path for schema changes. No ad-hoc SQL in production.
- Migrations are append-only. Applied migrations are never modified.
- Each migration must be self-contained and reversible where possible.
- New migrations may not be written on top of unverified baseline state.
- After applying migrations locally, verify: table structure, RLS policies, function signatures, EXECUTE grants.

## Protected Tables

The following tables require heightened review before any schema or policy change:

| Table | Protection Reason |
|-------|------------------|
| `rental_requests` | Core RFQ lifecycle and operational status |
| `rfq_operational_status` | Immutable transition history |
| `audit_events` | Immutable audit trail |
| `organization_memberships` | Authority boundary enforcement |
| `user_roles` | Admin/manager authority source |
| `vendor_quote_responses` | Vendor authority gate for transitions |

## Cascade Awareness

Known cascade chains: [VERIFIED]
- Deleting auth.users → cascades to profiles, user_roles, customer_profiles, vendor_profiles, organization_memberships
- Deleting organizations → cascades to organization_memberships
- Deleting rental_requests → cascades to vendor_quote_responses, rfq_operational_status
- vendor_quote_responses.submitted_by has ON DELETE RESTRICT — delete VQRs before auth users
- audit_events.related_rfq_id has ON DELETE SET NULL — audit rows persist with null RFQ reference

Do not delete from protected tables in production without understanding the full cascade chain.

## What Is Not Yet Built

- Real vendor matching from the database. [VERIFIED: CLAUDE.md]
- Compliance document table RLS and enforcement. [UNKNOWN: structure not verified in this session]
- Delivery tracking table RLS. [UNKNOWN: structure not verified in this session]
- Reason code columns on rfq_operational_status or audit_events. [DOCTRINE: deferred — see ALLRENTZ_CONSTITUTION.md]
