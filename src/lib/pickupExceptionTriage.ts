import { supabase } from '@/integrations/supabase/client'

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

export interface PickupExceptionTriageEvent {
  id: string
  event_sequence: number
  event_type: 'triage_claimed' | 'triage_note_added' | 'triage_escalated'
  escalation_reason: PickupExceptionEscalationReason | null
  notes: string | null
  created_at: string
  performed_by_caller: boolean
}

export interface PickupExceptionTriageItem {
  rfq_id: string
  pickup_task_id: string
  attempt_event_id: string
  attempt_reason_code: string
  attempt_notes: string | null
  attempt_created_at: string
  triage_state: 'unassigned' | 'claimed' | 'escalated'
  assigned_to_caller: boolean
  escalation_reason: PickupExceptionEscalationReason | null
  latest_triage_at: string | null
  note_count: number
  internal_timeline: PickupExceptionTriageEvent[]
  resolution_state: 'blocked'
}

type TriageQueue = {
  items: PickupExceptionTriageItem[]
  authority_boundary: {
    object_scope: 'rfq'
    non_authoritative_triage: true
    resolution_state: 'blocked'
    pickup_controls_billing: false
    custody_recorded: false
  }
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

const ESCALATION_REASONS = new Set<string>(PICKUP_EXCEPTION_ESCALATION_REASONS)

export function normalizePickupExceptionTriageQueue(value: unknown): TriageQueue | null {
  if (!value || typeof value !== 'object') return null
  const record = value as Record<string, unknown>
  const boundary = record.authority_boundary as Record<string, unknown> | undefined
  if (!boundary || boundary.object_scope !== 'rfq'
      || boundary.non_authoritative_triage !== true
      || boundary.resolution_state !== 'blocked'
      || boundary.pickup_controls_billing !== false
      || boundary.custody_recorded !== false
      || !Array.isArray(record.items)) return null

  const items: PickupExceptionTriageItem[] = []
  for (const raw of record.items) {
    if (!raw || typeof raw !== 'object') return null
    const item = raw as Record<string, unknown>
    const state = item.triage_state
    if (!isString(item.rfq_id) || !isString(item.pickup_task_id)
        || !isString(item.attempt_event_id) || !isString(item.attempt_reason_code)
        || !isString(item.attempt_created_at)
        || (state !== 'unassigned' && state !== 'claimed' && state !== 'escalated')
        || typeof item.assigned_to_caller !== 'boolean'
        || !isNullableString(item.attempt_notes)
        || (item.escalation_reason !== null
          && (typeof item.escalation_reason !== 'string'
            || !ESCALATION_REASONS.has(item.escalation_reason)))
        || (item.latest_triage_at !== null && !isString(item.latest_triage_at))
        || typeof item.note_count !== 'number' || !Number.isInteger(item.note_count)
        || item.note_count < 0
        || item.resolution_state !== 'blocked'
        || !Array.isArray(item.internal_timeline)) return null
    const timeline: PickupExceptionTriageEvent[] = []
    let escalated = false
    let noteCount = 0
    for (const rawEvent of item.internal_timeline) {
      if (!rawEvent || typeof rawEvent !== 'object') return null
      const event = rawEvent as Record<string, unknown>
      if (!isString(event.id) || typeof event.event_sequence !== 'number'
          || !Number.isInteger(event.event_sequence) || event.event_sequence < 1
          || (event.event_type !== 'triage_claimed'
            && event.event_type !== 'triage_note_added'
            && event.event_type !== 'triage_escalated')
          || !isString(event.created_at)
          || !isNullableString(event.notes)
          || (event.escalation_reason !== null
            && (typeof event.escalation_reason !== 'string'
              || !ESCALATION_REASONS.has(event.escalation_reason)))
          || (event.event_type === 'triage_escalated' && event.escalation_reason === null)
          || (event.event_type !== 'triage_escalated' && event.escalation_reason !== null)
          || typeof event.performed_by_caller !== 'boolean') return null
      const expectedSequence = timeline.length + 1
      if (event.event_sequence !== expectedSequence
          || (expectedSequence === 1 && event.event_type !== 'triage_claimed')
          || (expectedSequence > 1 && event.event_type === 'triage_claimed')
          || escalated) return null
      if (event.event_type === 'triage_note_added') noteCount += 1
      if (event.event_type === 'triage_escalated') escalated = true
      timeline.push(event as unknown as PickupExceptionTriageEvent)
    }
    const latestEvent = timeline.at(-1)
    if (item.note_count !== noteCount
        || (state === 'unassigned'
          && (timeline.length !== 0 || item.assigned_to_caller !== false
            || item.latest_triage_at !== null || item.escalation_reason !== null))
        || (state === 'claimed'
          && (!latestEvent || escalated || item.latest_triage_at !== latestEvent.created_at
            || item.escalation_reason !== null))
        || (state === 'escalated'
          && (!latestEvent || latestEvent.event_type !== 'triage_escalated'
            || item.latest_triage_at !== latestEvent.created_at
            || item.escalation_reason !== latestEvent.escalation_reason))) return null
    items.push({
      ...(item as unknown as PickupExceptionTriageItem),
      note_count: item.note_count,
      internal_timeline: timeline,
    })
  }
  return { items, authority_boundary: boundary as TriageQueue['authority_boundary'] }
}

export async function loadPickupExceptionTriageQueue(): Promise<TriageQueue> {
  const { data, error } = await supabase.functions.invoke('rfq-pickup-task', {
    body: { action: 'triage_queue' },
  })
  if (error) throw new Error('Unable to load pickup exception triage')
  const queue = normalizePickupExceptionTriageQueue(data)
  if (!queue) throw new Error('Pickup exception triage requires review')
  return queue
}

export async function appendPickupExceptionTriage(input: {
  rfqId: string
  action: 'claim' | 'note' | 'escalate'
  notes?: string | null
  escalationReason?: PickupExceptionEscalationReason | null
}): Promise<void> {
  const { error } = await supabase.functions.invoke('rfq-pickup-task', {
    body: {
      action: 'triage',
      rfq_id: input.rfqId,
      triage_action: input.action,
      escalation_reason: input.escalationReason ?? null,
      notes: input.notes ?? null,
      idempotency_key: crypto.randomUUID(),
    },
  })
  if (error) throw new Error('Pickup exception triage action was denied')
}
