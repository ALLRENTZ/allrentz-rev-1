export type PickupScheduleState =
  | 'unscheduled'
  | 'schedule_proposed'
  | 'schedule_reschedule_proposed'
  | 'schedule_confirmed'
  | 'schedule_rejected'
  | 'unknown'

export type PickupDispatchState =
  | 'not_dispatched'
  | 'field_actor_assigned'
  | 'en_route_recorded'
  | 'arrival_recorded'
  | 'unknown'

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

export interface PickupScheduleWindow {
  pickup_window_start: string
  pickup_window_end: string
}

export interface PickupScheduleEvent extends PickupScheduleWindow {
  id: string
  event_sequence: number
  event_type: Exclude<PickupScheduleState, 'unscheduled' | 'unknown'>
  actor_role: 'vendor_scheduler' | 'customer'
  reason_code: PickupScheduleReasonCode | null
  notes: string | null
  created_at: string
}

export interface PickupDispatchEvent {
  id: string
  event_sequence: number
  event_type: Exclude<PickupDispatchState, 'not_dispatched' | 'unknown'>
  actor_role: 'vendor_dispatcher' | 'assigned_field_actor'
  notes: string | null
  created_at: string
}

export interface PickupTaskControlRecord {
  rfq_id: string
  operational_status: string
  pickup_task: {
    id: string
    object_scope: 'rfq'
    created_at: string
  } | null
  current_schedule_state: PickupScheduleState
  current_schedule_event: PickupScheduleEvent | null
  confirmed_window: PickupScheduleWindow | null
  pending_window: PickupScheduleWindow | null
  timeline: PickupScheduleEvent[]
  timeline_page: {
    has_more: boolean
    next_before_sequence: number | null
  }
  current_dispatch_state: PickupDispatchState
  current_dispatch_event: PickupDispatchEvent | null
  dispatch_timeline: PickupDispatchEvent[]
  caller_is_assigned_field_actor: boolean
  authority_boundary: {
    object_scope: 'rfq'
    pickup_controls_billing: false
    custody_recorded: false
  }
}

const EVENT_TYPES = new Set([
  'schedule_proposed',
  'schedule_reschedule_proposed',
  'schedule_confirmed',
  'schedule_rejected',
])
const REASON_CODES = new Set<string>(PICKUP_SCHEDULE_REASON_CODES)
const DISPATCH_EVENT_TYPES = new Set([
  'field_actor_assigned', 'en_route_recorded', 'arrival_recorded',
])

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
}

function normalizeWindow(value: unknown): PickupScheduleWindow | null {
  if (value === null) return null
  if (!isRecord(value) || !validDate(value.pickup_window_start)
      || !validDate(value.pickup_window_end)
      || Date.parse(value.pickup_window_end) <= Date.parse(value.pickup_window_start)) {
    return null
  }
  return {
    pickup_window_start: value.pickup_window_start,
    pickup_window_end: value.pickup_window_end,
  }
}

function normalizeEvent(value: unknown): PickupScheduleEvent | null {
  if (!isRecord(value)) return null
  const id = requiredString(value.id)
  const eventType = requiredString(value.event_type)
  const actorRole = value.actor_role
  const reasonCode = value.reason_code
  const notes = typeof value.notes === 'string' ? value.notes : null
  const window = normalizeWindow(value)
  const isVendorEvent = eventType === 'schedule_proposed'
    || eventType === 'schedule_reschedule_proposed'
  const requiresReason = eventType === 'schedule_reschedule_proposed'
    || eventType === 'schedule_rejected'
  if (!id || !eventType || !EVENT_TYPES.has(eventType)
      || (actorRole !== 'vendor_scheduler' && actorRole !== 'customer')
      || (isVendorEvent && actorRole !== 'vendor_scheduler')
      || (!isVendorEvent && actorRole !== 'customer')
      || typeof value.event_sequence !== 'number' || !Number.isInteger(value.event_sequence)
      || value.event_sequence < 1 || !window || !validDate(value.created_at)
      || (reasonCode !== null && (typeof reasonCode !== 'string' || !REASON_CODES.has(reasonCode)))
      || (requiresReason && (reasonCode === null || !notes?.trim()))
      || (!requiresReason && reasonCode !== null)) {
    return null
  }
  return {
    id,
    event_sequence: value.event_sequence,
    event_type: eventType as PickupScheduleEvent['event_type'],
    actor_role: actorRole,
    ...window,
    reason_code: reasonCode as PickupScheduleReasonCode | null,
    notes,
    created_at: value.created_at,
  }
}

