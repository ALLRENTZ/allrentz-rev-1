import { describe, expect, it } from 'vitest'
import {
  buildPickupAttemptProjection,
  buildPickupDispatchProjection,
  buildPickupExceptionPublicProjection,
  buildPickupScheduleProjection,
  validatePickupTaskAction,
  type PickupAttemptEventProjection,
  type PickupDispatchEventProjection,
  type PickupExceptionTriageEventProjection,
  type PickupScheduleEventProjection,
} from './pickupTaskPolicy'

describe('PickupTask action policy', () => {
  it('accepts the read-only status projection', () => {
    expect(validatePickupTaskAction({ action: 'status', rfq_id: 'rfq-1' })).toEqual({
      valid: true,
      input: { action: 'status', rfqId: 'rfq-1', timelineBeforeSequence: null },
    })
    expect(validatePickupTaskAction({
      action: 'status', rfq_id: 'rfq-1', timeline_before_sequence: null,
    })).toMatchObject({ valid: true, input: { timelineBeforeSequence: null } })
    expect(validatePickupTaskAction({
      action: 'status', rfq_id: 'rfq-1', timeline_before_sequence: 101,
    })).toMatchObject({ valid: true, input: { timelineBeforeSequence: 101 } })
    expect(validatePickupTaskAction({
      action: 'status', rfq_id: 'rfq-1', timeline_before_sequence: 1,
    })).toEqual({
      valid: false,
      error: 'timeline_before_sequence must be an integer greater than 1',
    })
  })

  it('accepts a complete vendor proposal', () => {
    expect(validatePickupTaskAction({
      action: 'propose',
      rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-18T14:00:00Z',
      pickup_window_end: '2026-08-18T17:00:00Z',
      reason_code: null,
      notes: 'Gate 3',
      idempotency_key: 'proposal-1',
    })).toMatchObject({ valid: true, input: { action: 'propose' } })
  })

  it('accepts confirmation and requires a structured reason plus notes for rejection', () => {
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'confirm',
      idempotency_key: 'response-1',
    })).toMatchObject({ valid: true, input: { decision: 'confirm' } })
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'reject',
      idempotency_key: 'response-2',
    })).toEqual({
      valid: false,
      error: 'reason_code and notes are required when rejecting a pickup schedule',
    })
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'reject',
      reason_code: 'customer_access_conflict', notes: 'Gate access changed',
      idempotency_key: 'response-2b',
    })).toMatchObject({
      valid: true,
      input: { decision: 'reject', reasonCode: 'customer_access_conflict' },
    })
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'reject',
      reason_code: 'not-governed', notes: 'Cannot access the site',
      idempotency_key: 'response-3',
    })).toEqual({ valid: false, error: 'reason_code must be a governed pickup reason' })
  })

  it('rejects invalid windows and oversized values', () => {
    expect(validatePickupTaskAction({
      action: 'propose', rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-18T17:00:00Z',
      pickup_window_end: '2026-08-18T14:00:00Z',
      idempotency_key: 'proposal-2',
    })).toEqual({ valid: false, error: 'pickup_window_end must be after pickup_window_start' })
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'confirm',
      notes: 'x'.repeat(4001), idempotency_key: 'response-4',
    })).toEqual({ valid: false, error: 'notes cannot exceed 4000 characters' })
  })

  it('accepts self-assignment and strict field-progress commands', () => {
    expect(validatePickupTaskAction({
      action: 'assign_self', rfq_id: 'rfq-1', notes: 'Assigned for the route',
      idempotency_key: 'assign-1',
    })).toMatchObject({ valid: true, input: { action: 'assign_self' } })
    expect(validatePickupTaskAction({
      action: 'record_dispatch', rfq_id: 'rfq-1', progress: 'en_route',
      notes: 'Departed vendor yard', idempotency_key: 'dispatch-1',
    })).toMatchObject({ valid: true, input: { progress: 'en_route' } })
    expect(validatePickupTaskAction({
      action: 'record_dispatch', rfq_id: 'rfq-1', progress: 'complete',
      idempotency_key: 'dispatch-2',
    })).toEqual({ valid: false, error: 'progress must be en_route or arrived' })
  })

  it('accepts only governed pickup attempt outcomes and structured failure reasons', () => {
    expect(validatePickupTaskAction({
      action: 'record_attempt', rfq_id: 'rfq-1', outcome: 'collection_asserted',
      reason_code: null, notes: 'Loaded by driver', idempotency_key: 'attempt-1',
    })).toMatchObject({ valid: true, input: { outcome: 'collection_asserted' } })
    expect(validatePickupTaskAction({
      action: 'record_attempt', rfq_id: 'rfq-1', outcome: 'failed',
      reason_code: 'equipment_not_ready', notes: 'Still in use', idempotency_key: 'attempt-2',
    })).toMatchObject({
      valid: true, input: { outcome: 'failed', reasonCode: 'equipment_not_ready' },
    })
    expect(validatePickupTaskAction({
      action: 'record_attempt', rfq_id: 'rfq-1', outcome: 'failed',
      reason_code: null, idempotency_key: 'attempt-3',
    })).toEqual({
      valid: false, error: 'a failed pickup attempt requires a governed reason_code',
    })
    expect(validatePickupTaskAction({
      action: 'record_attempt', rfq_id: 'rfq-1', outcome: 'collection_asserted',
      reason_code: 'equipment_not_ready', idempotency_key: 'attempt-4',
    })).toEqual({
      valid: false, error: 'reason_code is only permitted for a failed pickup attempt',
    })
  })

  it('accepts only non-authoritative triage queue and append actions', () => {
    expect(validatePickupTaskAction({ action: 'triage_queue' })).toEqual({
      valid: true, input: { action: 'triage_queue' },
    })
    expect(validatePickupTaskAction({
      action: 'triage', rfq_id: 'rfq-1', triage_action: 'claim',
      idempotency_key: 'claim-1',
    })).toMatchObject({ valid: true, input: { triageAction: 'claim' } })
    expect(validatePickupTaskAction({
      action: 'triage', rfq_id: 'rfq-1', triage_action: 'note',
      notes: 'Customer contact requested', idempotency_key: 'note-1',
    })).toMatchObject({ valid: true, input: { triageAction: 'note' } })
    expect(validatePickupTaskAction({
      action: 'triage', rfq_id: 'rfq-1', triage_action: 'escalate',
      escalation_reason: 'site_access_review', notes: 'Gate remains inaccessible',
      idempotency_key: 'escalate-1',
    })).toMatchObject({
      valid: true,
      input: { triageAction: 'escalate', escalationReason: 'site_access_review' },
    })
    expect(validatePickupTaskAction({
      action: 'triage', rfq_id: 'rfq-1', triage_action: 'resolve',
      idempotency_key: 'resolve-1',
    })).toEqual({ valid: false, error: 'triage_action must be claim, note, or escalate' })
    expect(validatePickupTaskAction({
      action: 'triage', rfq_id: 'rfq-1', triage_action: 'escalate',
      escalation_reason: 'billing_adjustment', notes: 'Not permitted',
      idempotency_key: 'escalate-2',
    })).toEqual({ valid: false, error: 'escalation_reason must be a governed triage reason' })
  })

  it('projects event 101 independently from the 100-event timeline page', () => {
    const events = Array.from({ length: 101 }, (_, index): PickupScheduleEventProjection => ({
      id: `event-${101 - index}`,
      event_sequence: 101 - index,
      event_type: index === 0 ? 'schedule_reschedule_proposed' : 'schedule_confirmed',
      actor_role: index === 0 ? 'vendor_scheduler' : 'customer',
      pickup_window_start: '2026-08-19T14:00:00Z',
      pickup_window_end: '2026-08-19T17:00:00Z',
      reason_code: index === 0 ? 'vendor_capacity' : null,
      notes: index === 0 ? 'Vendor capacity changed' : null,
      created_at: '2026-08-18T12:00:00Z',
    }))
    const projection = buildPickupScheduleProjection(events[0], events[1], events)

    expect(projection.current_schedule_event.event_sequence).toBe(101)
    expect(projection.current_schedule_state).toBe('schedule_reschedule_proposed')
    expect(projection.timeline).toHaveLength(100)
    expect(projection.timeline_page).toEqual({ has_more: true, next_before_sequence: 2 })
  })

  it('sanitizes assigned identity while preserving caller-specific field authority', () => {
    const events: PickupDispatchEventProjection[] = [
      {
        id: 'dispatch-1', event_sequence: 1, event_type: 'field_actor_assigned',
        actor_role: 'vendor_dispatcher', assigned_actor_id: 'vendor-user', notes: null,
        created_at: '2026-08-18T13:00:00Z',
      },
      {
        id: 'dispatch-2', event_sequence: 2, event_type: 'en_route_recorded',
        actor_role: 'assigned_field_actor', assigned_actor_id: 'vendor-user',
        notes: 'Departed vendor yard', created_at: '2026-08-19T13:00:00Z',
      },
    ]
    const assigned = buildPickupDispatchProjection(events, 'vendor-user')
    const customer = buildPickupDispatchProjection(events, 'customer-user')

    expect(assigned.current_dispatch_state).toBe('en_route_recorded')
    expect(assigned.caller_is_assigned_field_actor).toBe(true)
    expect(customer.caller_is_assigned_field_actor).toBe(false)
    expect(assigned.current_dispatch_event).not.toHaveProperty('assigned_actor_id')
    expect(assigned.dispatch_timeline[0]).not.toHaveProperty('assigned_actor_id')
    expect(() => buildPickupDispatchProjection([
      events[0],
      { ...events[1], event_type: 'arrival_recorded' },
    ], 'vendor-user')).toThrow('Malformed PickupTask dispatch projection')
  })

  it('projects a sanitized attempt assertion and fail-closed exception state', () => {
    const collection: PickupAttemptEventProjection = {
      id: 'attempt-1', event_sequence: 1, event_type: 'attempt_collection_asserted',
      actor_role: 'assigned_field_actor', assigned_actor_id: 'vendor-user',
      reason_code: null, notes: 'Loaded by driver', created_at: '2026-08-18T15:30:00Z',
    }
    const recorded = buildPickupAttemptProjection([collection], true, 'arrival_recorded')
    const available = buildPickupAttemptProjection([], true, 'arrival_recorded')

    expect(recorded.current_attempt_state).toBe('attempt_collection_asserted')
    expect(recorded.current_attempt_event).not.toHaveProperty('assigned_actor_id')
    expect(recorded.current_exception_state).toBe('none_recorded')
    expect(recorded.caller_can_record_attempt).toBe(false)
    expect(available.caller_can_record_attempt).toBe(true)
    expect(buildPickupAttemptProjection([], true, 'en_route_recorded').caller_can_record_attempt)
      .toBe(false)
    expect(buildPickupAttemptProjection([{
      ...collection, event_type: 'attempt_failed', reason_code: 'equipment_not_ready',
    }], false, 'arrival_recorded').current_exception_state).toBe('review_required')
    expect(() => buildPickupAttemptProjection([
      { ...collection, event_sequence: 2 as 1 },
    ], true, 'arrival_recorded')).toThrow('Malformed PickupTask attempt projection')
    expect(() => buildPickupAttemptProjection([
      collection,
    ], true, 'en_route_recorded')).toThrow('Malformed PickupTask attempt projection')
    expect(() => buildPickupAttemptProjection([{
      ...collection,
      event_type: 'attempt_failed',
      reason_code: 'invalid_reason' as 'equipment_not_ready',
    }], true, 'arrival_recorded')).toThrow('Malformed PickupTask attempt projection')
  })

  it('projects sanitized triage progress without internal notes, actors, or resolution authority', () => {
    const events: PickupExceptionTriageEventProjection[] = [
      {
        id: 'triage-1', event_sequence: 1, event_type: 'triage_claimed',
        actor_role: 'platform_operations', escalation_reason: null,
        created_at: '2026-08-19T13:00:00Z',
      },
      {
        id: 'triage-2', event_sequence: 2, event_type: 'triage_note_added',
        actor_role: 'platform_operations', escalation_reason: null,
        created_at: '2026-08-19T13:30:00Z',
      },
    ]
    expect(buildPickupExceptionPublicProjection([], 'review_required')).toEqual({
      current_exception_triage_state: 'unassigned',
      current_exception_triage_updated_at: null,
      current_exception_coordination_state: 'operations_review',
      exception_resolution_state: 'blocked',
    })
    expect(buildPickupExceptionPublicProjection(events, 'review_required')).toEqual({
      current_exception_triage_state: 'under_review',
      current_exception_triage_updated_at: '2026-08-19T13:30:00Z',
      current_exception_coordination_state: 'operations_review',
      exception_resolution_state: 'blocked',
    })
    expect(buildPickupExceptionPublicProjection([
      ...events,
      {
        id: 'triage-3', event_sequence: 3, event_type: 'triage_escalated',
        actor_role: 'platform_operations', escalation_reason: 'vendor_coordination_review',
        created_at: '2026-08-19T14:00:00Z',
      },
    ], 'review_required')).toMatchObject({
      current_exception_triage_state: 'escalated',
      current_exception_coordination_state: 'vendor_coordination_review',
      exception_resolution_state: 'blocked',
    })
    expect(() => buildPickupExceptionPublicProjection([
      { ...events[0], event_type: 'triage_note_added' },
    ], 'review_required')).toThrow('Malformed pickup exception triage projection')
    expect(() => buildPickupExceptionPublicProjection(events, 'none_recorded'))
      .toThrow('Malformed pickup exception triage projection')
  })

  it('fails closed on granular, custody, financial, or assignment fields', () => {
    for (const field of [
      'rental_line_id', 'quantity', 'serialized_unit_id', 'kit_id',
      'component_id', 'partial_return', 'custody_status', 'billable_through_at',
      'assigned_actor_id', 'hauler_organization_id',
    ]) {
      const result = validatePickupTaskAction({
        action: 'status', rfq_id: 'rfq-1', [field]: 'unauthorized',
      })
      expect(result.valid).toBe(false)
      expect(result.error).toContain(field)
    }
  })
})
