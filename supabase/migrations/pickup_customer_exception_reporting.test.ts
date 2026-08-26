import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260826150000_pickup_customer_exception_reporting.sql'),
  'utf8',
)

describe('governed RFQ-wide customer pickup exception-report contract', () => {
  it('creates an immutable append-only RFQ-wide report ledger', () => {
    expect(migration).toContain(
      'CREATE TABLE public.rental_pickup_customer_exception_report_events',
    )
    expect(migration).toContain(
      'rental_pickup_customer_exception_report_events_immutable',
    )
    expect(migration).toContain('FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)')
    expect(migration).toContain("object_scope = 'rfq'")
  })

  it('closes direct clients and exposes service-role projection reads only', () => {
    expect(migration).toContain(
      'ON TABLE public.rental_pickup_customer_exception_report_events',
    )
    expect(migration).toMatch(
      /REVOKE ALL PRIVILEGES[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT SELECT[\s\S]*TO service_role/,
    )
    expect(migration).not.toContain('GRANT ALL')
  })

  it('publishes controlled service-role command and queue functions only', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.record_rental_pickup_customer_exception_report',
    )
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.get_rental_pickup_customer_exception_report_queue',
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_pickup_customer_exception_report[\s\S]*TO service_role/,
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.get_rental_pickup_customer_exception_report_queue[\s\S]*TO service_role/,
    )
  })

  it('requires customer, operations, lifecycle, simulation, and PickupTask authority', () => {
    expect(migration).toContain("membership.role IN ('owner', 'admin', 'member')")
    expect(migration).toContain('must be demobilizing or off_rent before reporting a pickup exception')
    expect(migration).toContain('actor simulation scope does not match RFQ')
    expect(migration).toContain('public.pickup_exception_triage_actor(p_actor_id)')
    expect(migration).toContain("object_scope = 'rfq'")
  })

  it('is atomic, idempotent, validated, and audited', () => {
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain('length(btrim(description)) BETWEEN 1 AND 4000')
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
    expect(migration).toContain("'pickup.customer_exception_reported'")
  })

  it('keeps reports review-only and separate from failed-attempt authority', () => {
    expect(migration).toContain("'review_state', 'review_required'")
    expect(migration).toContain("'resolution_state', 'blocked'")
    expect(migration).toContain("'failed_attempt_authority', false")
    expect(migration).toContain("'resolution_authority', false")
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).toContain("'granular_scope_authority', false")
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*resolve/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
