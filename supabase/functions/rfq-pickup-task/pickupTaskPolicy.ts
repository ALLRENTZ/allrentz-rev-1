const MAX_NOTES_LENGTH = 4000
const MAX_IDEMPOTENCY_KEY_LENGTH = 200

export type PickupTaskInput =
  | { action: 'status'; rfqId: string }
  | {
      action: 'propose'
      rfqId: string
      pickupWindowStart: string
      pickupWindowEnd: string
      notes: string | null
      idempotencyKey: string
    }
  | {
      action: 'respond'
      rfqId: string
      decision: 'confirm' | 'reject'
      notes: string | null
      idempotencyKey: string
    }

const ACTION_KEYS: Record<PickupTaskInput['action'], Set<string>> = {
  status: new Set(['action', 'rfq_id']),
  propose: new Set([
    'action', 'rfq_id', 'pickup_window_start', 'pickup_window_end', 'notes',
    'idempotency_key',
  ]),
  respond: new Set(['action', 'rfq_id', 'decision', 'notes', 'idempotency_key']),
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function validateExactKeys(body: Record<string, unknown>, action: PickupTaskInput['action']): string | null {
  const unsupported = Object.keys(body).filter((key) => !ACTION_KEYS[action].has(key))
  return unsupported.length > 0
    ? `unsupported PickupTask fields: ${unsupported.sort().join(', ')}`
    : null
}

export function validatePickupTaskAction(
  body: Record<string, unknown>,
): { valid: boolean; error?: string; input?: PickupTaskInput } {
  const action = body['action']
  if (action !== 'status' && action !== 'propose' && action !== 'respond') {
    return { valid: false, error: 'action must be status, propose, or respond' }
  }

  const unsupportedError = validateExactKeys(body, action)
  if (unsupportedError) return { valid: false, error: unsupportedError }

  const rfqId = typeof body['rfq_id'] === 'string' ? body['rfq_id'].trim() : ''
  if (!rfqId) return { valid: false, error: 'rfq_id is required' }
  if (action === 'status') return { valid: true, input: { action, rfqId } }

  const idempotencyKey = typeof body['idempotency_key'] === 'string'
    ? body['idempotency_key'].trim()
    : ''
  if (!idempotencyKey || idempotencyKey.length > MAX_IDEMPOTENCY_KEY_LENGTH) {
    return {
      valid: false,
      error: `idempotency_key must contain 1 to ${MAX_IDEMPOTENCY_KEY_LENGTH} characters`,
    }
  }

  const notes = normalizeNotes(body['notes'])
  if (notes && notes.length > MAX_NOTES_LENGTH) {
    return { valid: false, error: `notes cannot exceed ${MAX_NOTES_LENGTH} characters` }
  }

  if (action === 'propose') {
    const pickupWindowStart = normalizeDate(body['pickup_window_start'])
    const pickupWindowEnd = normalizeDate(body['pickup_window_end'])
    if (!pickupWindowStart || !pickupWindowEnd) {
      return { valid: false, error: 'pickup_window_start and pickup_window_end are required' }
    }
    if (pickupWindowEnd <= pickupWindowStart) {
      return { valid: false, error: 'pickup_window_end must be after pickup_window_start' }
    }
    return {
      valid: true,
      input: {
        action, rfqId, pickupWindowStart, pickupWindowEnd, notes, idempotencyKey,
      },
    }
  }

  const decision = body['decision']
  if (decision !== 'confirm' && decision !== 'reject') {
    return { valid: false, error: 'decision must be confirm or reject' }
  }
  if (decision === 'reject' && !notes) {
    return { valid: false, error: 'notes are required when rejecting a pickup schedule' }
  }
  return {
    valid: true,
    input: { action, rfqId, decision, notes, idempotencyKey },
  }
}
