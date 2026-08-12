import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { validateRentalStopAction } from './rentalStopPolicy'

const adapter = readFileSync(resolve(process.cwd(), 'supabase/functions/rental-stop/index.ts'), 'utf8')
const supabaseConfig = readFileSync(resolve(process.cwd(), 'supabase/config.toml'), 'utf8')

const ids = {
  rfq: '00000000-0000-4000-8000-000000000001',
  quote: '00000000-0000-4000-8000-000000000002',
  rule: '00000000-0000-4000-8000-000000000003',
  request: '00000000-0000-4000-8000-000000000004',
  customerOrg: '00000000-0000-4000-8000-000000000005',
  vendorOrg: '00000000-0000-4000-8000-000000000006',
}

describe('rental-stop backend adapter policy', () => {
  it('requires gateway and in-function user authentication', () => {
    expect(supabaseConfig).toMatch(/\[functions\.rental-stop\]\s+verify_jwt = true/)
    expect(adapter).toContain("authHeader?.startsWith('Bearer ')")
    expect(adapter).toContain('await userClient.auth.getUser()')
    expect(adapter).toContain('p_actor_id: user.id')
  })

  it('keeps the backend secret in the function and logs no request payload', () => {
    expect(adapter).toContain('selectSecretKey(')
    expect(adapter).toContain("console.error('rental-stop command failed', { code:")
    expect(adapter).not.toContain('console.log(body)')
    expect(adapter).not.toContain('console.error(error)')
  })

  it('accepts a determination without allowing the caller to choose its result', () => {
    const result = validateRentalStopAction({
      action: 'determine',
      rfq_id: ids.rfq,
      idempotency_key: 'determine-0001',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.rpc).toBe('determine_rental_stop_and_transition')
    expect(result.input?.params).toEqual({
      p_rfq_id: ids.rfq,
      p_idempotency_key: 'determine-0001',
    })
  })

  it('does not expose a governed override action', () => {
    expect(validateRentalStopAction({
      action: 'override',
      rfq_id: ids.rfq,
      idempotency_key: 'override-0001',
    })).toEqual({ valid: false, error: 'Unsupported rental-stop action' })
  })

  it('rejects unilateral platform-policy publication', () => {
    const result = validateRentalStopAction({
      action: 'publish_rule',
      rule_code: 'test.rule',
      display_name: 'Test rule',
      visibility: 'organization_pair',
      customer_organization_id: ids.customerOrg,
      vendor_organization_id: ids.vendorOrg,
      trigger_basis: 'request_received',
      billing_treatment: 'exact_timestamp',
      evaluator_key: 'postgres.exact_timestamp',
      evaluator_version: 1,
      evaluator_sha256: 'a'.repeat(64),
      rule_parameters: {},
      source_kind: 'platform_policy',
      source_reference: 'unsupported',
      source_sha256: 'b'.repeat(64),
      effective_from: '2026-08-11T00:00:00Z',
      is_simulated: true,
      idempotency_key: 'publish-rule-0001',
    })

    expect(result).toEqual({
      valid: false,
      error: 'source_kind must be evidence-backed; platform_policy is not authorized',
    })
  })

  it('requires complete evaluator provenance for determinate rules', () => {
    const result = validateRentalStopAction({
      action: 'publish_rule',
      rule_code: 'test.rule',
      display_name: 'Test rule',
      visibility: 'platform',
      trigger_basis: 'request_received',
      billing_treatment: 'exact_timestamp',
      evaluator_key: 'postgres.exact_timestamp',
      evaluator_version: 1,
      rule_parameters: {},
      source_kind: 'accepted_contract',
      source_reference: 'contract-1',
      source_sha256: 'b'.repeat(64),
      effective_from: '2026-08-11T00:00:00Z',
      idempotency_key: 'publish-rule-0002',
    })

    expect(result).toEqual({ valid: false, error: 'Evaluator identity must be complete and valid' })
  })

  it('requires a source reference and digest for evaluator publication', () => {
    const result = validateRentalStopAction({
      action: 'publish_evaluator',
      evaluator_key: 'postgres.exact_timestamp.v2',
      artifact_sha256: 'a'.repeat(64),
      source_kind: 'backend_artifact',
      source_reference: 'backend/rental-stop/exact-timestamp-v2',
      source_sha256: 'b'.repeat(64),
      supported_trigger_bases: ['request_received'],
      billing_treatment: 'exact_timestamp',
      definition: { contract: 'test' },
      lifecycle_state: 'active',
      effective_from: '2026-08-11T00:00:00Z',
      is_simulated: true,
      idempotency_key: 'publish-evaluator-0001',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.params['p_source_kind']).toBe('backend_artifact')
    expect(result.input?.params['p_source_sha256']).toBe('b'.repeat(64))
  })

  it('accepts a complete accepted-term command', () => {
    const result = validateRentalStopAction({
      action: 'accept_terms',
      rfq_id: ids.rfq,
      accepted_quote_id: ids.quote,
      rule_version_id: ids.rule,
      time_zone: 'America/Chicago',
      currency_code: 'usd',
      terms_payload: { source: 'quote' },
      terms_sha256: 'c'.repeat(64),
      idempotency_key: 'accept-terms-0001',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.params['p_currency_code']).toBe('USD')
  })

  it('requires explicit readiness states and array evidence', () => {
    const result = validateRentalStopAction({
      action: 'declare_readiness',
      rfq_id: ids.rfq,
      off_rent_request_id: ids.request,
      isolation_state: 'confirmed',
      drained_state: 'confirmed',
      safe_access_state: 'confirmed',
      operating_state: 'unknown',
      component_manifest: {},
      evidence_refs: [],
      declaration_sha256: 'd'.repeat(64),
      idempotency_key: 'readiness-0001',
    })

    expect(result).toEqual({
      valid: false,
      error: 'component_manifest and evidence_refs must be arrays',
    })
  })

  it('passes an immutable readiness declaration digest to the database command', () => {
    const result = validateRentalStopAction({
      action: 'declare_readiness',
      rfq_id: ids.rfq,
      off_rent_request_id: ids.request,
      isolation_state: 'confirmed',
      drained_state: 'confirmed',
      safe_access_state: 'confirmed',
      operating_state: 'unknown',
      component_manifest: [],
      evidence_refs: [],
      declaration_sha256: 'd'.repeat(64),
      idempotency_key: 'readiness-0002',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.params['p_declaration_sha256']).toBe('d'.repeat(64))
  })

  it('rejects malformed identifiers and short idempotency keys', () => {
    expect(validateRentalStopAction({
      action: 'determine',
      rfq_id: 'not-a-uuid',
      idempotency_key: 'short',
    })).toEqual({
      valid: false,
      error: 'idempotency_key must contain between 8 and 200 characters',
    })
  })
})
