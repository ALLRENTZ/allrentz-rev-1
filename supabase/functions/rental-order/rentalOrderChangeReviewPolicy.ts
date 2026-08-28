import type { PurchaseOrderVisibilityContext } from './customerPurchaseOrderPolicy'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const PARTY_ROLES = new Set(['owner', 'admin', 'member'])
const REVIEW_STATUSES = new Set([
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
  'in_transit',
  'on_rent',
  'rental_extended',
])

export interface RentalOrderChangeReviewStatusInput {
  action: 'change_review_status'
  rfqId: string
}

export interface RequestRentalOrderChangeReviewInput {
  action: 'request_end_date_change_review'
  rentalOrderId: string
  requesterParty: 'customer' | 'vendor'
  proposedEndDate: string
  requestReason: string
  idempotencyKey: string
}

export type RentalOrderChangeReviewInput =
  | RentalOrderChangeReviewStatusInput
  | RequestRentalOrderChangeReviewInput

export interface RentalOrderChangeReviewRow {
  id?: unknown
  requester_party?: unknown
  proposed_end_date?: unknown
  request_reason?: unknown
  created_at?: unknown
}

export interface RentalOrderChangeReviewProjection {
  authority: 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION'
  scope: 'RFQ_WIDE'
  rental_order_id: string
  order_reference: string
  current_status: string
  base_version_number: number
  base_end_date_state: 'UNKNOWN'
  review_state: 'NONE' | 'REVIEW_REQUIRED'
  decision_state: 'NOT_IMPLEMENTED'
  requests: Array<{
    request_id: string
    requester_party: 'customer' | 'vendor'
    proposed_end_date: string
    request_reason: string
    created_at: string
  }>
  permitted_requester_parties: Array<'customer' | 'vendor'>
  next_step: 'SUBMIT_CHANGE_REVIEW' | 'OPERATIONS_REVIEW'
  authority_boundary: {
    change_order_authority: false
    version_activation_authority: false
    lifecycle_transition_authority: false
    billing_authority: false
    custody_authority: false
    granular_scope_authority: false
  }
}

function validUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_PATTERN.test(value.trim())
}

function validDate(value: string): boolean {
  const parsed = new Date(`${value}T00:00:00Z`)
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value
}

export function validateRentalOrderChangeReviewRequest(value: unknown): {
  valid: boolean
  input?: RentalOrderChangeReviewInput
  error?: string
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Request body must be an object' }
  }
  const body = value as Record<string, unknown>
  if (body.action === 'change_review_status') {
    if (Object.keys(body).length !== 2 || !validUuid(body.rfq_id)) {
      return { valid: false, error: 'Only action and a valid rfq_id are permitted' }
    }
    return { valid: true, input: { action: 'change_review_status', rfqId: body.rfq_id.trim() } }
  }
  if (body.action !== 'request_end_date_change_review' || Object.keys(body).length !== 6) {
    return { valid: false, error: 'Unsupported Rental Order change-review action' }
  }
  if (!validUuid(body.rental_order_id)) {
    return { valid: false, error: 'A valid rental_order_id is required' }
  }
  if (body.requester_party !== 'customer' && body.requester_party !== 'vendor') {
    return { valid: false, error: 'Requester party must be customer or vendor' }
  }
  const proposedEndDate = typeof body.proposed_end_date === 'string'
    ? body.proposed_end_date.trim()
    : ''
  if (!validDate(proposedEndDate)) {
    return { valid: false, error: 'A valid proposed_end_date is required' }
  }
  const requestReason = typeof body.request_reason === 'string' ? body.request_reason.trim() : ''
  if (requestReason.length < 5 || requestReason.length > 4000) {
    return { valid: false, error: 'Request reason must contain 5 to 4000 characters' }
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
      action: 'request_end_date_change_review',
      rentalOrderId: body.rental_order_id.trim(),
      requesterParty: body.requester_party,
      proposedEndDate,
      requestReason,
      idempotencyKey,
    },
  }
}

