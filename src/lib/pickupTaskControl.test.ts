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
  current_window: {
    pickup_window_start: '2026-08-19T14:00:00Z',
    pickup_window_end: '2026-08-19T17:00:00Z',
  },
  timeline: [{
    id: 'event-1', event_sequence: 1, event_type: 'schedule_proposed',
    actor_role: 'vendor_dispatch', pickup_window_start: '2026-08-19T14:00:00Z',
    pickup_window_end: '2026-08-19T17:00:00Z', notes: 'Gate 3',
    created_at: '2026-08-18T12:00:00Z',
  }],
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
      current_schedule_state: 'unscheduled', current_window: null, timeline: [],
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
  })

  it('labels schedule progress without implying pickup completion or billing authority', () => {
    expect(pickupScheduleLabel('schedule_confirmed')).toBe('Pickup window confirmed')
    expect(hasPendingPickupProposal('schedule_reschedule_proposed')).toBe(true)
    expect(hasPendingPickupProposal('schedule_confirmed')).toBe(false)
  })
})
