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

export type PreDispatchRequirementStatus = 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN'
export type PreDispatchEvidenceStatus = 'UNKNOWN' | 'NOT_APPLICABLE'

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
): PreDispatchRequirementProjection {
  const requirementStatus: PreDispatchRequirementStatus = value === true
    ? 'REQUIRED'
    : value === false ? 'NOT_REQUIRED' : 'UNKNOWN'
  return {
    key,
    requirement_status: requirementStatus,
    evidence_status: requirementStatus === 'NOT_REQUIRED' ? 'NOT_APPLICABLE' : 'UNKNOWN',
  }
}

export function buildPreDispatchReadinessProjection(input: {
  currentStatus: unknown
  acceptedQuotes: AcceptedQuoteReadinessRow[] | null | undefined
  customerRequirements: CustomerRequirementReadinessRow | null | undefined
}): PreDispatchReadinessProjection | null {
  if (!isAppRfqStatus(input.currentStatus)
      || !PRE_DISPATCH_STATUSES.has(input.currentStatus)) return null

  const acceptedQuotes = Array.isArray(input.acceptedQuotes) ? input.acceptedQuotes : []
  const acceptedQuoteIsRecorded = acceptedQuotes.length === 1
    && acceptedQuotes[0]?.status === 'accepted'
    && typeof acceptedQuotes[0]?.accepted_at === 'string'
    && Number.isFinite(Date.parse(acceptedQuotes[0].accepted_at as string))

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
      requirementProjection('purchase_order', input.customerRequirements?.purchase_order_required),
    ],
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