function normalizeDispatchEvent(value: unknown): PickupDispatchEvent | null {
  if (!isRecord(value)) return null
  const allowedKeys = new Set([
    'id', 'event_sequence', 'event_type', 'actor_role', 'notes', 'created_at',
  ])
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return null
  const id = requiredString(value.id)
  const eventType = requiredString(value.event_type)
  const actorRole = value.actor_role
  const notes = typeof value.notes === 'string' ? value.notes : null
  const isAssignment = eventType === 'field_actor_assigned'
  if (!id || !eventType || !DISPATCH_EVENT_TYPES.has(eventType)
      || (actorRole !== 'vendor_dispatcher' && actorRole !== 'assigned_field_actor')
      || (isAssignment && actorRole !== 'vendor_dispatcher')
      || (!isAssignment && actorRole !== 'assigned_field_actor')
      || typeof value.event_sequence !== 'number' || !Number.isInteger(value.event_sequence)
      || value.event_sequence < 1 || !validDate(value.created_at)
      || (value.notes !== null && typeof value.notes !== 'string')) {
    return null
  }
  return {
    id,
    event_sequence: value.event_sequence,
    event_type: eventType as PickupDispatchEvent['event_type'],
    actor_role: actorRole,
    notes,
    created_at: value.created_at,
  }
}

function windowsMatch(left: PickupScheduleWindow | null, right: PickupScheduleEvent | null): boolean {
  if (!left || !right) return left === null && right === null
  return left.pickup_window_start === right.pickup_window_start
    && left.pickup_window_end === right.pickup_window_end
}

