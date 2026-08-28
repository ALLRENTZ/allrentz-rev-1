import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828123500_rental_order_end_date_change_review.sql'),
  'utf8',
)

describe('Rental Order end-date change-review intake', () => {
  it('creates an immutable review request rather than a mutable change order', () => {
    expect(migration).toContain('CREATE TABLE public.rental_order_change_review_requests')
    expect(migration).toContain("request_kind = 'end_date_change_review'")
    expect(migration).toContain('rental_order_change_review_requests_immutable')
    expect(migration).not.toContain('CREATE TABLE public.rental_order_change_orders')
  })

  it('enforces counterparty, simulation, lifecycle, and idempotency boundaries', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.request_rental_order_end_date_change_review')
    expect(migration).toContain('actor simulation scope does not match Rental Order')
    expect(migration).toContain('lacks % change-review authority')
    expect(migration).toContain('outside the change-review intake lifecycle boundary')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain("SET search_path = ''")
  })

  it('records atomic review evidence while denying decision authority', () => {
    expect(migration).toContain("'rental_order.change_review_requested'")
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
    expect(migration).toContain("'base_end_date_state', 'unknown'")
    for (const boundary of [
      "'change_order_authority', false",
      "'version_activation_authority', false",
      "'lifecycle_transition_authority', false",
      "'billing_authority', false",
      "'custody_authority', false",
      "'granular_scope_authority', false",
    ]) expect(migration).toContain(boundary)
  })

  it('exposes only service-mediated read and command access', () => {
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES[\s\S]*FROM PUBLIC, anon, authenticated, service_role/)
    expect(migration).toMatch(/GRANT SELECT ON TABLE public\.rental_order_change_review_requests TO service_role/)
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.request_rental_order_end_date_change_review\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.request_rental_order_end_date_change_review\([\s\S]*TO service_role/)
  })
})
