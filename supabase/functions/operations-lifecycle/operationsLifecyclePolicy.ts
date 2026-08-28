export const APP_RFQ_STATUSES = [
  'draft',
  'submitted',
  'pending_vendor_review',
  'vendor_quote_received',
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
  'in_transit',
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
  'completed',
  'cancelled',
  'rejected',
] as const

export type AppRfqStatus = typeof APP_RFQ_STATUSES[number]

const STATUS_SET = new Set<string>(APP_RFQ_STATUSES)
const OPERATIONS_ROLES = new Set(['admin', 'manager'])
const PRE_DISPATCH_STATUSES = new Set<AppRfqStatus>([
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
])
const CHANGE_REVIEW_STATUSES = new Set<AppRfqStatus>([
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
  'in_transit',
  'on_rent',
  'rental_extended',
])

export type PreDispatchRequirementStatus = 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN'
export type PreDispatchEvidenceStatus = 'UNKNOWN' | 'NOT_APPLICABLE' | 'RECORDED'

export interface PreDispatchRequirementProjection {
  key: 'twic' | 'isnet' | 'purchase_order'
  requirement_status: PreDispatchRequirementStatus
  evidence_status: PreDispatchEvidenceStatus
}

export interface PreDispatchReadinessProjection {
  authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION'
  scope: 'RFQ_WIDE'
  packet_state: 'REVIEW_REQUIRED'
  release_readiness: 'BLOCKED'
  release_authority: 'NOT_IMPLEMENTED'
  accepted_quote_state: 'RECORDED' | 'UNKNOWN'
  vendor_confirmation_state: 'RECORDED' | 'REVIEW_REQUIRED'
  requirements: PreDispatchRequirementProjection[]
}

export interface AcceptedQuoteReadinessRow {
  status?: unknown
  accepted_at?: unknown
}

export interface CustomerRequirementReadinessRow {
  twic_required?: unknown
  isnet_required?: unknown
  purchase_order_required?: unknown
}

export interface CustomerPurchaseOrderReadinessRow {
  external_reference?: unknown
  customer_stated_issue_date?: unknown
}

export interface ChangeReviewReadinessRow {
  id?: unknown
  proposed_end_date?: unknown
  created_at?: unknown
}

export interface ChangeReviewReadinessProjection {
  authority: 'READ_ONLY_CHANGE_REVIEW_READINESS_PROJECTION'
  scope: 'RFQ_WIDE'
  review_state: 'NONE' | 'REVIEW_REQUIRED'
  request_count: number
  latest_proposed_end_date: string | null
  base_end_date_state: 'UNKNOWN'
  decision_authority: 'NOT_IMPLEMENTED'
  authority_boundary: {
    lifecycle_transition_authority: false
    version_activation_authority: false
    billing_authority: false
  }
}

export type OperationsLifecycleInput = { action: 'list' }

export function validateOperationsLifecycleAction(value: unknown): {
  valid: boolean
  input?: OperationsLifecycleInput
  error?: string
} {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { valid: false, error: 'Request body must be an object' }
  }

  const record = value as Record<string, unknown>
  if (Object.keys(record).length !== 1 || record.action !== 'list') {
    return { valid: false, error: 'Only the list action is permitted' }
  }

  return { valid: true, input: { action: 'list' } }
}

export function hasOperationsLifecycleRole(
  rows: Array<{ role?: unknown }> | null | undefined,
): boolean {
  return !!rows?.some((row) => typeof row.role === 'string' && OPERATIONS_ROLES.has(row.role))
}

export function isAppRfqStatus(value: unknown): value is AppRfqStatus {
  return typeof value === 'string' && STATUS_SET.has(value)
}

function requirementProjection(
  key: PreDispatchRequirementProjection['key'],
  value: unknown,
  recordedEvidence = false,
): PreDispatchRequirementProjection {
  const requirementStatus: PreDispatchRequirementStatus = value === true
    ? 'REQUIRED'
    : value === false ? 'NOT_REQUIRED' : 'UNKNOWN'
  return {
    key,
    requirement_status: requirementStatus,
    evidence_status: recordedEvidence
      ? 'RECORDED'
      : requirementStatus === 'NOT_REQUIRED' ? 'NOT_APPLICABLE' : 'UNKNOWN',
  }
}

