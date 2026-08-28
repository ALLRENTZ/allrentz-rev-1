import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

import { normalizeRentalOrderChangeReviewProjection } from './rentalOrderChangeReview'

const projection = {
  authority: 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION',
  scope: 'RFQ_WIDE',
  rental_order_id: 'order-1',
  order_reference: 'ARO-20260828-0123456789',
  current_status: 'on_rent',
  base_version_number: 1,
  base_end_date_state: 'UNKNOWN',
  review_state: 'REVIEW_REQUIRED',
  decision_state: 'NOT_IMPLEMENTED',
  requests: [{
    request_id: 'request-1',
    requester_party: 'customer',
    proposed_end_date: '2026-09-30',
    request_reason: 'Project schedule requires review.',
    created_at: '2026-08-28T12:00:00.000Z',
  }],
  permitted_requester_parties: ['customer'],
  next_step: 'OPERATIONS_REVIEW',
  authority_boundary: {
    change_order_authority: false,
    version_activation_authority: false,
    lifecycle_transition_authority: false,
    billing_authority: false,
    custody_authority: false,
    granular_scope_authority: false,
  },
}

describe('Rental Order change-review projection', () => {
  it('accepts a sanitized request-only projection', () => {
    expect(normalizeRentalOrderChangeReviewProjection(projection)).toEqual(projection)
  })

  it('accepts an empty intake state without granting decision authority', () => {
    expect(normalizeRentalOrderChangeReviewProjection({
      ...projection,
      review_state: 'NONE',
      requests: [],
      next_step: 'SUBMIT_CHANGE_REVIEW',
    })).toEqual(expect.objectContaining({
      review_state: 'NONE',
      decision_state: 'NOT_IMPLEMENTED',
    }))
  })

  it('rejects malformed ordering and authority expansion', () => {
    expect(normalizeRentalOrderChangeReviewProjection({
      ...projection,
      authority_boundary: { ...projection.authority_boundary, change_order_authority: true },
    })).toBeNull()
    expect(normalizeRentalOrderChangeReviewProjection({
      ...projection,
      requests: [{ ...projection.requests[0], proposed_end_date: '2026-02-30' }],
    })).toBeNull()
    expect(normalizeRentalOrderChangeReviewProjection({
      ...projection,
      review_state: 'NONE',
    })).toBeNull()
  })
})
