import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260807220110_rental_clock_contract_foundation.sql'),
  'utf8',
)
const migrationBeforeRuleCommand = migration.split(
  'CREATE OR REPLACE FUNCTION public.publish_rental_stop_rule_version',
)[0]

describe('rental-clock contract foundation migration', () => {
  it('creates immutable evaluator, rule, term, readiness, attempt, and determination records', () => {
    expect(migration).toContain('CREATE TABLE public.rental_stop_evaluator_versions')
    expect(migration).toContain('CREATE TABLE public.rental_stop_rule_versions')
    expect(migration).toContain('CREATE TABLE public.rental_stop_term_snapshots')
    expect(migration).toContain('CREATE TABLE public.rental_stop_readiness_declarations')
    expect(migration).toContain('CREATE TABLE public.rental_stop_evaluation_attempts')
    expect(migration).toContain('CREATE TABLE public.rental_stop_determinations')
    expect(migration).toContain('UNIQUE (rule_code, version)')
    expect(migration).toContain('UNIQUE (rfq_id, snapshot_version)')
    expect(migration).toContain('UNIQUE (rfq_id, idempotency_key)')
    expect(migration).toContain('UNIQUE (rfq_id, determination_version)')
    expect(migration).toContain('source_reference        text NOT NULL')
    expect(migration).toContain('source_sha256           text NOT NULL')
    expect(migration).toContain('declaration_sha256       text NOT NULL')
  })

  it('preserves unknown contractual states and blocks their determination', () => {
    expect(migration).toContain("'unknown',")
    expect(migration).toContain(
      "Stop determination is blocked while contractual trigger or billing treatment is UNKNOWN",
    )
    expect(migration).toContain("'STOP_RULE_UNKNOWN'")
    expect(migrationBeforeRuleCommand).not.toContain('INSERT INTO public.rental_stop_rule_versions')
  })

  it('requires recognized contract time zones and evidence-selected timestamps', () => {
    expect(migration).toContain('FROM pg_catalog.pg_timezone_names AS tz')
    expect(migration).toContain(
      'Stop effective timestamp must equal the evidence selected by the accepted trigger rule',
    )
    expect(migration).toContain(
      'Physical-pickup determination is blocked until governed pickup evidence exists',
    )
  })

  it('keeps writes server-only while allowing RLS-scoped reads', () => {
    for (const table of [
      'rental_stop_evaluator_versions',
      'rental_stop_rule_versions',
      'rental_stop_term_snapshots',
      'rental_stop_readiness_declarations',
      'rental_stop_evaluation_attempts',
      'rental_stop_determinations',
    ]) {
      expect(migration).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`)
      expect(migration).toContain(
        `REVOKE ALL ON public.${table} FROM PUBLIC, anon, authenticated`,
      )
      expect(migration).toContain(`GRANT SELECT ON public.${table} TO authenticated`)
    }

    expect(migration).not.toContain('GRANT ALL ON public.rental_stop_')
    expect(migration).not.toContain('GRANT SELECT, INSERT ON public.rental_stop_')
    expect(migration).not.toContain('GRANT INSERT ON public.rental_stop_')
    expect(migration).not.toContain('GRANT UPDATE ON public.rental_stop_')
    expect(migration).not.toContain('GRANT DELETE ON public.rental_stop_')
    expect(migration).toContain(
      'GRANT EXECUTE ON FUNCTION public.determine_rental_stop_and_transition(uuid, uuid, text)',
    )
    expect(migration).toContain('REVOKE INSERT, UPDATE, DELETE ON public.rental_off_rent_requests')
    expect(migration).toContain(
      'REVOKE INSERT, UPDATE, DELETE ON public.rental_off_rent_acknowledgments',
    )
  })

  it('applies the repository demo boundary to every authenticated authority read', () => {
    expect(migration.match(/public\.is_demo_actor\(\(SELECT auth\.uid\(\)\)\)/g)?.length).toBe(10)
  })

  it('makes governed records immutable and corrections append-only', () => {
    expect(migration).toContain('reject_rental_clock_immutable_change')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON public.rental_stop_rule_versions')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON public.rental_stop_term_snapshots')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON public.rental_stop_evaluation_attempts')
    expect(migration).toContain('BEFORE UPDATE OR DELETE ON public.rental_stop_determinations')
    expect(migration).toContain('predecessor_rule_version_id')
    expect(migration).toContain('predecessor_evaluator_version_id')
    expect(migration).toContain('supersedes_term_snapshot_id')
    expect(migration).toContain('supersedes_readiness_declaration_id')
    expect(migration).toContain('supersedes_determination_id')
  })

  it('records evaluator provenance and separates attempts from determinations', () => {
    expect(migration).toContain("'postgres.exact_timestamp'")
    expect(migration).toContain(
      "'766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb'",
    )
    expect(migration).toContain('evaluation_attempt_id')
    expect(migration).toContain("'source_kind', p_source_kind")
    expect(migration).toContain("'declaration_sha256', p_declaration_sha256")
    expect(migration).toContain("p_event_type                       := 'stoprent.rule_applied'")
    expect(migration).toContain("p_event_type                       := 'stoprent.determination_blocked'")
  })

  it('indexes every governed foreign-key lookup in constraint column order', () => {
    expect(migration).toContain('CREATE INDEX idx_stop_rule_versions_vendor')
    expect(migration.match(/evaluator_key, evaluator_version, evaluator_sha256/g)?.length).toBe(7)
  })

  it('serializes and idempotently executes only the governed demobilizing to off-rent command', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION public.determine_rental_stop_and_transition',
    )
    expect(migration).toContain('FOR UPDATE;')
    expect(migration).toContain('UNIQUE (rfq_id, idempotency_key)')
    expect(migration).toContain("v_rfq.operational_status <> 'demobilizing'")
    expect(migration).toContain("SET operational_status = 'off_rent',")
    expect(migration).toContain('off_rent_at = v_stop_effective_at')
    expect(migration).toContain('rental_requests_governed_off_rent_transition')
    expect(migration).toContain('app.rental_stop_determination_id')
    expect(migration).not.toContain('PERFORM public.transition_rfq_status')
  })

  it('exposes only controlled backend commands for governed writes', () => {
    for (const command of [
      'publish_rental_stop_evaluator_version',
      'publish_rental_stop_rule_version',
      'accept_rental_stop_term_snapshot',
      'record_rental_stop_readiness_declaration',
      'determine_rental_stop_and_transition',
    ]) {
      expect(migration).toContain(`CREATE OR REPLACE FUNCTION public.${command}`)
    }

    expect(migration).toContain('pg_advisory_xact_lock')
    expect(migration).toContain('p_expected_predecessor_id')
    expect(migration).toContain('idempotent_replay')
    expect(migration).toContain('rental_stop_actor_authority')
    expect(migration).toContain('initiated_by')
  })

  it('fails closed for undefined platform policy and override authority', () => {
    expect(migration).toContain(
      'Platform stop-rent policy authority is UNKNOWN and fails closed',
    )
    expect(migration).not.toContain('override_rental_stop')
    expect(migration).not.toContain('rental_stop_override')
  })

  it('keeps unsupported contractual treatments fail-closed', () => {
    expect(migration).toContain("v_terms.billing_treatment <> 'exact_timestamp'")
    expect(migration).toContain("v_terms.trigger_basis IN ('physical_pickup', 'contract_specific')")
    expect(migration).toContain("v_blocker_code := 'MISSING_TRIGGER_EVIDENCE'")
  })
})
