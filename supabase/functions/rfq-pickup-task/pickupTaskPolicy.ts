const MAX_NOTES_LENGTH = 4000
const MAX_IDEMPOTENCY_KEY_LENGTH = 200
const TIMELINE_PAGE_SIZE = 100

export const PICKUP_SCHEDULE_REASON_CODES = [
  'customer_access_conflict',
  'vendor_capacity',
  'site_restriction',
  'weather_or_safety',
  'equipment_not_ready',
  'contact_issue',
  'other',
] as const

export type PickupScheduleReasonCode = typeof PICKUP_SCHEDULE_REASON_CODES[number]

export interface PickupScheduleEventProjection {
  id: string
  event_sequence: number
  event_type: 'schedule_proposed' | 'schedule_reschedule_proposed'
    | 'schedule_confirmed' | 'schedule_rejected'
  actor_role: 'vendor_scheduler' | 'customer'
  pickup_window_start: string
  pickup_window_end: string
  reason_code: PickupScheduleReasonCode | null
  notes: string | null
  created_at: string
}

export type PickupTaskInput =
  | { action: 'status'; rfqId: string; timelineBeforeSequence: number | null }
  | {
      action: 'propose'
      rfqId: string
      pickupWindowStart: string
      pickupWindowEnd: string
      reasonCode: PickupScheduleReasonCode | null
      notes: string | null
      idempotencyKey: string
    }
  | {
      action: 'respond'
      rfqId: string
      decision: 'confirm' | 'reject'
      reasonCode: PickupScheduleReasonCode | null
      notes: string | null
      idempotencyKey: string
    }

const ACTION_KEYS: Record<PickupTaskInput['action'], Set<string>> = {
  status: new Set(['action', 'rfq_id', 'timeline_before_sequence']),
  propose: new Set([
    'action', 'rfq_id', 'pickup_window_start', 'pickup_window_end', 'reason_code', 'notes',
    'idempotency_key',
  ]),
  respond: new Set([
    'action', 'rfq_id', 'decision', 'reason_code', 'notes', 'idempotency_key',
  ]),
}

const REASON_CODE_SET = new Set<string>(PICKUP_SCHEDULE_REASON_CODES)

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim()) return null
  const timestamp = Date.parse(value)
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : null
}

function normalizeNotes(value: unknown): string | null {
  if (typeof value !== 'string') return null
  return value.trim() || null
}

function normalizeReasonCode(value: unknown): PickupScheduleReasonCode | null | undefined {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string') return undefined
  const normalized = value.trim()
  return REASON_CODE_SET.has(normalized) ? normalized as PickupScheduleReasonCode : undefined
}

export function buildPickupScheduleProjection(
  current: PickupScheduleEventProjection,
  confirmed: PickupScheduleEventProjection | null,
  timelineDescending: PickupScheduleEventProjection[],
) {
  const timeline = timelineDescending.slice(0, TIMELINE_PAGE_SIZE).reverse()
  const hasMore = timelineDescending.length > TIMELINE_PAGE_SIZE
  const isPending = current.event_type === 'schedule_proposed'
    || current.event_type === 'schedule_reschedule_proposed'
  const toWindow = (event: PickupScheduleEventProjection | null) => event ? {
    pickup_window_start: event.pickup_window_start,
    pickup_window_end: event.pickup_window_end,
  } : null

  return {
    current_schedule_event: current,
    current_schedule_state: current.event_type,
    confirmed_window: toWindow(confirmed),
    pending_window: isPending ? toWindow(current) : null,
    timeline,
    timeline_page: {
      has_more: hasMore,
      next_before_sequence: hasMore && timeline.length > 0
        ? timeline[0].event_sequence
        : null,
    },
  }
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
  if (action === 'status') {
    const rawBeforeSequence = body['timeline_before_sequence']
    if (rawBeforeSequence !== undefined && rawBeforeSequence !== null
        && (typeof rawBeforeSequence !== 'number'
          || !Number.isInteger(rawBeforeSequence)
          || rawBeforeSequence < 2)) {
      return {
        valid: false,
        error: 'timeline_before_sequence must be an integer greater than 1',
      }
    }
    return {
      valid: true,
      input: {
        action,
        rfqId,
        timelineBeforeSequence: rawBeforeSequence == null
          ? null
          : Number(rawBeforeSequence),
      },
    }
  }

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
  const reasonCode = normalizeReasonCode(body['reason_code'])
  if (reasonCode === undefined) {
    return { valid: false, error: 'reason_code must be a governed pickup reason' }
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
        action, rfqId, pickupWindowStart, pickupWindowEnd, reasonCode, notes,
        idempotencyKey,
      },
    }
  }

  const decision = body['decision']
  if (decision !== 'confirm' && decision !== 'reject') {
    return { valid: false, error: 'decision must be confirm or reject' }
  }
  if (decision === 'reject' && (!reasonCode || !notes)) {
    return {
      valid: false,
      error: 'reason_code and notes are required when rejecting a pickup schedule',
    }
  }
  if (decision === 'confirm' && reasonCode) {
    return { valid: false, error: 'reason_code is only permitted when rejecting' }
  }
  return {
    valid: true,
    input: { action, rfqId, decision, reasonCode, notes, idempotencyKey },
  }
}