export function buildPreDispatchReadinessProjection(input: {
  currentStatus: unknown
  acceptedQuotes: AcceptedQuoteReadinessRow[] | null | undefined
  customerRequirements: CustomerRequirementReadinessRow | null | undefined
  purchaseOrderRows: CustomerPurchaseOrderReadinessRow[] | null | undefined
}): PreDispatchReadinessProjection | null {
  if (!isAppRfqStatus(input.currentStatus)
      || !PRE_DISPATCH_STATUSES.has(input.currentStatus)) return null

  const acceptedQuotes = Array.isArray(input.acceptedQuotes) ? input.acceptedQuotes : []
  const acceptedQuoteIsRecorded = acceptedQuotes.length === 1
    && acceptedQuotes[0]?.status === 'accepted'
    && typeof acceptedQuotes[0]?.accepted_at === 'string'
    && Number.isFinite(Date.parse(acceptedQuotes[0].accepted_at as string))
  const purchaseOrderRows = Array.isArray(input.purchaseOrderRows) ? input.purchaseOrderRows : []
  const purchaseOrderIsRecorded = purchaseOrderRows.length === 1
    && typeof purchaseOrderRows[0]?.external_reference === 'string'
    && purchaseOrderRows[0].external_reference.trim().length > 0
    && typeof purchaseOrderRows[0]?.customer_stated_issue_date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(purchaseOrderRows[0].customer_stated_issue_date)

  return {
    authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
    scope: 'RFQ_WIDE',
    packet_state: 'REVIEW_REQUIRED',
    release_readiness: 'BLOCKED',
    release_authority: 'NOT_IMPLEMENTED',
    accepted_quote_state: acceptedQuoteIsRecorded ? 'RECORDED' : 'UNKNOWN',
    vendor_confirmation_state: input.currentStatus === 'quote_accepted'
      ? 'REVIEW_REQUIRED'
      : 'RECORDED',
    requirements: [
      requirementProjection('twic', input.customerRequirements?.twic_required),
      requirementProjection('isnet', input.customerRequirements?.isnet_required),
      requirementProjection(
        'purchase_order',
        input.customerRequirements?.purchase_order_required,
        purchaseOrderIsRecorded,
      ),
    ],
  }
}

export function buildChangeReviewReadinessProjection(input: {
  currentStatus: unknown
  requestRows: ChangeReviewReadinessRow[] | null | undefined
}): ChangeReviewReadinessProjection | null {
  if (!isAppRfqStatus(input.currentStatus)
      || !CHANGE_REVIEW_STATUSES.has(input.currentStatus)) return null
  const rows = Array.isArray(input.requestRows) ? input.requestRows : []
  const validRows = rows.filter((row) => typeof row.id === 'string'
    && typeof row.proposed_end_date === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(row.proposed_end_date)
    && typeof row.created_at === 'string'
    && Number.isFinite(Date.parse(row.created_at)))
  const dataValid = validRows.length === rows.length
  const latest = dataValid && validRows.length > 0
    ? [...validRows].sort((left, right) => Date.parse(right.created_at as string)
      - Date.parse(left.created_at as string))[0]
    : null
  return {
    authority: 'READ_ONLY_CHANGE_REVIEW_READINESS_PROJECTION',
    scope: 'RFQ_WIDE',
    review_state: dataValid && rows.length === 0 ? 'NONE' : 'REVIEW_REQUIRED',
    request_count: dataValid ? rows.length : 0,
    latest_proposed_end_date: latest && typeof latest.proposed_end_date === 'string'
      ? latest.proposed_end_date
      : null,
    base_end_date_state: 'UNKNOWN',
    decision_authority: 'NOT_IMPLEMENTED',
    authority_boundary: {
      lifecycle_transition_authority: false,
      version_activation_authority: false,
      billing_authority: false,
    },
  }
}

export function lifecycleRowsAreConsistent(input: {
  currentStatus: unknown
  events: Array<{ previous_status: unknown; new_status: unknown }> | null | undefined
}): boolean {
  if (!isAppRfqStatus(input.currentStatus) || !Array.isArray(input.events)) return false

  let previousNewStatus: AppRfqStatus | null = null
  for (const event of input.events) {
    if ((event.previous_status !== null && !isAppRfqStatus(event.previous_status))
        || !isAppRfqStatus(event.new_status)) return false
    if (previousNewStatus !== null && event.previous_status !== previousNewStatus) return false
    previousNewStatus = event.new_status
  }

  return previousNewStatus === null || previousNewStatus === input.currentStatus
}
