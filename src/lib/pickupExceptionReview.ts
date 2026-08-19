import {
  normalizePickupTaskRecord,
  type PickupAttemptReasonCode,
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
      resolutionState: record.exception_resolution_state,
      authorityBoundary: {
        objectScope: 'rfq',
        pickupControlsBilling: false,
        custodyRecorded: false,
      },
    },
  }
}
