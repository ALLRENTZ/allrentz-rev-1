import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

import { normalizeFieldAcceptanceStatus } from './fieldAcceptanceStatus'

const recorded = {
  authority: 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION',
  scope: 'RFQ_WIDE',
  current_status: 'on_rent',
  field_acceptance_state: 'RECORDED',
  delivery_evidence_state: 'RECORDED_NOT_EXPOSED',
  on_rent_determination: 'SYSTEM_RECORDED',
  accepted_at: '2026-08-27T03:00:00.000Z',
  next_step: 'MONITOR_RENTAL',
  authority_boundary: {
    mutations_permitted: false,
    billing_calculation_authority: false,
    custody_authority: false,
    condition_liability_authority: false,
    legal_evidence_sufficiency_authority: false,
    granular_object_authority: false,
  },
}

describe('field acceptance status projection', () => {
  it('accepts a strict recorded projection', () => {
    expect(normalizeFieldAcceptanceStatus(recorded)).toEqual(recorded)
  })

  it('accepts a fail-closed awaiting-customer projection', () => {
    expect(normalizeFieldAcceptanceStatus({
      ...recorded,
      current_status: 'in_transit',
      field_acceptance_state: 'AWAITING_CUSTOMER',
      delivery_evidence_state: 'UNKNOWN',
      on_rent_determination: 'NOT_RECORDED',
      accepted_at: null,
      next_step: 'CUSTOMER_FIELD_ACCEPTANCE',
    })).toMatchObject({
      field_acceptance_state: 'AWAITING_CUSTOMER',
      accepted_at: null,
    })
  })

  it('rejects inconsistent timestamps, states, and expanded authority', () => {
    expect(normalizeFieldAcceptanceStatus({ ...recorded, accepted_at: null })).toBeNull()
    expect(normalizeFieldAcceptanceStatus({
      ...recorded,
      authority_boundary: { ...recorded.authority_boundary, custody_authority: true },
    })).toBeNull()
    expect(normalizeFieldAcceptanceStatus({
      ...recorded,
      field_acceptance_state: 'AWAITING_CUSTOMER',
    })).toBeNull()
  })
})
