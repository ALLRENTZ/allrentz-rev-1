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

export const PICKUP_ATTEMPT_REASON_CODES = [
  'customer_access_unavailable',
  'site_restriction',
  'equipment_not_ready',
  'equipment_not_found',
  'weather_or_safety',
  'contact_issue',
  'other',
] as const

export type PickupAttemptReasonCode = typeof PICKUP_ATTEMPT_REASON_CODES[number]

export const PICKUP_ACCESS_INSTRUCTION_TYPES = [
  'site_access',
  'site_contact',
  'pickup_location',
  'safety_requirement',
  'entry_restriction',
  'other',
] as const

export type PickupAccessInstructionType = typeof PICKUP_ACCESS_INSTRUCTION_TYPES[number]

export const PICKUP_EXCEPTION_ESCALATION_REASONS = [
  'additional_information_required',
  'customer_coordination_review',
  'vendor_coordination_review',
  'site_access_review',
  'safety_review',
  'operations_review',
] as const

export type PickupExceptionEscalationReason =
  typeof PICKUP_EXCEPTION_ESCALATION_REASONS[number]

export type PickupExceptionCoordinationState =
  | 'not_applicable'
  | 'operations_review'
  | 'additional_information_review'
  | 'customer_coordination_review'
  | 'vendor_coordination_review'
  | 'site_access_review'
  | 'safety_review'

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

export type PickupDispatchState = 'not_dispatched' | 'field_actor_assigned'
  | 'en_route_recorded' | 'arrival_recorded'

export interface PickupDispatchEventProjection {
  id: string
  event_sequence: number
  event_type: Exclude<PickupDispatchState, 'not_dispatched'>
  actor_role: 'vendor_dispatcher' | 'assigned_field_actor'
  assigned_actor_id: string
  notes: string | null
  created_at: string
}

export interface PickupAttemptEventProjection {
  id: string
  event_sequence: 1
  event_type: 'attempt_collection_asserted' | 'attempt_failed'
  actor_role: 'assigned_field_actor'
  assigned_actor_id: string
  reason_code: PickupAttemptReasonCode | null
  notes: string | null
  created_at: string
}

export interface PickupAccessInstructionEventProjection {
  id: string
  event_sequence: number
  event_type: 'access_instructions_added'
  actor_role: 'customer'
  instruction_type: PickupAccessInstructionType
  instructions: string
  created_at: string
}

export interface PickupCustomerExceptionReportEventProjection {
  id: string
  event_sequence: number
  event_type: 'customer_exception_reported'
  actor_role: 'customer'
  description: string
  created_at: string
}

export function buildPickupAccessInstructionProjection(
  events: PickupAccessInstructionEventProjection[],
): { current_access_instructions: PickupAccessInstructionEventProjection | null; access_instruction_timeline: PickupAccessInstructionEventProjection[] } {
  const sanitized: PickupAccessInstructionEventProjection[] = []
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (!event || typeof event.id !== 'string' || !event.id
        || event.event_sequence !== index + 1
        || event.event_type !== 'access_instructions_added'
        || event.actor_role !== 'customer'
        || !ACCESS_INSTRUCTION_TYPE_SET.has(event.instruction_type)
        || typeof event.instructions !== 'string'
        || !event.instructions.trim() || event.instructions.length > MAX_NOTES_LENGTH
        || !Number.isFinite(Date.parse(event.created_at))) {
      throw new Error('Pickup access-instruction evidence is malformed')
    }
    sanitized.push({ ...event, instructions: event.instructions.trim() })
  }
  return {
    current_access_instructions: sanitized.at(-1) ?? null,
    access_instruction_timeline: sanitized,
  }
}

export function buildPickupCustomerExceptionReportProjection(
  events: PickupCustomerExceptionReportEventProjection[],
): {
  current_customer_exception_state: 'none_recorded' | 'review_required'
  current_customer_exception_report: PickupCustomerExceptionReportEventProjection | null
  customer_exception_report_timeline: PickupCustomerExceptionReportEventProjection[]
} {
  const sanitized: PickupCustomerExceptionReportEventProjection[] = []
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index]
    if (!event || typeof event.id !== 'string' || !event.id
        || event.event_sequence !== index + 1
        || event.event_type !== 'customer_exception_reported'
        || event.actor_role !== 'customer'
        || typeof event.description !== 'string'
        || !event.description.trim() || event.description.length > MAX_NOTES_LENGTH
        || !Number.isFinite(Date.parse(event.created_at))) {
      throw new Error('Pickup customer exception-report evidence is malformed')
    }
    sanitized.push({ ...event, description: event.description.trim() })
  }
  return {
    current_customer_exception_state: sanitized.length > 0 ? 'review_required' : 'none_recorded',
    current_customer_exception_report: sanitized.at(-1) ?? null,
    customer_exception_report_timeline: sanitized,
  }
}

