import { describe, expect, it } from 'vitest'
import {
  buildPickupDispatchProjection,
  buildPickupScheduleProjection,
  validatePickupTaskAction,
  type PickupDispatchEventProjection,
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