export function normalizePickupTaskRecord(value: unknown): PickupTaskControlRecord | null {
  if (!isRecord(value)) return null
  const rfqId = requiredString(value.rfq_id)
  const operationalStatus = requiredString(value.operational_status)
  const state = requiredString(value.current_schedule_state)
  if (!rfqId || !operationalStatus || !state) return null
  if (!isRecord(value.authority_boundary)
      || value.authority_boundary.object_scope !== 'rfq'
      || value.authority_boundary.pickup_controls_billing !== false
      || value.authority_boundary.custody_recorded !== false) {
    return null
  }

  if (value.pickup_task === null) {
    if (state !== 'unscheduled' || value.current_schedule_event !== null
        || value.confirmed_window !== null || value.pending_window !== null
        || !Array.isArray(value.timeline) || value.timeline.length !== 0
        || !isRecord(value.timeline_page) || value.timeline_page.has_more !== false
        || value.timeline_page.next_before_sequence !== null
        || value.current_dispatch_state !== 'not_dispatched'
        || value.current_dispatch_event !== null
        || !Array.isArray(value.dispatch_timeline) || value.dispatch_timeline.length !== 0
        || value.caller_is_assigned_field_actor !== false) return null
    return {
      rfq_id: rfqId,
      operational_status: operationalStatus,
      pickup_task: null,
      current_schedule_state: 'unscheduled',
      current_schedule_event: null,
      confirmed_window: null,
      pending_window: null,
      timeline: [],
      timeline_page: { has_more: false, next_before_sequence: null },
      current_dispatch_state: 'not_dispatched',
      current_dispatch_event: null,
      dispatch_timeline: [],
      caller_is_assigned_field_actor: false,
      authority_boundary: {
        object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
      },
    }
  }

  if (!isRecord(value.pickup_task) || value.pickup_task.object_scope !== 'rfq') return null
  const taskId = requiredString(value.pickup_task.id)
  const createdAt = requiredString(value.pickup_task.created_at)
  if (!taskId || !createdAt || !validDate(createdAt)) return null

  const current = normalizeEvent(value.current_schedule_event)
  if (!current || state !== current.event_type) return null

  const confirmedWindow = normalizeWindow(value.confirmed_window)
  const pendingWindow = normalizeWindow(value.pending_window)
  const pendingState = state === 'schedule_proposed' || state === 'schedule_reschedule_proposed'
  if ((value.confirmed_window !== null && !confirmedWindow)
      || (value.pending_window !== null && !pendingWindow)
      || (pendingState && !windowsMatch(pendingWindow, current))
      || (!pendingState && pendingWindow !== null)
      || (state === 'schedule_confirmed' && !windowsMatch(confirmedWindow, current))) return null

  if (!Array.isArray(value.timeline)) return null
  const timeline: PickupTaskControlRecord['timeline'] = []
  for (const entry of value.timeline) {
    const normalized = normalizeEvent(entry)
    if (!normalized) return null
    timeline.push(normalized)
  }
  for (let index = 1; index < timeline.length; index += 1) {
    if (timeline[index - 1].event_sequence >= timeline[index].event_sequence) return null
  }
  if (!isRecord(value.timeline_page) || typeof value.timeline_page.has_more !== 'boolean') return null
  const nextBefore = value.timeline_page.next_before_sequence
  if (nextBefore !== null
      && (typeof nextBefore !== 'number' || !Number.isInteger(nextBefore) || nextBefore < 2)) return null
  if (value.timeline_page.has_more !== (nextBefore !== null)) return null

  const dispatchState = requiredString(value.current_dispatch_state)
  if (!dispatchState || (!DISPATCH_EVENT_TYPES.has(dispatchState)
      && dispatchState !== 'not_dispatched')) return null
  if (!Array.isArray(value.dispatch_timeline)
      || typeof value.caller_is_assigned_field_actor !== 'boolean') return null
  const dispatchTimeline: PickupDispatchEvent[] = []
  for (const entry of value.dispatch_timeline) {
    const normalized = normalizeDispatchEvent(entry)
    if (!normalized) return null
    dispatchTimeline.push(normalized)
  }
  for (let index = 0; index < dispatchTimeline.length; index += 1) {
    if (dispatchTimeline[index].event_sequence !== index + 1) return null
    const expectedEvent = [
      'field_actor_assigned', 'en_route_recorded', 'arrival_recorded',
    ][index]
    if (dispatchTimeline[index].event_type !== expectedEvent) return null
  }
  if (dispatchTimeline.length > 3) return null
  const currentDispatch = value.current_dispatch_event === null
    ? null
    : normalizeDispatchEvent(value.current_dispatch_event)
  if (dispatchState === 'not_dispatched') {
    if (currentDispatch !== null || dispatchTimeline.length !== 0
        || value.caller_is_assigned_field_actor !== false) return null
  } else {
    const latestDispatch = dispatchTimeline.length > 0
      ? dispatchTimeline[dispatchTimeline.length - 1]
      : null
    if (!currentDispatch || !latestDispatch || currentDispatch.id !== latestDispatch.id
        || currentDispatch.event_type !== dispatchState) return null
  }

  return {
    rfq_id: rfqId,
    operational_status: operationalStatus,
    pickup_task: { id: taskId, object_scope: 'rfq', created_at: createdAt },
    current_schedule_state: current.event_type,
    current_schedule_event: current,
    confirmed_window: confirmedWindow,
    pending_window: pendingWindow,
    timeline,
    timeline_page: {
      has_more: value.timeline_page.has_more,
      next_before_sequence: nextBefore === null ? null : Number(nextBefore),
    },
    current_dispatch_state: dispatchState as PickupDispatchState,
    current_dispatch_event: currentDispatch,
    dispatch_timeline: dispatchTimeline,
    caller_is_assigned_field_actor: value.caller_is_assigned_field_actor,
    authority_boundary: {
      object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
    },
  }
}

export function pickupScheduleLabel(state: PickupScheduleState): string {
  if (state === 'unscheduled') return 'Unscheduled'
  if (state === 'schedule_proposed') return 'Pickup window proposed'
  if (state === 'schedule_reschedule_proposed') return 'Revised pickup window proposed'
  if (state === 'schedule_confirmed') return 'Pickup window confirmed'
  if (state === 'schedule_rejected') return 'Pickup window needs revision'
  return 'Schedule status unknown'
}

export function hasPendingPickupProposal(state: PickupScheduleState): boolean {
  return state === 'schedule_proposed' || state === 'schedule_reschedule_proposed'
}

export function pickupDispatchLabel(state: PickupDispatchState): string {
  if (state === 'not_dispatched') return 'Not dispatched'
  if (state === 'field_actor_assigned') return 'Field actor assigned'
  if (state === 'en_route_recorded') return 'En route (reported)'
  if (state === 'arrival_recorded') return 'Arrived at site (reported)'
  return 'Dispatch status unknown'
}
