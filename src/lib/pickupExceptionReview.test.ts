import { describe, expect, it } from 'vitest'
import {
  classifyPickupExceptionReview,
  formatPickupExceptionDisplayAge,
  sortPickupExceptionReviewItems,
  type PickupExceptionReviewSource,
} from './pickupExceptionReview'

const source: PickupExceptionReviewSource = {
  rfqId: 'rfq-1',
  title: 'Air compressor',
  location: 'Unit 3',
}

function projection(overrides: Record<string, unknown> = {}) {
  const dispatchTimeline = [
    {
      id: 'dispatch-1', event_sequence: 1, event_type: 'field_actor_assigned',
      actor_role: 'vendor_dispatcher', notes: null, created_at: '2026-08-18T13:00:00Z',
    },
    {
      id: 'dispatch-2', event_sequence: 2, event_type: 'en_route_recorded',
      actor_role: 'assigned_field_actor', notes: null, created_at: '2026-08-18T14:00:00Z',
    },
    {
      id: 'dispatch-3', event_sequence: 3, event_type: 'arrival_recorded',
      actor_role: 'assigned_field_actor', notes: null, created_at: '2026-08-18T15:00:00Z',
    },
  ]
  return {
    rfq_id: 'rfq-1',
    operational_status: 'demobilizing',
    pickup_task: { id: 'task-1', object_scope: 'rfq', created_at: '2026-08-18T12:00:00Z' },
    current_schedule_state: 'schedule_confirmed',
    current_schedule_event: {
      id: 'schedule-2', event_sequence: 2, event_type: 'schedule_confirmed',
      actor_role: 'customer', pickup_window_start: '2026-08-19T14:00:00Z',
      pickup_window_end: '2026-08-19T17:00:00Z', reason_code: null, notes: null,
      created_at: '2026-08-18T12:30:00Z',
    },
    confirmed_window: {
      pickup_window_start: '2026-08-19T14:00:00Z',
      pickup_window_end: '2026-08-19T17:00:00Z',
    },
    pending_window: null,
    timeline: [],
    timeline_page: { has_more: false, next_before_sequence: null },
    current_dispatch_state: 'arrival_recorded',
    current_dispatch_event: dispatchTimeline[2],
    dispatch_timeline: dispatchTimeline,
    caller_is_assigned_field_actor: false,
    current_attempt_state: 'attempt_failed',
    current_attempt_event: {
      id: 'attempt-1', event_sequence: 1, event_type: 'attempt_failed',
      actor_role: 'assigned_field_actor', reason_code: 'equipment_not_ready',
      notes: 'Equipment remains in operation', created_at: '2026-08-18T15:30:00Z',
    },
    current_exception_state: 'review_required',
    current_exception_triage_state: 'unassigned',
    current_exception_triage_updated_at: null,
    current_exception_coordination_state: 'operations_review',
    exception_resolution_state: 'blocked',
    caller_can_record_attempt: false,
    authority_boundary: {
      object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
    },
    ...overrides,
  }
}

describe('Pickup exception review projection', () => {
  it('surfaces only a strict failed-attempt review item without custody or billing authority', () => {
    expect(classifyPickupExceptionReview(source, projection())).toEqual({
      state: 'review_required',
      item: {
        ...source,
        attemptEventId: 'attempt-1',
        reasonCode: 'equipment_not_ready',
        notes: 'Equipment remains in operation',
        recordedAt: '2026-08-18T15:30:00Z',
        triageState: 'unassigned',
        triageUpdatedAt: null,
        coordinationState: 'operations_review',
        resolutionState: 'blocked',
        authorityBoundary: {
          objectScope: 'rfq', pickupControlsBilling: false, custodyRecorded: false,
        },
      },
    })
  })

  it('does not create a review item when no exception is recorded', () => {
    expect(classifyPickupExceptionReview(source, projection({
      current_attempt_state: 'attempt_collection_asserted',
      current_attempt_event: {
        id: 'attempt-1', event_sequence: 1, event_type: 'attempt_collection_asserted',
        actor_role: 'assigned_field_actor', reason_code: null, notes: 'Collection asserted',
        created_at: '2026-08-18T15:30:00Z',
      },
      current_exception_state: 'none_recorded',
      current_exception_triage_state: 'not_applicable',
      current_exception_triage_updated_at: null,
      current_exception_coordination_state: 'not_applicable',
    }))).toEqual({ state: 'clear' })
  })

  it('fails closed on mismatched RFQ, malformed authority, or unsupported exception evidence', () => {
    expect(classifyPickupExceptionReview(source, projection({ rfq_id: 'rfq-2' })))
      .toEqual({ state: 'unknown' })
    expect(classifyPickupExceptionReview(source, projection({
      authority_boundary: {
        object_scope: 'rfq', pickup_controls_billing: true, custody_recorded: false,
      },
    }))).toEqual({ state: 'unknown' })
    expect(classifyPickupExceptionReview(source, projection({
      current_attempt_event: null,
    }))).toEqual({ state: 'unknown' })
    expect(classifyPickupExceptionReview(source, projection({
      current_exception_coordination_state: 'resolved',
    }))).toEqual({ state: 'unknown' })
  })

  it('formats display-only age and sorts oldest exceptions first', () => {
    const current = classifyPickupExceptionReview(source, projection())
    expect(current.state).toBe('review_required')
    if (current.state !== 'review_required') throw new Error('Expected review item')
    const newer = {
      ...current.item,
      attemptEventId: 'attempt-2',
      recordedAt: '2026-08-20T14:45:00Z',
    }
    expect(formatPickupExceptionDisplayAge(
      current.item.recordedAt,
      Date.parse('2026-08-20T15:30:00Z'),
    )).toBe('2d')
    expect(formatPickupExceptionDisplayAge(
      newer.recordedAt,
      Date.parse('2026-08-20T15:30:00Z'),
    )).toBe('45m')
    expect(sortPickupExceptionReviewItems([newer, current.item]).map((item) => item.attemptEventId))
      .toEqual(['attempt-1', 'attempt-2'])
  })
})
