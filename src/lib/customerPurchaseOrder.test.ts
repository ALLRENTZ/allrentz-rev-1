import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))

import { normalizeCustomerPurchaseOrderProjection } from './customerPurchaseOrder'

const projection = {
  authority: 'READ_ONLY_CUSTOMER_PURCHASE_ORDER_PROJECTION',
  scope: 'RFQ_WIDE',
  rental_order_id: 'order-1',
  order_reference: 'ARO-20260828-0123456789',
  current_status: 'quote_accepted',
  record_state: 'RECORDED',
  external_reference: 'PO-1042',
  customer_stated_issue_date: '2026-08-28',
  validation_state: 'CUSTOMER_ASSERTED_NOT_VALIDATED',
  recording_permission: 'NONE',
  next_step: 'MONITOR',
  authority_boundary: {
    platform_issued: false,
    external_issuance_validated: false,
    release_authority: false,
    billing_authority: false,
    financial_posting_authority: false,
    amendment_authority: false,
    document_sufficiency_authority: false,
    granular_scope_authority: false,
  },
}

describe('customer purchase-order projection', () => {
  it('accepts a recorded customer assertion while stripping extra fields', () => {
    expect(normalizeCustomerPurchaseOrderProjection({
      ...projection,
      internal_audit_id: 'hidden',
    })).toEqual(projection)
  })

  it('accepts a customer recording opportunity without creating authority', () => {
    expect(normalizeCustomerPurchaseOrderProjection({
      ...projection,
      record_state: 'NOT_RECORDED',
      external_reference: null,
      customer_stated_issue_date: null,
      validation_state: 'UNKNOWN',
      recording_permission: 'CUSTOMER_MEMBER',
      next_step: 'RECORD_CUSTOMER_PO',
    })).toEqual(expect.objectContaining({
      record_state: 'NOT_RECORDED',
      recording_permission: 'CUSTOMER_MEMBER',
      authority_boundary: expect.objectContaining({ release_authority: false }),
    }))
  })

  it('fails closed on malformed records or expanded authority', () => {
    expect(normalizeCustomerPurchaseOrderProjection({
      ...projection,
      customer_stated_issue_date: 'not-a-date',
    })).toBeNull()
    expect(normalizeCustomerPurchaseOrderProjection({
      ...projection,
      authority_boundary: { ...projection.authority_boundary, billing_authority: true },
    })).toBeNull()
    expect(normalizeCustomerPurchaseOrderProjection({
      ...projection,
      record_state: 'REVIEW_REQUIRED',
      external_reference: null,
      customer_stated_issue_date: null,
      validation_state: 'UNKNOWN',
      next_step: 'OPERATIONS_REVIEW',
      recording_permission: 'CUSTOMER_MEMBER',
    })).toBeNull()
  })
})