export type PickupTaskInput =
  | { action: 'triage_queue' }
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
  | {
      action: 'assign_self'
      rfqId: string
      notes: string | null
      idempotencyKey: string
    }
  | {
      action: 'record_dispatch'
      rfqId: string
      progress: 'en_route' | 'arrived'
      notes: string | null
      idempotencyKey: string
    }
  | {
      action: 'record_attempt'
      rfqId: string
      outcome: 'collection_asserted' | 'failed'
      reasonCode: PickupAttemptReasonCode | null
      notes: string | null
      idempotencyKey: string
    }
  | {
      action: 'add_access_instructions'
      rfqId: string
      instructionType: PickupAccessInstructionType
      instructions: string
      idempotencyKey: string
    }
  | {
      action: 'report_exception'
      rfqId: string
      description: string
      idempotencyKey: string
    }
  | {
      action: 'triage'
      rfqId: string
      triageAction: 'claim' | 'note' | 'escalate'
      escalationReason: PickupExceptionEscalationReason | null
      notes: string | null
      idempotencyKey: string
    }

const ACTION_KEYS: Record<PickupTaskInput['action'], Set<string>> = {
  triage_queue: new Set(['action']),
  status: new Set(['action', 'rfq_id', 'timeline_before_sequence']),
  propose: new Set([
    'action', 'rfq_id', 'pickup_window_start', 'pickup_window_end', 'reason_code', 'notes',
    'idempotency_key',
  ]),
  respond: new Set([
    'action', 'rfq_id', 'decision', 'reason_code', 'notes', 'idempotency_key',
  ]),
  assign_self: new Set(['action', 'rfq_id', 'notes', 'idempotency_key']),
  record_dispatch: new Set([
    'action', 'rfq_id', 'progress', 'notes', 'idempotency_key',
  ]),
  record_attempt: new Set([
    'action', 'rfq_id', 'outcome', 'reason_code', 'notes', 'idempotency_key',
  ]),
  add_access_instructions: new Set([
    'action', 'rfq_id', 'instruction_type', 'instructions', 'idempotency_key',
  ]),
  report_exception: new Set(['action', 'rfq_id', 'description', 'idempotency_key']),
  triage: new Set([
    'action', 'rfq_id', 'triage_action', 'escalation_reason', 'notes',
    'idempotency_key',
  ]),
}

export interface PickupExceptionTriageEventProjection {
  id: string
  event_sequence: number
  event_type: 'triage_claimed' | 'triage_note_added' | 'triage_escalated'
  actor_role: 'platform_operations'
  escalation_reason: PickupExceptionEscalationReason | null
  created_at: string
}

const REASON_CODE_SET = new Set<string>(PICKUP_SCHEDULE_REASON_CODES)
const ATTEMPT_REASON_CODE_SET = new Set<string>(PICKUP_ATTEMPT_REASON_CODES)
const ACCESS_INSTRUCTION_TYPE_SET = new Set<string>(PICKUP_ACCESS_INSTRUCTION_TYPES)
const EXCEPTION_ESCALATION_REASON_SET = new Set<string>(PICKUP_EXCEPTION_ESCALATION_REASONS)
const ATTEMPT_EVENT_TYPES = new Set<string>([
  'attempt_collection_asserted',
  'attempt_failed',
])

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

export function buildPickupDispatchProjection(
  timelineAscending: PickupDispatchEventProjection[],
  callerId: string,
) {
  const expectedEvents: PickupDispatchEventProjection['event_type'][] = [
    'field_actor_assigned', 'en_route_recorded', 'arrival_recorded',
  ]
  const assignedActorId = timelineAscending[0]?.assigned_actor_id ?? null
  const malformed = timelineAscending.length > expectedEvents.length
    || timelineAscending.some((event, index) =>
      event.event_sequence !== index + 1
      || event.event_type !== expectedEvents[index]
      || event.assigned_actor_id !== assignedActorId)
  if (malformed) throw new Error('Malformed PickupTask dispatch projection')

  const current = timelineAscending.length > 0
    ? timelineAscending[timelineAscending.length - 1]
    : null
  const timeline = timelineAscending.map(({ assigned_actor_id: _assignedActorId, ...event }) => event)

  return {
    current_dispatch_state: current?.event_type ?? 'not_dispatched',
    current_dispatch_event: current
      ? (({ assigned_actor_id: _assignedActorId, ...event }) => event)(current)
      : null,
    dispatch_timeline: timeline,
    caller_is_assigned_field_actor: current?.assigned_actor_id === callerId,
  }
}

