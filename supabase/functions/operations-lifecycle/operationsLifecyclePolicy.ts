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
