import { describe, expect, it } from 'vitest'
import type { PurchaseOrderVisibilityContext } from './customerPurchaseOrderPolicy'
import {
  buildRentalOrderChangeReviewProjection,
  permittedChangeReviewParties,
  validateRentalOrderChangeReviewRequest,
} from './rentalOrderChangeReviewPolicy'

const context: PurchaseOrderVisibilityContext = {
  actorId: '00000000-0000-4000-8000-000000000001',
  actorIsDemo: false,
  rfq: {
    customerId: '00000000-0000-4000-8000-000000000001',
    customerOrganizationId: '00000000-0000-4000-8000-000000000010',
    isSimulated: false,
  },
  rentalOrder: {
    customerOrganizationId: '00000000-0000-4000-8000-000000000010',
    vendorOrganizationId: '00000000-0000-4000-8000-000000000020',
    customerOrganizationState: 'recorded',
    isSimulated: false,
  },
  operationsRoles: [],
  memberships: [{
    organization_id: '00000000-0000-4000-8000-000000000010',
    role: 'member',
    is_simulated: false,
  }],
}

describe('Rental Order change-review policy', () => {
  it('accepts only bounded status and intake actions', () => {
    expect(validateRentalOrderChangeReviewRequest({
      action: 'change_review_status',
      rfq_id: '00000000-0000-4000-8000-000000000030',
    }).valid).toBe(true)
    expect(validateRentalOrderChangeReviewRequest({
      action: 'request_end_date_change_review',
      rental_order_id: '00000000-0000-4000-8000-000000000040',
      requester_party: 'customer',
      proposed_end_date: '2026-09-30',
      request_reason: 'Project schedule requires review.',
      idempotency_key: 'change-review-1',
    }).valid).toBe(true)
    expect(validateRentalOrderChangeReviewRequest({
      action: 'approve_change_order',
    }).valid).toBe(false)
    expect(validateRentalOrderChangeReviewRequest({
      action: 'request_end_date_change_review',
      rental_order_id: '00000000-0000-4000-8000-000000000040',
      requester_party: 'customer',
      proposed_end_date: '2026-02-30',
      request_reason: 'Project schedule requires review.',
      idempotency_key: 'change-review-1',
    }).valid).toBe(false)
  })

  it('derives request parties from authenticated counterparty boundaries', () => {
    expect(permittedChangeReviewParties(context)).toEqual(['customer'])
    expect(permittedChangeReviewParties({
      ...context,
      actorId: '00000000-0000-4000-8000-000000000002',
      memberships: [{
        organization_id: '00000000-0000-4000-8000-000000000020',
        role: 'member',
        is_simulated: false,
      }],
    })).toEqual(['vendor'])
    expect(permittedChangeReviewParties({ ...context, actorIsDemo: true })).toEqual([])
  })

  it('projects immutable requests without decision or version authority', () => {
    expect(buildRentalOrderChangeReviewProjection({
      rentalOrderId: 'order-1',
      orderReference: 'ARO-20260828-0123456789',
      currentStatus: 'on_rent',
      baseVersionNumber: 1,
      requestRows: [{
        id: 'request-1',
        requester_party: 'customer',
        proposed_end_date: '2026-09-30',
        request_reason: 'Project schedule requires review.',
        created_at: '2026-08-28T12:00:00.000Z',
      }],
      permittedParties: ['customer'],
    })).toEqual(expect.objectContaining({
      base_end_date_state: 'UNKNOWN',
      review_state: 'REVIEW_REQUIRED',
      decision_state: 'NOT_IMPLEMENTED',
      next_step: 'OPERATIONS_REVIEW',
      authority_boundary: expect.objectContaining({
        change_order_authority: false,
        version_activation_authority: false,
        lifecycle_transition_authority: false,
        billing_authority: false,
      }),
    }))
  })

  it('fails closed on malformed rows or an ineligible lifecycle state', () => {
    expect(buildRentalOrderChangeReviewProjection({
      rentalOrderId: 'order-1',
      orderReference: 'ARO-20260828-0123456789',
      currentStatus: 'completed',
      baseVersionNumber: 1,
      requestRows: [],
      permittedParties: ['customer'],
    })).toMatchObject({
      review_state: 'REVIEW_REQUIRED',
      permitted_requester_parties: [],
      next_step: 'OPERATIONS_REVIEW',
    })
  })
})