export function buildPickupAttemptProjection(
  eventsAscending: PickupAttemptEventProjection[],
  callerIsAssignedFieldActor: boolean,
  dispatchState: PickupDispatchState,
) {
  if (eventsAscending.length > 1) throw new Error('Malformed PickupTask attempt projection')
  const current = eventsAscending[0] ?? null
  const malformed = current && (
    current.event_sequence !== 1
    || current.actor_role !== 'assigned_field_actor'
    || !ATTEMPT_EVENT_TYPES.has(current.event_type)
    || dispatchState !== 'arrival_recorded'
    || (current.reason_code !== null
      && !ATTEMPT_REASON_CODE_SET.has(current.reason_code))
    || (current.event_type === 'attempt_collection_asserted' && current.reason_code !== null)
    || (current.event_type === 'attempt_failed' && !current.reason_code)
    || (current.reason_code === 'other' && !current.notes?.trim())
  )
  if (malformed) throw new Error('Malformed PickupTask attempt projection')

  const sanitized = current
    ? (({ assigned_actor_id: _assignedActorId, ...event }) => event)(current)
    : null
  return {
    current_attempt_state: current?.event_type ?? 'not_recorded',
    current_attempt_event: sanitized,
    current_exception_state: current?.event_type === 'attempt_failed'
      ? 'review_required'
      : 'none_recorded',
    caller_can_record_attempt: current === null
      && callerIsAssignedFieldActor
      && dispatchState === 'arrival_recorded',
  }
}

