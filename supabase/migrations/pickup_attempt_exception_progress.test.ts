import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260818030125_pickup_attempt_exception_progress.sql'),
  'utf8',
)

describe('governed PickupTask attempt outcome and exception-progress contract', () => {
  it('creates an immutable append-only RFQ-wide attempt ledger', () => {
    expect(migration).toContain('CREATE TABLE public.rental_pickup_attempt_events')
    expect(migration).toContain('rental_pickup_attempt_events_immutable')
    expect(migration).toContain('FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)')
    expect(migration).toContain("IF v_rfq.object_scope <> 'rfq'")
  })

  it('keeps direct clients closed and grants service role projection access only', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_attempt_events',
    )
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.rental_pickup_attempt_events TO service_role',
    )
    expect(migration).not.toContain('GRANT ALL')
  })

  it('publishes only the service-role controlled command', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.record_rental_pickup_attempt_outcome',
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_pickup_attempt_outcome[\s\S]*TO service_role/,
    )
  })

  it('requires arrival, assignment, membership, RFQ scope, and simulation authority', () => {
    expect(migration).toContain("v_latest_dispatch.event_type <> 'arrival_recorded'")
    expect(migration).toContain('v_latest_dispatch.assigned_actor_id <> p_actor_id')
    expect(migration).toContain("membership.role IN ('owner', 'admin', 'member')")
    expect(migration).toContain('Pickup task scope must remain RFQ-wide')
    expect(migration).toContain('Pickup attempt actor simulation scope does not match RFQ')
  })

  it('requires a governed reason for failure and rejects a reason for collection assertion', () => {
    expect(migration).toContain('Failed pickup attempt requires a governed reason code')
    expect(migration).toContain('Pickup attempt reason is only permitted for a failed attempt')
    expect(migration).toContain("v_reason_code = 'other' AND v_notes IS NULL")
  })

  it('is atomic, idempotent, and allows no implicit retry authority', () => {
    expect(migration).toContain('FOR UPDATE OF rr')
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain('retry authority is not included')
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
  })

  it('records only an actor assertion without billing, custody, return, or closure authority', () => {
    expect(migration).toContain("'actor_assertion_only', true")
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).toContain("'successful_return_authority', false")
    expect(migration).toContain("'task_closure_authority', false")
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*override/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
