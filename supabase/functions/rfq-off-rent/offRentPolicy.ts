export type OffRentAction = 'request' | 'acknowledge'

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

export type OffRentInput = OffRentRequestInput | OffRentAcknowledgmentInput

export const MAX_NOTES_LENGTH = 4000

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
  if (action !== 'request' && action !== 'acknowledge') {
    return { valid: false, error: 'action must be request or acknowledge' }
  }

  const rfqId = body['rfq_id']
  if (typeof rfqId !== 'string' || !rfqId.trim()) {
    return { valid: false, error: 'rfq_id is required' }
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
