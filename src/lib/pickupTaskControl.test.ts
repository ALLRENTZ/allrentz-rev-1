import { describe, expect, it } from 'vitest'
import {
  hasPendingPickupProposal,
  normalizePickupTaskRecord,
  pickupAttemptLabel,
  pickupDispatchLabel,
  pickupScheduleLabel,
} from './pickupTaskControl'

const completeRecord = {
  rfq_id: 'rfq-1',
  operational_status: 'demobilizing',
  pickup_task: { id: 'task-1', object_scope: 'rfq', created_at: '2026-08-18T12:00:00Z' },
  current_schedule_state: 'schedule_proposed',
  current_schedule_event: {
    id: 'event-1', event_sequence: 1, event_type: 'schedule_proposed',
    actor_role: 'vendor_scheduler', pickup_window_start: '2026-08-19T14:00:00Z',
    pickup_window_end: '2026-08-19T17:00:00Z', reason_code: null, notes: 'Gate 3',
    created_at: '2026-08-18T12:00:00Z',
  },
  confirmed_window: null,
  pending_window: {
    pickup_window_start: '2026-08-19T14:00:00Z',
    pickup_window_end: '2026-08-19T17:00:00Z',
  },
  timeline: [{
    id: 'event-1', event_sequence: 1, event_type: 'schedule_proposed',
    actor_role: 'vendor_scheduler', pickup_window_start: '2026-08-19T14:00:00Z',
    pickup_window_end: '2026-08-19T17:00:00Z', reason_code: null, notes: 'Gate 3',
    created_at: '2026-08-18T12:00:00Z',
  }],
  timeline_page: { has_more: false, next_before_sequence: null },
  current_dispatch_state: 'not_dispatched',
  current_dispatch_event: null,
  dispatch_timeline: [],
  caller_is_assigned_field_actor: false,
  current_attempt_state: 'not_recorded',
  current_attempt_event: null,
  current_exception_state: 'none_recorded',
  current_exception_triage_state: 'not_applicable',
  current_exception_triage_updated_at: null,
  current_exception_coordination_state: 'not_applicable',
  exception_resolution_state: 'blocked',
  current_access_instructions: null,
  access_instruction_timeline: [],
  current_customer_exception_state: 'none_recorded',
  current_customer_exception_report: null,
  customer_exception_report_timeline: [],
  caller_can_record_attempt: false,
  authority_boundary: {
    object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
  },
}

