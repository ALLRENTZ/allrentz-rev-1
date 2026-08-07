import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260807113622_off_rent_request_acknowledgment_authority.sql'),
  'utf8',
)

describe('off-rent database authority contract', () => {
  it('keeps both evidence write paths behind service role', () => {
    expect(migration).toContain(
      'REVOKE ALL ON public.rental_off_rent_requests FROM PUBLIC, anon, authenticated',
    )
    expect(migration).toContain(
      'REVOKE ALL ON public.rental_off_rent_acknowledgments FROM PUBLIC, anon, authenticated',
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_off_rent_request[\s\S]*TO service_role/,
    )
    expect(migration).toMatch(
      /REVOKE EXECUTE ON FUNCTION public\.record_rental_off_rent_acknowledgment[\s\S]*TO service_role/,
    )
  })

  it('requires customer authority and pickup availability before the request transition', () => {
    expect(migration).toContain("v_rfq.operational_status <> 'on_rent'")
    expect(migration).toContain('lacks customer off-rent authority')
    expect(migration).toContain('Pickup availability end must be after its start')
    expect(migration).toContain("SET operational_status = 'off_rent_requested'")
  })

  it('requires accepted-vendor authority before acknowledgment and demobilization', () => {
    expect(migration).toContain("vqr.status = 'accepted'")
    expect(migration).toContain("org.org_type IN ('vendor', 'both')")
    expect(migration).toContain('lacks accepted-vendor acknowledgment authority')
    expect(migration).toContain("SET operational_status = 'demobilizing'")
  })

  it('does not determine the stop-rent timestamp', () => {
    expect(migration).not.toContain("SET operational_status = 'off_rent'")
    expect(migration).not.toContain('off_rent_at =')
  })
})
