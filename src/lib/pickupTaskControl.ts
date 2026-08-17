export type PickupScheduleState =
  | 'unscheduled'
  | 'schedule_proposed'
  | 'schedule_reschedule_proposed'
  | 'schedule_confirmed'
  | 'schedule_rejected'
  | 'unknown'

export interface PickupTaskControlRecord {
  rfq_id: string
  operational_status: string
  pickup_task: {
    id: string
    object_scope: 'rfq'
    created_at: string
  } | null
  current_schedule_state: PickupScheduleState
  current_window: {
    pickup_window_start: string
    pickup_window_end: string
  } | null
  timeline: Array<{
    id: string
    event_sequence: number
    event_type: Exclude<PickupScheduleState, 'unscheduled' | 'unknown'>
    actor_role: 'vendor_dispatch' | 'customer'
    pickup_window_start: string
    pickup_window_end: string
    notes: string | null
    created_at: string
  }>
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null
}

function validDate(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value))
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
    if (state !== 'unscheduled' || value.current_window !== null
        || !Array.isArray(value.timeline) || value.timeline.length !== 0) return null
    return {
      rfq_id: rfqId,
      operational_status: operationalStatus,
      pickup_task: null,
      current_schedule_state: 'unscheduled',
      current_window: null,
      timeline: [],
      authority_boundary: {
        object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
      },
    }
  }

  if (!isRecord(value.pickup_task) || value.pickup_task.object_scope !== 'rfq') return null
  const taskId = requiredString(value.pickup_task.id)
  const createdAt = requiredString(value.pickup_task.created_at)
  if (!taskId || !createdAt || !validDate(createdAt)) return null

  if (!Array.isArray(value.timeline) || value.timeline.length === 0) return null
  const timeline: PickupTaskControlRecord['timeline'] = []
  for (const entry of value.timeline) {
    if (!isRecord(entry)) return null
    const id = requiredString(entry.id)
    const eventType = requiredString(entry.event_type)
    const actorRole = entry.actor_role
    const start = entry.pickup_window_start
    const end = entry.pickup_window_end
    const created = entry.created_at
    if (!id || !eventType || !EVENT_TYPES.has(eventType)
        || (actorRole !== 'vendor_dispatch' && actorRole !== 'customer')
        || typeof entry.event_sequence !== 'number' || !Number.isInteger(entry.event_sequence)
        || entry.event_sequence < 1 || !validDate(start) || !validDate(end)
        || Date.parse(end) <= Date.parse(start) || !validDate(created)) return null
    timeline.push({
      id,
      event_sequence: entry.event_sequence,
      event_type: eventType as PickupTaskControlRecord['timeline'][number]['event_type'],
      actor_role: actorRole,
      pickup_window_start: start,
      pickup_window_end: end,
      notes: typeof entry.notes === 'string' ? entry.notes : null,
      created_at: created,
    })
  }

  const current = timeline[timeline.length - 1]
  if (state !== current.event_type || !isRecord(value.current_window)
      || value.current_window.pickup_window_start !== current.pickup_window_start
      || value.current_window.pickup_window_end !== current.pickup_window_end) return null

  return {
    rfq_id: rfqId,
    operational_status: operationalStatus,
    pickup_task: { id: taskId, object_scope: 'rfq', created_at: createdAt },
    current_schedule_state: current.event_type,
    current_window: {
      pickup_window_start: current.pickup_window_start,
      pickup_window_end: current.pickup_window_end,
    },
    timeline,
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
