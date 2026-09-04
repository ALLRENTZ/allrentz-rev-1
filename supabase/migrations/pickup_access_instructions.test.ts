import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260821103344_pickup_access_instructions.sql'),
  'utf8',
)

describe('governed RFQ-wide pickup access-instruction contract', () => {
  it('creates an immutable append-only RFQ-wide instruction ledger', () => {
    expect(migration).toContain('CREATE TABLE public.rental_pickup_access_instruction_events')
    expect(migration).toContain('rental_pickup_access_instruction_events_immutable')
    expect(migration).toContain('FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)')
    expect(migration).toContain("object_scope = 'rfq'")
  })

  it('closes direct clients and exposes only service-role projection reads', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_access_instruction_events',
    )
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.rental_pickup_access_instruction_events TO service_role',
    )
    expect(migration).not.toContain('GRANT ALL')
  })

  it('publishes only the service-role controlled command', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.record_rental_pickup_access_instructions',
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_pickup_access_instructions[\s\S]*TO service_role/,
    )
  })

  it('requires customer relationship, lifecycle, simulation, and PickupTask scope', () => {
    expect(migration).toContain("membership.role IN ('owner', 'admin', 'member')")
    expect(migration).toContain('must be demobilizing or off_rent before pickup access instructions')
    expect(migration).toContain('actor simulation scope does not match RFQ')
    expect(migration).toContain("object_scope = 'rfq'")
  })

  it('is atomic, idempotent, validated, and audited', () => {
    expect(migration).toContain('FOR UPDATE')
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain('length(btrim(instructions)) BETWEEN 1 AND 4000')
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
  })

  it('records coordination only and never financial, custody, resolution, or granular authority', () => {
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).toContain("'granular_scope_authority', false")
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*override/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
