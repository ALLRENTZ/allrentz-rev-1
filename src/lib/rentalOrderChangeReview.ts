import { supabase } from '@/integrations/supabase/client'

export interface RentalOrderChangeReviewProjection {
  authority: 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION'
  scope: 'RFQ_WIDE'
  rental_order_id: string
  order_reference: string
  current_status: string
  base_version_number: number
  base_end_date_state: 'UNKNOWN'
  review_state: 'NONE' | 'REVIEW_REQUIRED'
  decision_state: 'NOT_IMPLEMENTED'
  requests: Array<{
    request_id: string
    requester_party: 'customer' | 'vendor'
    proposed_end_date: string
    request_reason: string
    created_at: string
  }>
  permitted_requester_parties: Array<'customer' | 'vendor'>
  next_step: 'SUBMIT_CHANGE_REVIEW' | 'OPERATIONS_REVIEW'
  authority_boundary: {
    change_order_authority: false
    version_activation_authority: false
    lifecycle_transition_authority: false
    billing_authority: false
    custody_authority: false
    granular_scope_authority: false
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function validDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}

export function normalizeRentalOrderChangeReviewProjection(
  value: unknown,
): RentalOrderChangeReviewProjection | null {
  if (!isRecord(value)
      || value.authority !== 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION'
      || value.scope !== 'RFQ_WIDE'
      || typeof value.rental_order_id !== 'string' || !value.rental_order_id
      || typeof value.order_reference !== 'string' || !value.order_reference
      || typeof value.current_status !== 'string' || !value.current_status
      || typeof value.base_version_number !== 'number'
      || !Number.isInteger(value.base_version_number) || value.base_version_number < 1
      || value.base_end_date_state !== 'UNKNOWN'
      || (value.review_state !== 'NONE' && value.review_state !== 'REVIEW_REQUIRED')
      || value.decision_state !== 'NOT_IMPLEMENTED'
      || !Array.isArray(value.requests)
      || !Array.isArray(value.permitted_requester_parties)
      || (value.next_step !== 'SUBMIT_CHANGE_REVIEW' && value.next_step !== 'OPERATIONS_REVIEW')
      || !isRecord(value.authority_boundary)) return null

  const boundary = value.authority_boundary
  if (boundary.change_order_authority !== false
      || boundary.version_activation_authority !== false
      || boundary.lifecycle_transition_authority !== false
      || boundary.billing_authority !== false
      || boundary.custody_authority !== false
      || boundary.granular_scope_authority !== false) return null

  const parties: Array<'customer' | 'vendor'> = []
  for (const party of value.permitted_requester_parties) {
    if ((party !== 'customer' && party !== 'vendor') || parties.includes(party)) return null
    parties.push(party)
  }

  const requests: RentalOrderChangeReviewProjection['requests'] = []
  const requestIds = new Set<string>()
  let priorTime = Number.POSITIVE_INFINITY
  for (const raw of value.requests) {
    if (!isRecord(raw) || typeof raw.request_id !== 'string' || !raw.request_id
        || requestIds.has(raw.request_id)
        || (raw.requester_party !== 'customer' && raw.requester_party !== 'vendor')
        || !validDate(raw.proposed_end_date)
        || typeof raw.request_reason !== 'string' || raw.request_reason.trim().length < 5
        || typeof raw.created_at !== 'string') return null
    const createdAt = Date.parse(raw.created_at)
    if (!Number.isFinite(createdAt) || createdAt > priorTime) return null
    priorTime = createdAt
    requestIds.add(raw.request_id)
    requests.push({
      request_id: raw.request_id,
      requester_party: raw.requester_party,
      proposed_end_date: raw.proposed_end_date,
      request_reason: raw.request_reason.trim(),
      created_at: raw.created_at,
    })
  }
  if (requests.length === 0
      && (value.review_state !== 'NONE' || value.next_step !== 'SUBMIT_CHANGE_REVIEW')) return null
  if (requests.length > 0
      && (value.review_state !== 'REVIEW_REQUIRED' || value.next_step !== 'OPERATIONS_REVIEW')) return null

  return {
    authority: 'READ_ONLY_RENTAL_ORDER_CHANGE_REVIEW_PROJECTION',
    scope: 'RFQ_WIDE',
    rental_order_id: value.rental_order_id,
    order_reference: value.order_reference,
    current_status: value.current_status,
    base_version_number: value.base_version_number,
    base_end_date_state: 'UNKNOWN',
    review_state: value.review_state,
    decision_state: 'NOT_IMPLEMENTED',
    requests,
    permitted_requester_parties: parties,
    next_step: value.next_step,
    authority_boundary: {
      change_order_authority: false,
      version_activation_authority: false,
      lifecycle_transition_authority: false,
      billing_authority: false,
      custody_authority: false,
      granular_scope_authority: false,
    },
  }
}

export async function loadRentalOrderChangeReview(
  rfqId: string,
): Promise<RentalOrderChangeReviewProjection> {
  const { data, error } = await supabase.functions.invoke('rental-order', {
    body: { action: 'change_review_status', rfq_id: rfqId },
  })
  if (error) throw new Error('Unable to load Rental Order change review')
  const projection = normalizeRentalOrderChangeReviewProjection(data)
  if (!projection) throw new Error('Rental Order change review requires review')
  return projection
}

export async function requestRentalOrderEndDateChangeReview(input: {
  rentalOrderId: string
  requesterParty: 'customer' | 'vendor'
  proposedEndDate: string
  requestReason: string
  idempotencyKey: string
}): Promise<RentalOrderChangeReviewProjection> {
  const { data, error } = await supabase.functions.invoke('rental-order', {
    body: {
      action: 'request_end_date_change_review',
      rental_order_id: input.rentalOrderId,
      requester_party: input.requesterParty,
      proposed_end_date: input.proposedEndDate,
      request_reason: input.requestReason,
      idempotency_key: input.idempotencyKey,
    },
  })
  if (error) throw new Error('Unable to submit Rental Order change review')
  const projection = normalizeRentalOrderChangeReviewProjection(data)
  if (!projection) throw new Error('Rental Order change-review result requires review')
  return projection
}