describe('PickupTask control projection', () => {
  it('accepts sanitized customer access instructions and fails closed on malformed evidence', () => {
    const accessEvent = {
      id: 'access-1', event_sequence: 1, event_type: 'access_instructions_added',
      actor_role: 'customer', instruction_type: 'site_access',
      instructions: 'Use gate 3.', created_at: '2026-08-21T12:00:00Z',
    }
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_access_instructions: accessEvent,
      access_instruction_timeline: [accessEvent],
    })?.current_access_instructions).toMatchObject({ instruction_type: 'site_access' })
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_access_instructions: { ...accessEvent, actor_role: 'vendor_scheduler' },
      access_instruction_timeline: [{ ...accessEvent, actor_role: 'vendor_scheduler' }],
    })).toBeNull()
  })

  it('accepts a complete RFQ-wide non-financial projection', () => {
    expect(normalizePickupTaskRecord(completeRecord)).toMatchObject({
      pickup_task: { object_scope: 'rfq' },
      current_schedule_state: 'schedule_proposed',
      authority_boundary: { pickup_controls_billing: false, custody_recorded: false },
    })
  })

  it('accepts a strict empty unscheduled projection', () => {
    expect(normalizePickupTaskRecord({
      rfq_id: 'rfq-1', operational_status: 'demobilizing', pickup_task: null,
      current_schedule_state: 'unscheduled', current_schedule_event: null,
      confirmed_window: null, pending_window: null, timeline: [],
      timeline_page: { has_more: false, next_before_sequence: null },
      current_dispatch_state: 'not_dispatched', current_dispatch_event: null,
      dispatch_timeline: [], caller_is_assigned_field_actor: false,
      current_attempt_state: 'not_recorded', current_attempt_event: null,
      current_exception_state: 'none_recorded', caller_can_record_attempt: false,
      current_exception_triage_state: 'not_applicable',
      current_exception_triage_updated_at: null,
      current_exception_coordination_state: 'not_applicable',
      exception_resolution_state: 'blocked',
      current_access_instructions: null, access_instruction_timeline: [],
      current_customer_exception_state: 'none_recorded',
      current_customer_exception_report: null,
      customer_exception_report_timeline: [],
      authority_boundary: {
        object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
      },
    })?.current_schedule_state).toBe('unscheduled')
  })

  it('accepts strict customer exception evidence and keeps resolution blocked', () => {
    const report = {
      id: 'customer-exception-1', event_sequence: 1,
      event_type: 'customer_exception_reported', actor_role: 'customer',
      description: 'Gate access is unavailable.', created_at: '2026-08-26T12:00:00Z',
    }
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_customer_exception_state: 'review_required',
      current_customer_exception_report: report,
      customer_exception_report_timeline: [report],
    })).toMatchObject({
      current_customer_exception_state: 'review_required',
      exception_resolution_state: 'blocked',
    })
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_customer_exception_state: 'none_recorded',
      current_customer_exception_report: report,
      customer_exception_report_timeline: [report],
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_customer_exception_state: 'review_required',
      current_customer_exception_report: { ...report, actor_role: 'vendor_scheduler' },
      customer_exception_report_timeline: [{ ...report, actor_role: 'vendor_scheduler' }],
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_customer_exception_state: 'review_required',
      current_customer_exception_report: { ...report, event_sequence: 2 },
      customer_exception_report_timeline: [{ ...report, event_sequence: 2 }],
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_customer_exception_state: 'review_required',
      current_customer_exception_report: { ...report, created_at: 'not-a-date' },
      customer_exception_report_timeline: [{ ...report, created_at: 'not-a-date' }],
    })).toBeNull()
  })

  it('fails closed if billing, custody, scope, or current-state evidence conflicts', () => {
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_exception_coordination_state: 'resolved',
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      authority_boundary: { ...completeRecord.authority_boundary, pickup_controls_billing: true },
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      pickup_task: { ...completeRecord.pickup_task, object_scope: 'line' },
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_schedule_state: 'schedule_confirmed',
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_schedule_event: {
        ...completeRecord.current_schedule_event,
        actor_role: 'customer',
      },
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_schedule_state: 'schedule_reschedule_proposed',
      current_schedule_event: {
        ...completeRecord.current_schedule_event,
        event_type: 'schedule_reschedule_proposed',
        reason_code: null,
      },
    })).toBeNull()
  })

  it('keeps a confirmed window while a replacement window awaits approval', () => {
    const record = normalizePickupTaskRecord({
      ...completeRecord,
      current_schedule_state: 'schedule_reschedule_proposed',
      current_schedule_event: {
        ...completeRecord.current_schedule_event,
        id: 'event-3', event_sequence: 3,
        event_type: 'schedule_reschedule_proposed',
        pickup_window_start: '2026-08-20T18:00:00Z',
        pickup_window_end: '2026-08-20T20:00:00Z',
        reason_code: 'vendor_capacity',
      },
      confirmed_window: {
        pickup_window_start: '2026-08-19T14:00:00Z',
        pickup_window_end: '2026-08-19T17:00:00Z',
      },
      pending_window: {
        pickup_window_start: '2026-08-20T18:00:00Z',
        pickup_window_end: '2026-08-20T20:00:00Z',
      },
    })

    expect(record?.confirmed_window?.pickup_window_start).toBe('2026-08-19T14:00:00Z')
    expect(record?.pending_window?.pickup_window_start).toBe('2026-08-20T18:00:00Z')
  })

  it('labels schedule progress without implying pickup completion or billing authority', () => {
    expect(pickupScheduleLabel('schedule_confirmed')).toBe('Pickup window confirmed')
    expect(hasPendingPickupProposal('schedule_reschedule_proposed')).toBe(true)
    expect(hasPendingPickupProposal('schedule_confirmed')).toBe(false)
  })

  it('accepts a strict customer-visible dispatch timeline without exposing actor identity', () => {
    const dispatchTimeline = [
      {
        id: 'dispatch-1', event_sequence: 1, event_type: 'field_actor_assigned',
        actor_role: 'vendor_dispatcher', notes: 'Assigned for confirmed window',
        created_at: '2026-08-18T13:00:00Z',
      },
      {
        id: 'dispatch-2', event_sequence: 2, event_type: 'en_route_recorded',
        actor_role: 'assigned_field_actor', notes: 'Departed vendor yard',
        created_at: '2026-08-19T13:00:00Z',
      },
    ]
    const record = normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'en_route_recorded',
      current_dispatch_event: dispatchTimeline[1],
      dispatch_timeline: dispatchTimeline,
      caller_is_assigned_field_actor: true,
    })

    expect(record?.current_dispatch_state).toBe('en_route_recorded')
    expect(record?.dispatch_timeline).toHaveLength(2)
    expect(pickupDispatchLabel('arrival_recorded')).toBe('Arrived at site (reported)')
  })

  it('fails closed on dispatch sequence, role, current-state, or hidden identity evidence', () => {
    const assigned = {
      id: 'dispatch-1', event_sequence: 1, event_type: 'field_actor_assigned',
      actor_role: 'vendor_dispatcher', notes: null, created_at: '2026-08-18T13:00:00Z',
    }
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'field_actor_assigned',
      current_dispatch_event: assigned,
      dispatch_timeline: [{ ...assigned, event_sequence: 2 }],
      caller_is_assigned_field_actor: false,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'field_actor_assigned',
      current_dispatch_event: { ...assigned, actor_role: 'assigned_field_actor' },
      dispatch_timeline: [{ ...assigned, actor_role: 'assigned_field_actor' }],
      caller_is_assigned_field_actor: false,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'arrival_recorded',
      current_dispatch_event: {
        ...assigned, id: 'dispatch-2', event_sequence: 2,
        event_type: 'arrival_recorded', actor_role: 'assigned_field_actor',
      },
      dispatch_timeline: [
        assigned,
        {
          ...assigned, id: 'dispatch-2', event_sequence: 2,
          event_type: 'arrival_recorded', actor_role: 'assigned_field_actor',
        },
      ],
      caller_is_assigned_field_actor: false,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'field_actor_assigned',
      current_dispatch_event: { ...assigned, assigned_actor_id: 'hidden' },
      dispatch_timeline: [{ ...assigned, assigned_actor_id: 'hidden' }],
      caller_is_assigned_field_actor: false,
    })).toBeNull()
  })

  it('accepts a sanitized collection assertion without inferring custody or billing', () => {
    const arrival = [
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
    const attempt = {
      id: 'attempt-1', event_sequence: 1, event_type: 'attempt_collection_asserted',
      actor_role: 'assigned_field_actor', reason_code: null, notes: 'Loaded by driver',
      created_at: '2026-08-18T15:30:00Z',
    }
    const record = normalizePickupTaskRecord({
      ...completeRecord,
      current_dispatch_state: 'arrival_recorded',
      current_dispatch_event: arrival[2],
      dispatch_timeline: arrival,
      caller_is_assigned_field_actor: true,
      current_attempt_state: 'attempt_collection_asserted',
      current_attempt_event: attempt,
      current_exception_state: 'none_recorded',
      caller_can_record_attempt: false,
    })

    expect(record?.current_attempt_state).toBe('attempt_collection_asserted')
    expect(record?.authority_boundary).toEqual({
      object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
    })
    expect(pickupAttemptLabel('attempt_collection_asserted')).toContain('asserted')
  })

  it('requires REVIEW REQUIRED for a structured failed attempt and fails closed on malformed evidence', () => {
    const failedAttempt = {
      id: 'attempt-1', event_sequence: 1, event_type: 'attempt_failed',
      actor_role: 'assigned_field_actor', reason_code: 'equipment_not_ready',
      notes: 'Customer still using equipment', created_at: '2026-08-18T15:30:00Z',
    }
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_attempt_state: 'attempt_failed',
      current_attempt_event: failedAttempt,
      current_exception_state: 'none_recorded',
      caller_can_record_attempt: false,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_attempt_state: 'attempt_failed',
      current_attempt_event: { ...failedAttempt, reason_code: null },
      current_exception_state: 'review_required',
      caller_can_record_attempt: false,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_attempt_state: 'not_recorded',
      current_attempt_event: null,
      current_exception_state: 'none_recorded',
      caller_can_record_attempt: true,
    })).toBeNull()
    expect(normalizePickupTaskRecord({
      ...completeRecord,
      current_attempt_state: 'attempt_failed',
      current_attempt_event: failedAttempt,
      current_exception_state: 'review_required',
      caller_can_record_attempt: false,
    })).toBeNull()
  })
})
