import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260807112259_field_acceptance_authority.sql'),
  'utf8',
)

describe('field acceptance database authority contract', () => {
  it('keeps evidence writes and the RPC behind service role', () => {
    expect(migration).toContain(
      'REVOKE ALL ON public.rental_field_acceptances FROM PUBLIC, anon, authenticated',
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_field_acceptance[\s\S]*FROM PUBLIC, anon, authenticated/,
    )
    expect(migration).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.record_rental_field_acceptance[\s\S]*TO service_role/,
    )
  })

  it('requires customer authority and all acceptance evidence before writes', () => {
    expect(migration).toContain("v_rfq.operational_status <> 'in_transit'")
    expect(migration).toContain("om.role IN ('owner', 'admin', 'member')")
    expect(migration).toContain('At least one delivery evidence reference is required')
    expect(migration).toContain('All field acceptance confirmations are required')
  })

  it('records acceptance and the system-owned on-rent transition atomically', () => {
    expect(migration).toContain('INSERT INTO public.rental_field_acceptances')
    expect(migration).toContain("p_actor_role                       := 'system'")
    expect(migration).toContain("SET operational_status = 'on_rent'")
    expect(migration).toContain('on_rent_at = v_accepted_at')
  })
})
