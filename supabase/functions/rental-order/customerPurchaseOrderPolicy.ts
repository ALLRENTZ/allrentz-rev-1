const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const OPERATIONS_ROLES = new Set(['admin', 'manager'])
const CUSTOMER_MEMBERSHIP_ROLES = new Set(['owner', 'admin', 'member'])
const VISIBLE_STATUSES = new Set([
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
  'in_transit',
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
])

export interface CustomerPurchaseOrderStatusInput {
  action: 'status'
  rfqId: string
}

export interface RecordCustomerPurchaseOrderInput {
  action: 'record_customer_purchase_order'
  rentalOrderId: string
  externalReference: string
  customerStatedIssueDate: string
  idempotencyKey: string
}

export type CustomerPurchaseOrderInput =
  | CustomerPurchaseOrderStatusInput
  | RecordCustomerPurchaseOrderInput

export interface PurchaseOrderVisibilityContext {
  actorId: string
  actorIsDemo: boolean
  rfq: {
    customerId: string
    customerOrganizationId: string | null
    isSimulated: boolean
  }
  rentalOrder: {
    customerOrganizationId: string | null
    vendorOrganizationId: string
    customerOrganizationState: unknown
    isSimulated: boolean
  }
  operationsRoles: Array<{ role?: unknown }> | null | undefined
  memberships: Array<{
    organization_id?: unknown
    role?: unknown
    is_simulated?: unknown
  }> | null | undefined
}

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

export interface CustomerPurchaseOrderRow {
  external_reference?: unknown
  customer_stated_issue_date?: unknown
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim())
}

