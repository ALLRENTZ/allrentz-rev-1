import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260819213451_pickup_exception_triage.sql'),
  'utf8',
)

describe('non-authoritative pickup exception triage contract', () => {
  it('creates an immutable RFQ-wide triage event ledger', () => {
    expect(migration).toContain('CREATE TABLE public.rental_pickup_exception_triage_events')
    expect(migration).toContain('rental_pickup_exception_triage_events_immutable')
    expect(migration).toContain('FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)')
    expect(migration).toContain("v_rfq.object_scope <> 'rfq'")
  })

  it('keeps direct Data API writes closed', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_exception_triage_events',
    )
    expect(migration).toContain(
      'GRANT SELECT ON TABLE public.rental_pickup_exception_triage_events TO service_role',
    )
    expect(migration).not.toContain('GRANT ALL')
    expect(migration).not.toMatch(/GRANT [^;]+ TO authenticated;/)
  })

  it('uses only protected active operations roles for triage', () => {
    expect(migration).toContain('public.pickup_exception_triage_actor')
    expect(migration).toContain("ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)")
    expect(migration).toContain("p.status = 'active'")
    expect(migration).toContain('public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated')
  })

  it('allows only claim-self, notes, and governed escalation', () => {
    expect(migration).toContain("v_action NOT IN ('claim', 'note', 'escalate')")
    expect(migration).toContain('reassignment is not authorized')
    expect(migration).toContain('must be claimed before notes or escalation')
    expect(migration).toContain('Pickup exception escalation reason must be governed')
  })

  it('is atomic, idempotent, and append-only', () => {
    expect(migration).toContain('FOR UPDATE OF rr')
    expect(migration).toContain('UNIQUE (pickup_task_id, idempotency_key)')
    expect(migration).toContain("'idempotent_replay', true")
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
  })

  it('contains no resolution, custody, billing, return, or granular authority', () => {
    expect(migration).toContain("'resolution_state', 'blocked'")
    expect(migration).toContain("'resolution_authority', false")
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).not.toContain('UPDATE public.rental_requests')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toMatch(/CREATE OR REPLACE FUNCTION[^\n]*resolve/i)
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
