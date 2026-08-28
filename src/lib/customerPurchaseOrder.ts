import { supabase } from '@/integrations/supabase/client'

export interface CustomerPurchaseOrderProjection {
  authority: 'READ_ONLY_CUSTOMER_PURCHASE_ORDER_PROJECTION'
  scope: 'RFQ_WIDE'
  rental_order_id: string
  order_reference: string
  current_status: string
  record_state: 'NOT_RECORDED' | 'RECORDED' | 'REVIEW_REQUIRED'
  external_reference: string | null
  customer_stated_issue_date: string | null
  validation_state: 'UNKNOWN' | 'CUSTOMER_ASSERTED_NOT_VALIDATED'
  recording_permission: 'CUSTOMER_MEMBER' | 'NONE'
  next_step: 'RECORD_CUSTOMER_PO' | 'MONITOR' | 'OPERATIONS_REVIEW'
  authority_boundary: {
    platform_issued: false
    external_issuance_validated: false
    release_authority: false
    billing_authority: false
    financial_posting_authority: false
    amendment_authority: false
    document_sufficiency_authority: false
    granular_scope_authority: false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

export function normalizeCustomerPurchaseOrderProjection(
  value: unknown,
): CustomerPurchaseOrderProjection | null {
  if (!isRecord(value)
      || value.authority !== 'READ_ONLY_CUSTOMER_PURCHASE_ORDER_PROJECTION'
      || value.scope !== 'RFQ_WIDE'
      || typeof value.rental_order_id !== 'string' || !value.rental_order_id
      || typeof value.order_reference !== 'string' || !value.order_reference
      || typeof value.current_status !== 'string' || !value.current_status
      || (value.record_state !== 'NOT_RECORDED'
        && value.record_state !== 'RECORDED'
        && value.record_state !== 'REVIEW_REQUIRED')
      || (value.validation_state !== 'UNKNOWN'
        && value.validation_state !== 'CUSTOMER_ASSERTED_NOT_VALIDATED')
      || (value.recording_permission !== 'CUSTOMER_MEMBER'
        && value.recording_permission !== 'NONE')
      || (value.next_step !== 'RECORD_CUSTOMER_PO'
        && value.next_step !== 'MONITOR'
        && value.next_step !== 'OPERATIONS_REVIEW')
      || !isRecord(value.authority_boundary)) return null

  const boundary = value.authority_boundary
  if (boundary.platform_issued !== false
      || boundary.external_issuance_validated !== false
      || boundary.release_authority !== false
      || boundary.billing_authority !== false
      || boundary.financial_posting_authority !== false
      || boundary.amendment_authority !== false
      || boundary.document_sufficiency_authority !== false
      || boundary.granular_scope_authority !== false) return null

  if (value.record_state === 'RECORDED') {
    if (typeof value.external_reference !== 'string' || !value.external_reference.trim()
        || typeof value.customer_stated_issue_date !== 'string'
        || !/^\d{4}-\d{2}-\d{2}$/.test(value.customer_stated_issue_date)
        || value.validation_state !== 'CUSTOMER_ASSERTED_NOT_VALIDATED'
        || value.recording_permission !== 'NONE'
        || value.next_step !== 'MONITOR') return null
  } else {
    if (value.external_reference !== null
        || value.customer_stated_issue_date !== null
        || value.validation_state !== 'UNKNOWN') return null
    if (value.record_state === 'REVIEW_REQUIRED'
        && (value.recording_permission !== 'NONE'
          || value.next_step !== 'OPERATIONS_REVIEW')) return null
    if (value.record_state === 'NOT_RECORDED'
        && value.next_step !== 'RECORD_CUSTOMER_PO') return null
  }

  return {
    authority: 'READ_ONLY_CUSTOMER_PURCHASE_ORDER_PROJECTION',
    scope: 'RFQ_WIDE',
    rental_order_id: value.rental_order_id,
    order_reference: value.order_reference,
    current_status: value.current_status,
    record_state: value.record_state,
    external_reference: value.external_reference as string | null,
    customer_stated_issue_date: value.customer_stated_issue_date as string | null,
    validation_state: value.validation_state,
    recording_permission: value.recording_permission,
    next_step: value.next_step,
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
}

export async function loadCustomerPurchaseOrder(
  rfqId: string,
): Promise<CustomerPurchaseOrderProjection> {
  const { data, error } = await supabase.functions.invoke('rental-order', {
    body: { action: 'status', rfq_id: rfqId },
  })
  if (error) throw new Error('Unable to load customer purchase-order status')
  const projection = normalizeCustomerPurchaseOrderProjection(data)
  if (!projection) throw new Error('Customer purchase-order status requires review')
  return projection
}

export async function recordCustomerPurchaseOrder(input: {
  rentalOrderId: string
  externalReference: string
  customerStatedIssueDate: string
  idempotencyKey: string
}): Promise<CustomerPurchaseOrderProjection> {
  const { data, error } = await supabase.functions.invoke('rental-order', {
    body: {
      action: 'record_customer_purchase_order',
      rental_order_id: input.rentalOrderId,
      external_reference: input.externalReference,
      customer_stated_issue_date: input.customerStatedIssueDate,
      idempotency_key: input.idempotencyKey,
    },
  })
  if (error) throw new Error('Unable to record customer purchase order')
  const projection = normalizeCustomerPurchaseOrderProjection(data)
  if (!projection) throw new Error('Customer purchase-order result requires review')
  return projection
}
