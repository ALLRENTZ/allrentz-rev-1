import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828112832_rental_order_authority_foundation.sql'),
  'utf8',
)

describe('canonical Rental Order authority foundation', () => {
  it('creates one durable order identity and immutable accepted-quote version', () => {
    expect(migration).toContain('CREATE TABLE public.rental_orders')
    expect(migration).toContain('CREATE TABLE public.rental_order_versions')
    expect(migration).toContain('rfq_id                      uuid NOT NULL UNIQUE')
    expect(migration).toContain('accepted_quote_id           uuid NOT NULL UNIQUE')
    expect(migration).toContain("snapshot_kind = 'accepted_quote'")
    expect(migration).toContain('rental_orders_immutable')
    expect(migration).toContain('rental_order_versions_immutable')
  })

  it('derives the order atomically from the governed quote-acceptance boundary', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION private.materialize_rental_order_from_accepted_quote',
    )
    expect(migration).toContain('vendor_quote_acceptance_creates_rental_order')
    expect(migration).toContain("NEW.status = 'accepted'")
    expect(migration).toContain("'rental_order.created'")
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
    expect(migration).toContain('Created immutable Rental Order version 1 from accepted quote')
  })

  it('fails closed across lifecycle, organization, and simulation boundaries', () => {
    expect(migration).toContain('Accepted quote simulation scope does not match RFQ')
    expect(migration).toContain('Accepted quote actor simulation scope does not match RFQ')
    expect(migration).toContain('Customer organization boundary does not match RFQ')
    expect(migration).toContain('Vendor organization boundary does not match accepted quote')
    expect(migration).toContain('outside the Rental Order lifecycle boundary')
    expect(migration).toContain("customer_organization_state IN ('recorded', 'unknown')")
  })

  it('uses explicit grants and party-scoped read-only RLS', () => {
    expect(migration).toContain('ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE public.rental_order_versions ENABLE ROW LEVEL SECURITY')
    expect(migration).toMatch(
      /REVOKE ALL PRIVILEGES ON TABLE public\.rental_orders[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT SELECT ON TABLE public\.rental_orders TO authenticated, service_role/,
    )
    expect(migration).toContain('rental_orders_select_parties')
    expect(migration).toContain('public.is_demo_actor((SELECT auth.uid())) = is_simulated')
    expect(migration).not.toContain('GRANT ALL')
  })

  it('keeps all unresolved downstream authorities explicitly disabled', () => {
    expect(migration).toContain("'purchase_order_authority', false")
    expect(migration).toContain("'extension_authority', false")
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).toContain("'closeout_authority', false")
    expect(migration).toContain("'granular_scope_authority', false")
    expect(migration).not.toContain('purchase_order_number')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('custody_transferred_at')
    expect(migration).not.toContain('closeout_approved_at')
  })

  it('backfills prior accepted quotes through the same fail-closed materializer', () => {
    expect(migration).toMatch(
      /WHERE quote\.status = 'accepted'[\s\S]*PERFORM private\.materialize_rental_order_from_accepted_quote\(v_quote\.id\)/,
    )
    expect(migration).toContain('Any contradictory historical row fails the migration closed')
  })
})
