import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}))
import {
  formatLifecycleStatus,
  lifecycleReviewLabel,
  normalizeOperationsLifecycleProjection,
} from './operationsLifecycle'

const projection = {
  authority: 'READ_ONLY_OPERATIONS_PROJECTION',
  scope: 'RFQ_WIDE',
  mode: 'PRODUCTION',
  generated_at: '2026-08-26T12:00:00.000Z',
  authority_boundary: {
    mutations_permitted: false,
    billing_authority: false,
    custody_authority: false,
    granular_object_authority: false,
    release_authority: false,
  },
  items: [{
    rfq_id: 'rfq-1',
    current_status: 'on_rent',
    created_at: '2026-08-25T12:00:00.000Z',
    updated_at: '2026-08-26T11:00:00.000Z',
    pre_dispatch: null,
    field_acceptance: {
      authority: 'READ_ONLY_FIELD_ACCEPTANCE_PROJECTION',
      scope: 'RFQ_WIDE',
      current_status: 'on_rent',
      field_acceptance_state: 'RECORDED',
      delivery_evidence_state: 'RECORDED_NOT_EXPOSED',
      on_rent_determination: 'SYSTEM_RECORDED',
      accepted_at: '2026-08-26T11:00:00.000Z',
      next_step: 'MONITOR_RENTAL',
      authority_boundary: {
        mutations_permitted: false,
        billing_calculation_authority: false,
        custody_authority: false,
        condition_liability_authority: false,
        legal_evidence_sufficiency_authority: false,
        granular_object_authority: false,
      },
    },
    timeline: [
      {
        previous_status: 'in_transit',
        new_status: 'on_rent',
        created_at: '2026-08-26T11:00:00.000Z',
      },
    ],
  }],
}

describe('operations lifecycle projection', () => {
  it('accepts the canonical sanitized read-only projection', () => {
    expect(normalizeOperationsLifecycleProjection(projection)).toEqual(projection)
  })

  it('rejects invented status and authority expansion', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], current_status: 'picked_up' }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      authority_boundary: { ...projection.authority_boundary, billing_authority: true },
    })).toBeNull()
  })

  it('rejects contradictory or out-of-order history', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], current_status: 'off_rent' }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{
        ...projection.items[0],
        timeline: [
          ...projection.items[0].timeline,
          {
            previous_status: 'on_rent',
            new_status: 'rental_extended',
            created_at: '2026-08-25T11:00:00.000Z',
          },
        ],
      }],
    })).toBeNull()
  })

  it('accepts a blocked pre-dispatch packet without creating release authority', () => {
    const preDispatchItem = {
      ...projection.items[0],
      current_status: 'vendor_confirmed',
      field_acceptance: null,
      pre_dispatch: {
        authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
        scope: 'RFQ_WIDE',
        packet_state: 'REVIEW_REQUIRED',
        release_readiness: 'BLOCKED',
        release_authority: 'NOT_IMPLEMENTED',
        accepted_quote_state: 'RECORDED',
        vendor_confirmation_state: 'RECORDED',
        requirements: [
          { key: 'twic', requirement_status: 'REQUIRED', evidence_status: 'UNKNOWN' },
          { key: 'isnet', requirement_status: 'NOT_REQUIRED', evidence_status: 'NOT_APPLICABLE' },
          { key: 'purchase_order', requirement_status: 'UNKNOWN', evidence_status: 'UNKNOWN' },
        ],
        extra_authority: false,
      },
      timeline: [{
        previous_status: 'quote_accepted',
        new_status: 'vendor_confirmed',
        created_at: '2026-08-26T11:00:00.000Z',
      }],
    }
    const normalized = normalizeOperationsLifecycleProjection({
      ...projection,
      items: [preDispatchItem],
    })
    expect(normalized?.items[0].pre_dispatch?.release_readiness).toBe('BLOCKED')
    expect(normalized?.items[0].pre_dispatch).not.toHaveProperty('extra_authority')
  })

  it('rejects missing, misplaced, or authority-expanding pre-dispatch evidence', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], current_status: 'vendor_confirmed' }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{
        ...projection.items[0],
        pre_dispatch: {
          authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
          scope: 'RFQ_WIDE',
          packet_state: 'REVIEW_REQUIRED',
          release_readiness: 'BLOCKED',
          release_authority: 'NOT_IMPLEMENTED',
          accepted_quote_state: 'RECORDED',
          vendor_confirmation_state: 'RECORDED',
          requirements: [],
        },
      }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      authority_boundary: { ...projection.authority_boundary, release_authority: true },
    })).toBeNull()
  })

  it('rejects missing, misplaced, or authority-expanding field acceptance status', () => {
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{ ...projection.items[0], field_acceptance: null }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{
        ...projection.items[0],
        field_acceptance: {
          ...projection.items[0].field_acceptance,
          authority_boundary: {
            ...projection.items[0].field_acceptance.authority_boundary,
            condition_liability_authority: true,
          },
        },
      }],
    })).toBeNull()
    expect(normalizeOperationsLifecycleProjection({
      ...projection,
      items: [{
        ...projection.items[0],
        current_status: 'vendor_confirmed',
        pre_dispatch: {
          authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
          scope: 'RFQ_WIDE',
          packet_state: 'REVIEW_REQUIRED',
          release_readiness: 'BLOCKED',
          release_authority: 'NOT_IMPLEMENTED',
          accepted_quote_state: 'RECORDED',
          vendor_confirmation_state: 'RECORDED',
          requirements: [
            { key: 'twic', requirement_status: 'UNKNOWN', evidence_status: 'UNKNOWN' },
            { key: 'isnet', requirement_status: 'UNKNOWN', evidence_status: 'UNKNOWN' },
            { key: 'purchase_order', requirement_status: 'UNKNOWN', evidence_status: 'UNKNOWN' },
          ],
        },
      }],
    })).toBeNull()
  })

  it('uses non-authoritative operational guidance', () => {
    expect(formatLifecycleStatus('off_rent_requested')).toBe('Off Rent Requested')
    expect(lifecycleReviewLabel('off_rent')).toContain('governed separately')
    expect(lifecycleReviewLabel('draft')).toBe('Review canonical next action')
  })
})
