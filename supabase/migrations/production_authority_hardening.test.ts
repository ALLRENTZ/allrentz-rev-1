import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260813005114_production_authority_hardening.sql'),
  'utf8',
)

describe('production rental authority hardening migration', () => {
  it('adds the six actor and audit foreign-key indexes', () => {
    for (const index of [
      'idx_field_acceptances_accepted_by',
      'idx_field_acceptances_audit_event',
      'idx_off_rent_requests_requested_by',
      'idx_off_rent_requests_audit_event',
      'idx_off_rent_acknowledgments_acknowledged_by',
      'idx_off_rent_acknowledgments_audit_event',
    ]) {
      expect(migration).toContain(`CREATE INDEX IF NOT EXISTS ${index}`)
    }
  })

  it('uses initialization-plan auth calls without changing profile ownership', () => {
    expect(migration).toContain('ALTER POLICY "Users view own profile"')
    expect(migration).not.toContain('ALTER POLICY "Users update own profile"')
    expect(migration).not.toContain('ALTER POLICY "Users insert own profile"')
    expect(migration.match(/\(SELECT auth\.uid\(\)\)/g)?.length).toBeGreaterThanOrEqual(18)
    expect(migration).not.toMatch(/(?<!SELECT )auth\.uid\(\)/)
  })

  it('preserves only the verified authenticated table reads', () => {
    expect(migration).not.toContain(
      'REVOKE SELECT ON TABLE public.rental_off_rent_requests FROM authenticated',
    )

    for (const table of [
      'rental_field_acceptances',
      'rental_off_rent_acknowledgments',
      'rental_stop_evaluator_versions',
      'rental_stop_rule_versions',
      'rental_stop_term_snapshots',
      'rental_stop_readiness_declarations',
      'rental_stop_evaluation_attempts',
      'rental_stop_determinations',
    ]) {
      expect(migration).toContain(
        `REVOKE SELECT ON TABLE public.${table} FROM authenticated`,
      )
    }
  })

  it('removes direct field-acceptance service-role table privileges', () => {
    expect(migration).toContain(
      'REVOKE ALL PRIVILEGES ON TABLE public.rental_field_acceptances FROM service_role',
    )
    expect(migration).toContain('DROP POLICY IF EXISTS "field_acceptances_service"')
    expect(migration).not.toContain('GRANT ALL')
  })

  it('consolidates overlapping policies and preserves simulation isolation', () => {
    for (const policy of [
      'off_rent_requests_select_authorized',
      'off_rent_acknowledgments_select_authorized',
      'stop_term_snapshots_select_authorized',
      'stop_readiness_select_authorized',
      'stop_attempts_select_authorized',
      'stop_determinations_select_authorized',
    ]) {
      expect(migration).toContain(`CREATE POLICY "${policy}"`)
    }

    expect(migration.match(/public\.is_demo_actor\(\(SELECT auth\.uid\(\)\)\)/g)?.length).toBe(7)
    expect(migration).toContain('OR public.rfq_vendor_has_accepted_quote(rfq_id)')
  })

  it('does not expand contractual, override, billing, or granular authority', () => {
    expect(migration).not.toContain('INSERT INTO public.rental_stop_rule_versions')
    expect(migration).not.toContain('CREATE OR REPLACE FUNCTION')
    expect(migration).not.toContain('off_rent_at =')
    expect(migration).not.toContain('billable_through_at =')
    expect(migration).not.toMatch(/rental_(line|item|kit|component|quantity)/)
  })
})
