import {
  normalizePickupTaskRecord,
  type PickupAttemptReasonCode,
  type PickupExceptionCoordinationState,
} from './pickupTaskControl'

export interface PickupExceptionReviewSource {
  rfqId: string
  title: string
  location: string | null
}

export interface PickupExceptionReviewItem extends PickupExceptionReviewSource {
  attemptEventId: string
  reasonCode: PickupAttemptReasonCode
  notes: string | null
  recordedAt: string
  triageState: 'unassigned' | 'under_review' | 'escalated'
  triageUpdatedAt: string | null
  coordinationState: PickupExceptionCoordinationState
  resolutionState: 'blocked'
  authorityBoundary: {
    objectScope: 'rfq'
    pickupControlsBilling: false
    custodyRecorded: false
  }
}

export type PickupExceptionReviewClassification =
  | { state: 'clear' }
  | { state: 'review_required'; item: PickupExceptionReviewItem }
  | { state: 'unknown' }

export function classifyPickupExceptionReview(
  source: PickupExceptionReviewSource,
  value: unknown,
): PickupExceptionReviewClassification {
  const record = normalizePickupTaskRecord(value)
  if (!record || record.rfq_id !== source.rfqId) return { state: 'unknown' }

  if (record.current_exception_state === 'none_recorded') return { state: 'clear' }
  const event = record.current_attempt_event
  if (record.current_exception_state !== 'review_required'
      || record.current_attempt_state !== 'attempt_failed'
      || !event
      || event.event_type !== 'attempt_failed'
      || !event.reason_code) {
    return { state: 'unknown' }
  }

  return {
    state: 'review_required',
    item: {
      ...source,
      attemptEventId: event.id,
      reasonCode: event.reason_code,
      notes: event.notes,
      recordedAt: event.created_at,
      triageState: record.current_exception_triage_state as
        'unassigned' | 'under_review' | 'escalated',
      triageUpdatedAt: record.current_exception_triage_updated_at,
      coordinationState: record.current_exception_coordination_state,
      resolutionState: record.exception_resolution_state,
      authorityBoundary: {
        objectScope: 'rfq',
        pickupControlsBilling: false,
        custodyRecorded: false,
      },
    },
  }
}

export function formatPickupExceptionDisplayAge(
  recordedAt: string,
  nowMs: number = Date.now(),
): string {
  const recordedMs = Date.parse(recordedAt)
  if (!Number.isFinite(recordedMs) || !Number.isFinite(nowMs) || nowMs < recordedMs) {
    return 'UNKNOWN'
  }
  const elapsedMinutes = Math.floor((nowMs - recordedMs) / 60_000)
  if (elapsedMinutes < 60) return `${elapsedMinutes}m`
  const elapsedHours = Math.floor(elapsedMinutes / 60)
  if (elapsedHours < 48) return `${elapsedHours}h`
  return `${Math.floor(elapsedHours / 24)}d`
}

export function sortPickupExceptionReviewItems(
  items: PickupExceptionReviewItem[],
): PickupExceptionReviewItem[] {
  return [...items].sort(
    (left, right) => Date.parse(left.recordedAt) - Date.parse(right.recordedAt),
  )
}
