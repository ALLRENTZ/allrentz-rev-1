import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828115241_customer_purchase_order_recording.sql'),
  'utf8',
)

describe('customer-owned purchase-order recording migration', () => {
  it('creates one immutable RFQ-wide customer assertion per Rental Order', () => {
    expect(migration).toContain('CREATE TABLE public.rental_customer_purchase_order_records')
    expect(migration).toContain('rental_order_id            uuid NOT NULL UNIQUE')
    expect(migration).toContain('rfq_id                     uuid NOT NULL UNIQUE')
    expect(migration).toContain('rental_customer_purchase_order_records_immutable')
    expect(migration).toContain('amendment authority is not implemented')
  })

  it('enforces the command in the database with atomic audit and idempotency', () => {
    expect(migration).toContain('CREATE OR REPLACE FUNCTION public.record_rental_customer_purchase_order')
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
    expect(migration).toContain("'purchase_order.customer_recorded'")
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain("SET search_path = ''")
  })

  it('fails closed across customer organization, lifecycle, and simulation boundaries', () => {
    expect(migration).toContain("profile.status = 'active'")
    expect(migration).toContain('Active customer profile authority is required')
    expect(migration).toContain('has no established customer organization authority')
    expect(migration).toContain('actor simulation scope does not match Rental Order')
    expect(migration).toContain('lacks customer purchase-order authority')
    expect(migration).toContain('outside the customer PO-recording lifecycle boundary')
  })

  it('does not create downstream PO, release, billing, or granular authority', () => {
    for (const boundary of [
      "'platform_issued', false",
      "'external_issuance_validated', false",
      "'release_authority', false",
      "'billing_authority', false",
      "'financial_posting_authority', false",
      "'amendment_authority', false",
      "'document_sufficiency_authority', false",
      "'granular_scope_authority', false",
    ]) expect(migration).toContain(boundary)
  })

  it('exposes no direct client mutation or unsanitized client table read', () => {
    expect(migration).toMatch(/REVOKE ALL PRIVILEGES[\s\S]*FROM PUBLIC, anon, authenticated, service_role/)
    expect(migration).toContain('GRANT SELECT')
    expect(migration).toContain('TO service_role')
    expect(migration).toMatch(/REVOKE EXECUTE ON FUNCTION public\.record_rental_customer_purchase_order\([\s\S]*FROM PUBLIC, anon, authenticated, service_role/)
    expect(migration).toMatch(/GRANT EXECUTE ON FUNCTION public\.record_rental_customer_purchase_order\([\s\S]*TO service_role/)
  })
})