export function buildPickupExceptionPublicProjection(
  eventsAscending: PickupExceptionTriageEventProjection[],
  exceptionState: 'none_recorded' | 'review_required',
) {
  if (exceptionState === 'none_recorded') {
    if (eventsAscending.length > 0) throw new Error('Malformed pickup exception triage projection')
    return {
      current_exception_triage_state: 'not_applicable',
      current_exception_triage_updated_at: null,
      current_exception_coordination_state: 'not_applicable',
      exception_resolution_state: 'blocked',
    }
  }

  const expectedTypes = ['triage_claimed', 'triage_note_added', 'triage_escalated'] as const
  let escalated = false
  for (let index = 0; index < eventsAscending.length; index += 1) {
    const event = eventsAscending[index]
    if (event.event_sequence !== index + 1
        || event.actor_role !== 'platform_operations'
        || !expectedTypes.includes(event.event_type)
        || (index === 0 && event.event_type !== 'triage_claimed')
        || (index > 0 && event.event_type === 'triage_claimed')
        || (event.event_type === 'triage_escalated'
          && (!event.escalation_reason
            || !EXCEPTION_ESCALATION_REASON_SET.has(event.escalation_reason)))
        || (event.event_type !== 'triage_escalated' && event.escalation_reason !== null)
        || !normalizeDate(event.created_at)
        || escalated) {
      throw new Error('Malformed pickup exception triage projection')
    }
    if (event.event_type === 'triage_escalated') escalated = true
  }

  const current = eventsAscending.at(-1) ?? null
  const coordinationState: PickupExceptionCoordinationState =
    current?.event_type !== 'triage_escalated'
      ? 'operations_review'
      : current.escalation_reason === 'additional_information_required'
        ? 'additional_information_review'
        : current.escalation_reason ?? 'operations_review'
  return {
    current_exception_triage_state: current === null
      ? 'unassigned'
      : current.event_type === 'triage_escalated' ? 'escalated' : 'under_review',
    current_exception_triage_updated_at: current?.created_at ?? null,
    current_exception_coordination_state: coordinationState,
    exception_resolution_state: 'blocked',
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
  if (action !== 'triage_queue' && action !== 'triage'
      && action !== 'status' && action !== 'propose' && action !== 'respond'
      && action !== 'assign_self' && action !== 'record_dispatch'
      && action !== 'record_attempt' && action !== 'add_access_instructions'
      && action !== 'report_exception') {
    return {
      valid: false,
      error: 'action must be status, propose, respond, assign_self, record_dispatch, record_attempt, add_access_instructions, report_exception, triage_queue, or triage',
    }
  }

  const unsupportedError = validateExactKeys(body, action)
  if (unsupportedError) return { valid: false, error: unsupportedError }

  if (action === 'triage_queue') return { valid: true, input: { action } }

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

  if (action === 'add_access_instructions') {
    const rawType = typeof body['instruction_type'] === 'string'
      ? body['instruction_type'].trim()
      : ''
    const instructions = typeof body['instructions'] === 'string'
      ? body['instructions'].trim()
      : ''
    if (!ACCESS_INSTRUCTION_TYPE_SET.has(rawType)) {
      return { valid: false, error: 'instruction_type must be a governed pickup access type' }
    }
    if (!instructions || instructions.length > MAX_NOTES_LENGTH) {
      return { valid: false, error: `instructions must contain 1 to ${MAX_NOTES_LENGTH} characters` }
    }
    return {
      valid: true,
      input: {
        action,
        rfqId,
        instructionType: rawType as PickupAccessInstructionType,
        instructions,
        idempotencyKey,
      },
    }
  }

  if (action === 'report_exception') {
    const description = typeof body['description'] === 'string'
      ? body['description'].trim()
      : ''
    if (!description || description.length > MAX_NOTES_LENGTH) {
      return {
        valid: false,
        error: `description must contain 1 to ${MAX_NOTES_LENGTH} characters`,
      }
    }
    return {
      valid: true,
      input: { action, rfqId, description, idempotencyKey },
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

  if (action === 'triage') {
    const triageAction = body['triage_action']
    if (triageAction !== 'claim' && triageAction !== 'note' && triageAction !== 'escalate') {
      return { valid: false, error: 'triage_action must be claim, note, or escalate' }
    }
    const rawEscalationReason = body['escalation_reason']
    const escalationReason = rawEscalationReason === null || rawEscalationReason === undefined
      || rawEscalationReason === ''
      ? null
      : typeof rawEscalationReason === 'string'
          && EXCEPTION_ESCALATION_REASON_SET.has(rawEscalationReason.trim())
        ? rawEscalationReason.trim() as PickupExceptionEscalationReason
        : undefined
    if (escalationReason === undefined) {
      return { valid: false, error: 'escalation_reason must be a governed triage reason' }
    }
    if (triageAction === 'escalate' && (!escalationReason || !notes)) {
      return { valid: false, error: 'escalation_reason and notes are required for escalation' }
    }
    if (triageAction !== 'escalate' && escalationReason) {
      return { valid: false, error: 'escalation_reason is permitted only for escalation' }
    }
    if (triageAction === 'note' && !notes) {
      return { valid: false, error: 'notes are required for a triage note' }
    }
    return {
      valid: true,
      input: {
        action, rfqId, triageAction, escalationReason, notes, idempotencyKey,
      },
    }
  }

  if (action === 'assign_self') {
    return {
      valid: true,
      input: { action, rfqId, notes, idempotencyKey },
    }
  }

  if (action === 'record_dispatch') {
    const progress = body['progress']
    if (progress !== 'en_route' && progress !== 'arrived') {
      return { valid: false, error: 'progress must be en_route or arrived' }
    }
    return {
      valid: true,
      input: { action, rfqId, progress, notes, idempotencyKey },
    }
  }

  if (action === 'record_attempt') {
    const outcome = body['outcome']
    if (outcome !== 'collection_asserted' && outcome !== 'failed') {
      return { valid: false, error: 'outcome must be collection_asserted or failed' }
    }
    const rawReasonCode = body['reason_code']
    const attemptReasonCode = rawReasonCode === null || rawReasonCode === undefined
      || rawReasonCode === ''
      ? null
      : typeof rawReasonCode === 'string' && ATTEMPT_REASON_CODE_SET.has(rawReasonCode.trim())
        ? rawReasonCode.trim() as PickupAttemptReasonCode
        : undefined
    if (attemptReasonCode === undefined) {
      return { valid: false, error: 'reason_code must be a governed pickup attempt reason' }
    }
    if (outcome === 'failed' && !attemptReasonCode) {
      return { valid: false, error: 'a failed pickup attempt requires a governed reason_code' }
    }
    if (outcome === 'collection_asserted' && attemptReasonCode) {
      return { valid: false, error: 'reason_code is only permitted for a failed pickup attempt' }
    }
    if (attemptReasonCode === 'other' && !notes) {
      return { valid: false, error: 'notes are required when reason_code is other' }
    }
    return {
      valid: true,
      input: { action, rfqId, outcome, reasonCode: attemptReasonCode, notes, idempotencyKey },
    }
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
