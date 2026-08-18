import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260817193000_pickup_dispatch_field_progress.sql'),
  'utf8',
)

describe('governed PickupTask dispatch and field-progress contract', () => {
  it('creates an immutable append-only RFQ-wide dispatch ledger', () => {
    expect(migration).toContain('CREATE TABLE public.rental_pickup_dispatch_events')
    expect(migration).toContain('rental_pickup_dispatch_events_immutable')
    expect(migration).toContain('FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)')
    expect(migration).toContain("IF v_rfq.object_scope <> 'rfq'")
  })

  it('keeps direct client writes closed and grants service role read-only projection access', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_dispatch_events',
    )
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.rental_pickup_dispatch_events TO service_role',
    )
    expect(migration).not.toContain('GRANT ALL')
  })

  it('publishes only service-role controlled dispatch commands', () => {
    for (const command of [
      'assign_rental_pickup_field_actor',
      'record_rental_pickup_dispatch_progress',
    ]) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${command}`)
      expect(migration).toMatch(
        new RegExp(`REVOKE EXECUTE ON FUNCTION public\\.${command}[\\s\\S]*TO service_role`),
      )
    }
  })

  it('requires confirmed schedule, accepted vendor, membership, and simulation authority', () => {
    expect(migration).toContain("v_latest_schedule.event_type <> 'schedule_confirmed'")
    expect(migration).toContain("vqr.status = 'accepted'")
    expect(migration).toContain("membership.role IN ('owner', 'admin')")
    expect(migration).toContain("membership.role IN ('owner', 'admin', 'member')")
    expect(migration.match(/simulation scope does not match RFQ/g)).toHaveLength(2)
  })

  it('allows only self-assignment and the assigned actor to advance strict progress', () => {
    expect(migration).toContain("assigned_actor_id = p_actor_id")
    expect(migration).toContain("v_latest_event.assigned_actor_id <> p_actor_id")
    expect(migration).toContain("WHEN 'en_route' THEN 'field_actor_assigned'")
    expect(migration).toContain("ELSE 'en_route_recorded'")
    expect(migration).toContain('reassignment is not authorized')
  })

  it('is idempotent and serializes commands on the parent RFQ', () => {
    expect(migration.match(/FOR UPDATE OF rr/g)).toHaveLength(2)
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration.match(/'idempotent_replay', true/g)).toHaveLength(2)
    expect(migration.match(/idempotency key conflicts with an existing command/g)).toHaveLength(2)
  })

  it('does not create billing, custody, stop-rule, override, or granular authority', () => {
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('INSERT INTO public.rental_stop_rule_versions')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*override/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
