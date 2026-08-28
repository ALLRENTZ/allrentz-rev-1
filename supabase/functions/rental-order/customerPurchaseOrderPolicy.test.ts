import { describe, expect, it } from 'vitest'
import {
  buildCustomerPurchaseOrderProjection,
  canRecordCustomerPurchaseOrder,
  canViewCustomerPurchaseOrder,
  validateCustomerPurchaseOrderRequest,
  type PurchaseOrderVisibilityContext,
} from './customerPurchaseOrderPolicy'

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

describe('customer purchase-order policy', () => {
  it('accepts only bounded status and record commands', () => {
    expect(validateCustomerPurchaseOrderRequest({
      action: 'status',
      rfq_id: '00000000-0000-4000-8000-000000000030',
    }).valid).toBe(true)
    expect(validateCustomerPurchaseOrderRequest({
      action: 'record_customer_purchase_order',
      rental_order_id: '00000000-0000-4000-8000-000000000040',
      external_reference: ' PO-1042 ',
      customer_stated_issue_date: '2026-08-28',
      idempotency_key: 'record-po-1042',
    })).toMatchObject({
      valid: true,
      input: { externalReference: 'PO-1042' },
    })
    expect(validateCustomerPurchaseOrderRequest({
      action: 'record_customer_purchase_order',
      rental_order_id: 'bad',
      external_reference: 'PO-1',
      customer_stated_issue_date: '2026-08-28',
      idempotency_key: 'record-po-1',
    }).valid).toBe(false)
    expect(validateCustomerPurchaseOrderRequest({
      action: 'record_customer_purchase_order',
      rental_order_id: '00000000-0000-4000-8000-000000000040',
      external_reference: 'PO-1',
      customer_stated_issue_date: '2026-02-30',
      idempotency_key: 'record-po-1',
    }).valid).toBe(false)
  })

  it('separates visibility from customer recording authority', () => {
    expect(canViewCustomerPurchaseOrder(context)).toBe(true)
    expect(canRecordCustomerPurchaseOrder(context)).toBe(true)
    expect(canViewCustomerPurchaseOrder({
      ...context,
      actorId: '00000000-0000-4000-8000-000000000002',
      memberships: [{
        organization_id: '00000000-0000-4000-8000-000000000020',
        role: 'member',
        is_simulated: false,
      }],
    })).toBe(true)
    expect(canRecordCustomerPurchaseOrder({
      ...context,
      actorId: '00000000-0000-4000-8000-000000000002',
      memberships: [{
        organization_id: '00000000-0000-4000-8000-000000000020',
        role: 'member',
        is_simulated: false,
      }],
    })).toBe(false)
    expect(canViewCustomerPurchaseOrder({ ...context, actorIsDemo: true })).toBe(false)
  })

  it('projects a customer assertion without downstream authority', () => {
    expect(buildCustomerPurchaseOrderProjection({
      rentalOrderId: 'order-id',
      orderReference: 'ARO-20260828-0123456789',
      currentStatus: 'quote_accepted',
      purchaseOrderRows: [{
        external_reference: 'PO-1042',
        customer_stated_issue_date: '2026-08-28',
      }],
      canRecord: true,
    })).toEqual(expect.objectContaining({
      record_state: 'RECORDED',
      validation_state: 'CUSTOMER_ASSERTED_NOT_VALIDATED',
      recording_permission: 'NONE',
      next_step: 'MONITOR',
      authority_boundary: expect.objectContaining({
        platform_issued: false,
        release_authority: false,
        billing_authority: false,
        amendment_authority: false,
      }),
    }))
  })

  it('fails closed on contradictory or ineligible data', () => {
    expect(buildCustomerPurchaseOrderProjection({
      rentalOrderId: 'order-id',
      orderReference: 'ARO-20260828-0123456789',
      currentStatus: 'completed',
      purchaseOrderRows: [],
      canRecord: true,
    })).toMatchObject({
      record_state: 'REVIEW_REQUIRED',
      recording_permission: 'NONE',
      next_step: 'OPERATIONS_REVIEW',
    })
  })
})
