export type OffRentAction = 'request' | 'acknowledge' | 'status'

export interface OffRentStatusInput {
  action: 'status'
  rfqId: string
}

export interface OffRentRequestInput {
  action: 'request'
  rfqId: string
  requestedStopAt: string
  pickupAvailableFrom: string
  pickupAvailableUntil: string
  notes: string | null
}

export interface OffRentAcknowledgmentInput {
  action: 'acknowledge'
  rfqId: string
  pickupWindowStart: string
  pickupWindowEnd: string
  notes: string | null
}

export type OffRentInput = OffRentRequestInput | OffRentAcknowledgmentInput | OffRentStatusInput

export interface StopAuthoritySource {
  determination?: {
    determined_at: string
    stop_effective_at: string
    billable_through_at: string
    explanation: string
    determination_version: number
  } | null
  attempt?: {
    outcome: 'blocked' | 'complete'
    blocker_code: string | null
    blocker_detail: string | null
    created_at: string
  } | null
}

export interface StopAuthorityProjection {
  contractual_status: 'DETERMINED' | 'BLOCKED' | 'UNKNOWN'
  billing_cutoff_status: 'DETERMINED' | 'BLOCKED'
  blocker_code: string | null
  blocker_detail: string | null
  determined_at: string | null
  stop_effective_at: string | null
  billable_through_at: string | null
  explanation: string
  determination_version: number | null
}

export const MAX_NOTES_LENGTH = 4000

export function projectStopAuthority(source: StopAuthoritySource): StopAuthorityProjection {
  if (source.determination) {
    return {
      contractual_status: 'DETERMINED',
      billing_cutoff_status: 'DETERMINED',
      blocker_code: null,
      blocker_detail: null,
      determined_at: source.determination.determined_at,
      stop_effective_at: source.determination.stop_effective_at,
      billable_through_at: source.determination.billable_through_at,
      explanation: source.determination.explanation,
      determination_version: source.determination.determination_version,
    }
  }

  if (source.attempt?.outcome === 'blocked') {
    return {
      contractual_status: 'BLOCKED',
      billing_cutoff_status: 'BLOCKED',
      blocker_code: source.attempt.blocker_code,
      blocker_detail: source.attempt.blocker_detail,
      determined_at: null,
      stop_effective_at: null,
      billable_through_at: null,
      explanation: source.attempt.blocker_detail
        ?? 'The governed stop-rent evaluation did not establish contractual stop authority.',
      determination_version: null,
    }
  }

  return {
    contractual_status: 'UNKNOWN',
    billing_cutoff_status: 'BLOCKED',
    blocker_code: 'STOP_RULE_UNKNOWN',
    blocker_detail: 'No published contractual stop authority is available for this rental.',
    determined_at: null,
    stop_effective_at: null,
    billable_through_at: null,
    explanation: 'No published contractual stop authority is available for this rental. Billing cutoff remains blocked.',
    determination_version: null,
  }
}

function normalizeRequiredDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return null
  return new Date(timestamp).toISOString()
}

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

export function validateOffRentAction(
  body: Record<string, unknown>,
): { valid: boolean; error?: string; input?: OffRentInput } {
  const action = body['action']
  if (action !== 'request' && action !== 'acknowledge' && action !== 'status') {
    return { valid: false, error: 'action must be request, acknowledge, or status' }
  }

  const rfqId = body['rfq_id']
  if (typeof rfqId !== 'string' || !rfqId.trim()) {
    return { valid: false, error: 'rfq_id is required' }
  }

  if (action === 'status') {
    return { valid: true, input: { action, rfqId: rfqId.trim() } }
  }

  const notes = normalizeNotes(body['notes'])
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return { valid: false, error: `notes cannot exceed ${MAX_NOTES_LENGTH} characters` }
  }

  if (action === 'request') {
    const requestedStopAt = normalizeRequiredDate(body['requested_stop_at'])
    const pickupAvailableFrom = normalizeRequiredDate(body['pickup_available_from'])
    const pickupAvailableUntil = normalizeRequiredDate(body['pickup_available_until'])
    if (!requestedStopAt || !pickupAvailableFrom || !pickupAvailableUntil) {
      return {
        valid: false,
        error: 'requested_stop_at and the pickup availability window are required',
      }
    }
    if (pickupAvailableFrom < requestedStopAt) {
      return {
        valid: false,
        error: 'pickup_available_from cannot be before requested_stop_at',
      }
    }
    if (pickupAvailableUntil <= pickupAvailableFrom) {
      return {
        valid: false,
        error: 'pickup_available_until must be after pickup_available_from',
      }
    }
    return {
      valid: true,
      input: {
        action,
        rfqId: rfqId.trim(),
        requestedStopAt,
        pickupAvailableFrom,
        pickupAvailableUntil,
        notes,
      },
    }
  }

  const pickupWindowStart = normalizeRequiredDate(body['pickup_window_start'])
  const pickupWindowEnd = normalizeRequiredDate(body['pickup_window_end'])
  if (!pickupWindowStart || !pickupWindowEnd) {
    return { valid: false, error: 'pickup_window_start and pickup_window_end are required' }
  }
  if (pickupWindowEnd <= pickupWindowStart) {
    return { valid: false, error: 'pickup_window_end must be after pickup_window_start' }
  }

  return {
    valid: true,
    input: {
      action,
      rfqId: rfqId.trim(),
      pickupWindowStart,
      pickupWindowEnd,
      notes,
    },
  }
}
