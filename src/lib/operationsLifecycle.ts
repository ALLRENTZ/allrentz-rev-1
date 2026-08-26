import { supabase } from '@/integrations/supabase/client'

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

export interface OperationsLifecycleEvent {
  previous_status: AppRfqStatus | null
  new_status: AppRfqStatus
  created_at: string
}

export interface OperationsLifecycleItem {
  rfq_id: string
  current_status: AppRfqStatus
  created_at: string | null
  updated_at: string | null
  timeline: OperationsLifecycleEvent[]
}

export interface OperationsLifecycleProjection {
  authority: 'READ_ONLY_OPERATIONS_PROJECTION'
  scope: 'RFQ_WIDE'
  mode: 'PRODUCTION' | 'SIMULATION'
  generated_at: string
  items: OperationsLifecycleItem[]
  authority_boundary: {
    mutations_permitted: false
    billing_authority: false
    custody_authority: false
    granular_object_authority: false
  }
}

const STATUS_SET = new Set<string>(APP_RFQ_STATUSES)

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function isString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isNullableTimestamp(value: unknown): value is string | null {
  return value === null || (isString(value) && Number.isFinite(Date.parse(value)))
}

function isStatus(value: unknown): value is AppRfqStatus {
  return typeof value === 'string' && STATUS_SET.has(value)
}

export function normalizeOperationsLifecycleProjection(
  value: unknown,
): OperationsLifecycleProjection | null {
  if (!isRecord(value) || value.authority !== 'READ_ONLY_OPERATIONS_PROJECTION'
      || value.scope !== 'RFQ_WIDE'
      || (value.mode !== 'PRODUCTION' && value.mode !== 'SIMULATION')
      || !isString(value.generated_at) || !Number.isFinite(Date.parse(value.generated_at))
      || !Array.isArray(value.items) || !isRecord(value.authority_boundary)) return null

  const boundary = value.authority_boundary
  if (boundary.mutations_permitted !== false
      || boundary.billing_authority !== false
      || boundary.custody_authority !== false
      || boundary.granular_object_authority !== false) return null

  const items: OperationsLifecycleItem[] = []
  const ids = new Set<string>()
  for (const raw of value.items) {
    if (!isRecord(raw) || !isString(raw.rfq_id) || ids.has(raw.rfq_id)
        || !isStatus(raw.current_status)
        || !isNullableTimestamp(raw.created_at)
        || !isNullableTimestamp(raw.updated_at)
        || !Array.isArray(raw.timeline)) return null

    const timeline: OperationsLifecycleEvent[] = []
    let previousNewStatus: AppRfqStatus | null = null
    let previousTimestamp = Number.NEGATIVE_INFINITY
    for (const rawEvent of raw.timeline) {
      if (!isRecord(rawEvent)
          || (rawEvent.previous_status !== null && !isStatus(rawEvent.previous_status))
          || !isStatus(rawEvent.new_status)
          || !isString(rawEvent.created_at)) return null
      const timestamp = Date.parse(rawEvent.created_at)
      if (!Number.isFinite(timestamp) || timestamp < previousTimestamp
          || (previousNewStatus !== null && rawEvent.previous_status !== previousNewStatus)) return null
      timeline.push({
        previous_status: rawEvent.previous_status,
        new_status: rawEvent.new_status,
        created_at: rawEvent.created_at,
      })
      previousNewStatus = rawEvent.new_status
      previousTimestamp = timestamp
    }
    if (previousNewStatus !== null && previousNewStatus !== raw.current_status) return null

    ids.add(raw.rfq_id)
    items.push({
      rfq_id: raw.rfq_id,
      current_status: raw.current_status,
      created_at: raw.created_at,
      updated_at: raw.updated_at,
      timeline,
    })
  }

  return {
    authority: 'READ_ONLY_OPERATIONS_PROJECTION',
    scope: 'RFQ_WIDE',
    mode: value.mode,
    generated_at: value.generated_at,
    items,
    authority_boundary: {
      mutations_permitted: false,
      billing_authority: false,
      custody_authority: false,
      granular_object_authority: false,
    },
  }
}

export async function loadOperationsLifecycle(): Promise<OperationsLifecycleProjection> {
  const { data, error } = await supabase.functions.invoke('operations-lifecycle', {
    body: { action: 'list' },
  })
  if (error) throw new Error('Unable to load operations lifecycle')
  const projection = normalizeOperationsLifecycleProjection(data)
  if (!projection) throw new Error('Operations lifecycle requires review')
  return projection
}

export function formatLifecycleStatus(status: AppRfqStatus): string {
  return status.split('_').map((word) => `${word[0].toUpperCase()}${word.slice(1)}`).join(' ')
}

export function lifecycleReviewLabel(status: AppRfqStatus): string {
  if (status === 'completed' || status === 'cancelled' || status === 'rejected') return 'Terminal record'
  if (status === 'off_rent') return 'Billing authority is governed separately'
  if (status === 'off_rent_requested' || status === 'demobilizing') return 'Review governed off-rent controls'
  if (status === 'on_rent' || status === 'rental_extended') return 'Monitor active rental'
  if (status === 'mobilizing' || status === 'in_transit') return 'Monitor delivery execution'
  return 'Review canonical next action'
}
