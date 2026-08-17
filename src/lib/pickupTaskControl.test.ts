import { describe, expect, it } from 'vitest'
import {
  hasPendingPickupProposal,
  normalizePickupTaskRecord,
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
  authority_boundary: {
    object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
  },
}

describe('PickupTask control projection', () => {
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
      authority_boundary: {
        object_scope: 'rfq', pickup_controls_billing: false, custody_recorded: false,
      },
    })?.current_schedule_state).toBe('unscheduled')
  })

  it('fails closed if billing, custody, scope, or current-state evidence conflicts', () => {
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
})
