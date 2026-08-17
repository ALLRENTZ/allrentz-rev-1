import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260817160602_pickup_task_operational_slice.sql'),
  'utf8',
)

describe('governed PickupTask database contract', () => {
  it('creates an RFQ-wide immutable task and append-only schedule ledger', () => {
    expect(migration).toContain('CREATE TABLE public.rental_pickup_tasks')
    expect(migration).toContain('CREATE TABLE public.rental_pickup_schedule_events')
    expect(migration).toContain("CHECK (object_scope = 'rfq')")
    expect(migration).toContain('rental_pickup_tasks_immutable')
    expect(migration).toContain('rental_pickup_schedule_events_immutable')
  })

  it('keeps direct client writes closed and grants service role read-only projection access', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_tasks',
    )
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_schedule_events',
    )
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.rental_pickup_tasks TO service_role',
    )
    expect(migration).not.toContain('GRANT ALL')
  })

  it('publishes only service-role controlled schedule commands', () => {
    for (const command of [
      'propose_rental_pickup_schedule',
      'respond_rental_pickup_schedule',
    ]) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${command}`)
      expect(migration).toMatch(
        new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${command}[\\s\\S]*TO service_role`),
      )
    }
  })

  it('requires accepted-vendor, customer, RFQ, relationship, and simulation authority', () => {
    expect(migration).toContain("vqr.status = 'accepted'")
    expect(migration).toContain("membership.role IN ('owner', 'admin')")
    expect(migration.match(/membership\.role IN \('owner', 'admin', 'member'\)/g)).toHaveLength(1)
    expect(migration).toContain("'vendor_scheduler', 'customer'")
    expect(migration).toContain('lacks customer pickup schedule response authority')
    expect(migration.match(/must be demobilizing or off_rent/g)?.length).toBe(2)
    expect(migration).toContain('off_rent_request_id, rfq_id, is_simulated')
    expect(migration).toContain('actor simulation scope does not match RFQ')
  })

  it('requires governed reason codes for replacement proposals and rejections', () => {
    for (const reasonCode of [
      'customer_access_conflict', 'vendor_capacity', 'site_restriction',
      'weather_or_safety', 'equipment_not_ready', 'contact_issue', 'other',
    ]) {
      expect(migration).toContain(`'${reasonCode}'`)
    }
    expect(migration).toContain(
      'A structured reason code is required when proposing a replacement pickup schedule',
    )
    expect(migration).toContain(
      'A structured reason code and notes are required when rejecting a pickup schedule',
    )
  })

  it('is idempotent and serializes commands on the parent RFQ', () => {
    expect(migration.match(/FOR UPDATE/g)?.length).toBe(2)
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain('idempotency key conflicts with an existing command')
  })

  it('does not create financial, lifecycle, override, or granular authority', () => {
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('INSERT INTO public.rental_stop_rule_versions')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*override/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