function activePartyMemberships(context: PurchaseOrderVisibilityContext): Map<string, string> {
  const memberships = new Map<string, string>()
  for (const row of context.memberships ?? []) {
    if (row.is_simulated === context.actorIsDemo
        && typeof row.organization_id === 'string'
        && typeof row.role === 'string') memberships.set(row.organization_id, row.role)
  }
  return memberships
}

export function permittedChangeReviewParties(
  context: PurchaseOrderVisibilityContext,
): Array<'customer' | 'vendor'> {
  if (context.actorIsDemo !== context.rfq.isSimulated
      || context.rentalOrder.isSimulated !== context.rfq.isSimulated) return []
  const memberships = activePartyMemberships(context)
  const parties: Array<'customer' | 'vendor'> = []
  const customerRole = context.rentalOrder.customerOrganizationId
    ? memberships.get(context.rentalOrder.customerOrganizationId)
    : undefined
  if (context.actorId === context.rfq.customerId
      || (typeof customerRole === 'string' && PARTY_ROLES.has(customerRole))) {
    parties.push('customer')
  }
  const vendorRole = memberships.get(context.rentalOrder.vendorOrganizationId)
  if (typeof vendorRole === 'string' && PARTY_ROLES.has(vendorRole)) parties.push('vendor')
  return parties
}

export function buildRentalOrderChangeReviewProjection(input: {
  rentalOrderId: string
  orderReference: string
  currentStatus: unknown
  baseVersionNumber: unknown
  requestRows: RentalOrderChangeReviewRow[] | null | undefined
  permittedParties: Array<'customer' | 'vendor'>
}): RentalOrderChangeReviewProjection {
  const currentStatus = typeof input.currentStatus === 'string' ? input.currentStatus : 'unknown'
  const baseVersionNumber = typeof input.baseVersionNumber === 'number'
    && Number.isInteger(input.baseVersionNumber) && input.baseVersionNumber > 0
    ? input.baseVersionNumber
    : 0
  const rows = Array.isArray(input.requestRows) ? input.requestRows : []
  const requests = rows.flatMap((row) => {
    if (typeof row.id !== 'string'
        || (row.requester_party !== 'customer' && row.requester_party !== 'vendor')
        || typeof row.proposed_end_date !== 'string' || !validDate(row.proposed_end_date)
        || typeof row.request_reason !== 'string' || row.request_reason.trim().length < 5
        || typeof row.created_at !== 'string' || !Number.isFinite(Date.parse(row.created_at))) return []
    return [{
      request_id: row.id,
      requester_party: row.requester_party,
      proposed_end_date: row.proposed_end_date,
      request_reason: row.request_reason.trim(),
      created_at: row.created_at,
    }]
  })
  const dataValid = REVIEW_STATUSES.has(currentStatus)
    && baseVersionNumber > 0
    && requests.length === rows.length
  const visibleRequests = dataValid ? requests : []
  return {
    authority: 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION',
    scope: 'RFQ_WIDE',
    rental_order_id: input.rentalOrderId,
    order_reference: input.orderReference,
    current_status: currentStatus,
    base_version_number: baseVersionNumber,
    base_end_date_state: 'UNKNOWN',
    review_state: visibleRequests.length > 0 || !dataValid ? 'REVIEW_REQUIRED' : 'NONE',
    decision_state: 'NOT_IMPLEMENTED',
    requests: visibleRequests,
    permitted_requester_parties: dataValid ? [...new Set(input.permittedParties)] : [],
    next_step: visibleRequests.length > 0 || !dataValid
      ? 'OPERATIONS_REVIEW'
      : 'SUBMIT_CHANGE_REVIEW',
    authority_boundary: {
      change_order_authority: false,
      version_activation_authority: false,
      lifecycle_transition_authority: false,
      billing_authority: false,
      custody_authority: false,
      granular_scope_authority: false,
    },
  }
}
