import { supabase } from '@/integrations/supabase/client'
import {
  normalizeFieldAcceptanceStatus,
  type FieldAcceptanceStatusProjection,
} from '@/lib/fieldAcceptanceStatus'

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

export interface PreDispatchRequirementProjection {
  key: 'twic' | 'isnet' | 'purchase_order'
  requirement_status: 'REQUIRED' | 'NOT_REQUIRED' | 'UNKNOWN'
  evidence_status: 'UNKNOWN' | 'NOT_APPLICABLE'
}

export interface PreDispatchReadinessProjection {
  authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION'
  scope: 'RFQ_WIDE'
  packet_state: 'REVIEW_REQUIRED'
  release_readiness: 'BLOCKED'
  release_authority: 'NOT_IMPLEMENTED'
  accepted_quote_state: 'RECORDED' | 'UNKNOWN'
  vendor_confirmation_state: 'RECORDED' | 'REVIEW_REQUIRED'
  requirements: PreDispatchRequirementProjection[]
}

export interface OperationsLifecycleItem {
  rfq_id: string
  current_status: AppRfqStatus
  created_at: string | null
  updated_at: string | null
  pre_dispatch: PreDispatchReadinessProjection | null
  field_acceptance: FieldAcceptanceStatusProjection | null
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
    release_authority: false
  }
}

const STATUS_SET = new Set<string>(APP_RFQ_STATUSES)
const PRE_DISPATCH_STATUS_SET = new Set<AppRfqStatus>([
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
])
const FIELD_ACCEPTANCE_STATUS_SET = new Set<AppRfqStatus>([
  'in_transit',
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
  'completed',
])
const REQUIREMENT_KEYS = ['twic', 'isnet', 'purchase_order'] as const

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

function normalizePreDispatchReadiness(
  value: unknown,
  status: AppRfqStatus,
): PreDispatchReadinessProjection | null | undefined {
  if (!PRE_DISPATCH_STATUS_SET.has(status)) return value === null ? null : undefined
  if (!isRecord(value)
      || value.authority !== 'READ_ONLY_PRE_DISPATCH_PROJECTION'
      || value.scope !== 'RFQ_WIDE'
      || value.packet_state !== 'REVIEW_REQUIRED'
      || value.release_readiness !== 'BLOCKED'
      || value.release_authority !== 'NOT_IMPLEMENTED'
      || (value.accepted_quote_state !== 'RECORDED'
        && value.accepted_quote_state !== 'UNKNOWN')
      || (value.vendor_confirmation_state !== 'RECORDED'
        && value.vendor_confirmation_state !== 'REVIEW_REQUIRED')
      || !Array.isArray(value.requirements)
      || value.requirements.length !== REQUIREMENT_KEYS.length) return undefined

  if (status === 'quote_accepted' && value.vendor_confirmation_state !== 'REVIEW_REQUIRED') {
    return undefined
  }
  if (status !== 'quote_accepted' && value.vendor_confirmation_state !== 'RECORDED') {
    return undefined
  }

  const requirements: PreDispatchRequirementProjection[] = []
  for (let index = 0; index < REQUIREMENT_KEYS.length; index += 1) {
    const raw = value.requirements[index]
    if (!isRecord(raw) || raw.key !== REQUIREMENT_KEYS[index]
        || (raw.requirement_status !== 'REQUIRED'
          && raw.requirement_status !== 'NOT_REQUIRED'
          && raw.requirement_status !== 'UNKNOWN')
        || (raw.evidence_status !== 'UNKNOWN'
          && raw.evidence_status !== 'NOT_APPLICABLE')
        || (raw.requirement_status === 'NOT_REQUIRED'
          ? raw.evidence_status !== 'NOT_APPLICABLE'
          : raw.evidence_status !== 'UNKNOWN')) return undefined
    requirements.push({
      key: raw.key,
      requirement_status: raw.requirement_status,
      evidence_status: raw.evidence_status,
    })
  }

  return {
    authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
    scope: 'RFQ_WIDE',
    packet_state: 'REVIEW_REQUIRED',
    release_readiness: 'BLOCKED',
    release_authority: 'NOT_IMPLEMENTED',
    accepted_quote_state: value.accepted_quote_state,
    vendor_confirmation_state: value.vendor_confirmation_state,
    requirements,
  }
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
      || boundary.granular_object_authority !== false
      || boundary.release_authority !== false) return null

  const items: OperationsLifecycleItem[] = []
  const ids = new Set<string>()
  for (const raw of value.items) {
    if (!isRecord(raw) || !isString(raw.rfq_id) || ids.has(raw.rfq_id)
        || !isStatus(raw.current_status)
        || !isNullableTimestamp(raw.created_at)
        || !isNullableTimestamp(raw.updated_at)
        || !Array.isArray(raw.timeline)) return null

    const preDispatch = normalizePreDispatchReadiness(raw.pre_dispatch, raw.current_status)
    if (preDispatch === undefined) return null
    const fieldAcceptance = FIELD_ACCEPTANCE_STATUS_SET.has(raw.current_status)
      ? normalizeFieldAcceptanceStatus(raw.field_acceptance)
      : raw.field_acceptance === null ? null : undefined
    if (fieldAcceptance === undefined
        || (FIELD_ACCEPTANCE_STATUS_SET.has(raw.current_status) && fieldAcceptance === null)) return null
    if (fieldAcceptance && fieldAcceptance.current_status !== raw.current_status) return null

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
      pre_dispatch: preDispatch,
      field_acceptance: fieldAcceptance,
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
      release_authority: false,
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