export function validateCustomerPurchaseOrderRequest(value: unknown): {
  valid: boolean
  input?: CustomerPurchaseOrderInput
  error?: string
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Request body must be an object' }
  }
  const body = value as Record<string, unknown>

  if (body.action === 'status') {
    if (Object.keys(body).length !== 2 || !validUuid(body.rfq_id)) {
      return { valid: false, error: 'Only action and a valid rfq_id are permitted' }
    }
    return { valid: true, input: { action: 'status', rfqId: body.rfq_id.trim() } }
  }

  if (body.action !== 'record_customer_purchase_order' || Object.keys(body).length !== 5) {
    return { valid: false, error: 'Unsupported Rental Order action' }
  }
  if (!validUuid(body.rental_order_id)) {
    return { valid: false, error: 'A valid rental_order_id is required' }
  }
  const externalReference = typeof body.external_reference === 'string'
    ? body.external_reference.trim()
    : ''
  if (externalReference.length < 1 || externalReference.length > 100) {
    return { valid: false, error: 'External purchase-order reference must contain 1 to 100 characters' }
  }
  const customerStatedIssueDate = typeof body.customer_stated_issue_date === 'string'
    ? body.customer_stated_issue_date.trim()
    : ''
  const parsedIssueDate = new Date(`${customerStatedIssueDate}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(customerStatedIssueDate)
      || !Number.isFinite(parsedIssueDate.getTime())
      || parsedIssueDate.toISOString().slice(0, 10) !== customerStatedIssueDate) {
    return { valid: false, error: 'A valid customer-stated issue date is required' }
  }
  const idempotencyKey = typeof body.idempotency_key === 'string'
    ? body.idempotency_key.trim()
    : ''
  if (idempotencyKey.length < 8 || idempotencyKey.length > 200) {
    return { valid: false, error: 'Idempotency key must contain 8 to 200 characters' }
  }

  return {
    valid: true,
    input: {
      action: 'record_customer_purchase_order',
      rentalOrderId: body.rental_order_id.trim(),
      externalReference,
      customerStatedIssueDate,
      idempotencyKey,
    },
  }
}

function activeMemberships(
  rows: PurchaseOrderVisibilityContext['memberships'],
  actorIsDemo: boolean,
): Map<string, string> {
  const result = new Map<string, string>()
  for (const row of rows ?? []) {
    if (row.is_simulated === actorIsDemo
        && typeof row.organization_id === 'string' && typeof row.role === 'string') {
      result.set(row.organization_id, row.role)
    }
  }
  return result
}

export function canViewCustomerPurchaseOrder(context: PurchaseOrderVisibilityContext): boolean {
  if (context.actorIsDemo !== context.rfq.isSimulated
      || context.rentalOrder.isSimulated !== context.rfq.isSimulated) return false

  if (context.operationsRoles?.some((row) => (
    typeof row.role === 'string' && OPERATIONS_ROLES.has(row.role)
  ))) return true

  if (context.rfq.customerId === context.actorId) return true
  const memberships = activeMemberships(context.memberships, context.actorIsDemo)
  const customerRole = context.rentalOrder.customerOrganizationId
    ? memberships.get(context.rentalOrder.customerOrganizationId)
    : undefined
  if (typeof customerRole === 'string' && CUSTOMER_MEMBERSHIP_ROLES.has(customerRole)) return true
  const vendorRole = memberships.get(context.rentalOrder.vendorOrganizationId)
  return typeof vendorRole === 'string' && CUSTOMER_MEMBERSHIP_ROLES.has(vendorRole)
}

export function canRecordCustomerPurchaseOrder(context: PurchaseOrderVisibilityContext): boolean {
  if (context.actorIsDemo !== context.rfq.isSimulated
      || context.rentalOrder.isSimulated !== context.rfq.isSimulated
      || context.rentalOrder.customerOrganizationState !== 'recorded'
      || !context.rentalOrder.customerOrganizationId) return false

  const role = activeMemberships(context.memberships, context.actorIsDemo)
    .get(context.rentalOrder.customerOrganizationId)
  return typeof role === 'string' && CUSTOMER_MEMBERSHIP_ROLES.has(role)
}

export function buildCustomerPurchaseOrderProjection(input: {
  rentalOrderId: string
  orderReference: string
  currentStatus: unknown
  purchaseOrderRows: CustomerPurchaseOrderRow[] | null | undefined
  canRecord: boolean
}): CustomerPurchaseOrderProjection {
  const rows = Array.isArray(input.purchaseOrderRows) ? input.purchaseOrderRows : []
  const currentStatus = typeof input.currentStatus === 'string' ? input.currentStatus : 'unknown'
  const eligibleStatus = VISIBLE_STATUSES.has(currentStatus)
  const oneValidRow = rows.length === 1
    && typeof rows[0]?.external_reference === 'string'
    && rows[0].external_reference.trim().length > 0
    && typeof rows[0]?.customer_stated_issue_date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(rows[0].customer_stated_issue_date)

  const reviewRequired = !eligibleStatus || rows.length > 1 || (rows.length === 1 && !oneValidRow)
  const recordState = reviewRequired ? 'REVIEW_REQUIRED' : oneValidRow ? 'RECORDED' : 'NOT_RECORDED'
  const recordingPermission = input.canRecord && eligibleStatus && recordState === 'NOT_RECORDED'
    ? 'CUSTOMER_MEMBER'
    : 'NONE'

  return {
    authority: 'READ_ONLY_CUSTOMER_PURCHASE_ORDER_PROJECTION',
    scope: 'RFQ_WIDE',
    rental_order_id: input.rentalOrderId,
    order_reference: input.orderReference,
    current_status: currentStatus,
    record_state: recordState,
    external_reference: oneValidRow ? (rows[0].external_reference as string).trim() : null,
    customer_stated_issue_date: oneValidRow
      ? rows[0].customer_stated_issue_date as string
      : null,
    validation_state: oneValidRow ? 'CUSTOMER_ASSERTED_NOT_VALIDATED' : 'UNKNOWN',
    recording_permission: recordingPermission,
    next_step: reviewRequired
      ? 'OPERATIONS_REVIEW'
      : oneValidRow ? 'MONITOR' : 'RECORD_CUSTOMER_PO',
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
