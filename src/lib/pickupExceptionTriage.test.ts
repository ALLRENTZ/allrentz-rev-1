import { describe, expect, it, vi } from 'vitest'

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))
import { normalizePickupExceptionTriageQueue } from './pickupExceptionTriage'

function queue(overrides: Record<string, unknown> = {}): {
  items: Array<Record<string, unknown>>
  customer_reports: Array<Record<string, unknown>>
  authority_boundary: Record<string, unknown>
} & Record<string, unknown> {
  return {
    items: [{
      rfq_id: 'rfq-1',
      pickup_task_id: 'task-1',
      attempt_event_id: 'attempt-1',
      attempt_reason_code: 'equipment_not_ready',
      attempt_notes: 'Still in use',
      attempt_created_at: '2026-08-19T12:00:00Z',
      triage_state: 'unassigned',
      assigned_to_caller: false,
      escalation_reason: null,
      latest_triage_at: null,
      note_count: 0,
      internal_timeline: [],
      resolution_state: 'blocked',
    }],
    customer_reports: [],
    authority_boundary: {
      object_scope: 'rfq',
      non_authoritative_triage: true,
      resolution_state: 'blocked',
      pickup_controls_billing: false,
      custody_recorded: false,
    },
    ...overrides,
  }
}

describe('pickup exception triage projection', () => {
  it('accepts a strict blocked RFQ-wide queue', () => {
    expect(normalizePickupExceptionTriageQueue(queue())?.items[0]).toMatchObject({
      triage_state: 'unassigned',
      resolution_state: 'blocked',
      note_count: 0,
    })
  })

  it('accepts an immutable internal triage timeline', () => {
    const value = queue()
    value.items[0].triage_state = 'escalated'
    value.items[0].assigned_to_caller = true
    value.items[0].note_count = 0
    value.items[0].escalation_reason = 'operations_review'
    value.items[0].latest_triage_at = '2026-08-19T14:00:00Z'
    value.items[0].internal_timeline = [{
      id: 'triage-1',
      event_sequence: 1,
      event_type: 'triage_claimed',
      escalation_reason: null,
      notes: null,
      created_at: '2026-08-19T13:00:00Z',
      performed_by_caller: true,
    }, {
      id: 'triage-2',
      event_sequence: 2,
      event_type: 'triage_escalated',
      escalation_reason: 'operations_review',
      notes: 'Operations review required',
      created_at: '2026-08-19T14:00:00Z',
      performed_by_caller: true,
    }]
    expect(normalizePickupExceptionTriageQueue(value)?.items[0].internal_timeline).toHaveLength(2)
  })

  it('accepts strict customer reports as read-only review-required evidence', () => {
    const value = queue({
      customer_reports: [{
        rfq_id: 'rfq-1', pickup_task_id: 'task-1',
        report_event_id: 'report-1', description: 'Gate access is unavailable.',
        reported_at: '2026-08-26T12:00:00Z', review_state: 'review_required',
        resolution_state: 'blocked',
      }],
    })
    expect(normalizePickupExceptionTriageQueue(value)?.customer_reports[0]).toEqual({
      rfq_id: 'rfq-1', pickup_task_id: 'task-1',
      report_event_id: 'report-1', description: 'Gate access is unavailable.',
      reported_at: '2026-08-26T12:00:00Z', review_state: 'review_required',
      resolution_state: 'blocked',
    })
  })

  it('fails closed when authority or resolution state is malformed', () => {
    expect(normalizePickupExceptionTriageQueue(queue({
      authority_boundary: { object_scope: 'rfq', resolution_state: 'resolved' },
    }))).toBeNull()
    const value = queue()
    value.items[0].resolution_state = 'resolved'
    expect(normalizePickupExceptionTriageQueue(value)).toBeNull()
    const invalidEscalation = queue()
    invalidEscalation.items[0].triage_state = 'escalated'
    invalidEscalation.items[0].escalation_reason = 'billing_adjustment'
    expect(normalizePickupExceptionTriageQueue(invalidEscalation)).toBeNull()

    const invalidSequence = queue()
    invalidSequence.items[0].triage_state = 'claimed'
    invalidSequence.items[0].assigned_to_caller = true
    invalidSequence.items[0].latest_triage_at = '2026-08-19T13:00:00Z'
    invalidSequence.items[0].internal_timeline = [{
      id: 'triage-2', event_sequence: 2, event_type: 'triage_note_added',
      escalation_reason: null, notes: 'Missing claim',
      created_at: '2026-08-19T13:00:00Z', performed_by_caller: true,
    }]
    expect(normalizePickupExceptionTriageQueue(invalidSequence)).toBeNull()

    expect(normalizePickupExceptionTriageQueue(queue({
      customer_reports: [{
        rfq_id: 'rfq-1', pickup_task_id: 'task-1', report_event_id: 'report-1',
        description: 'Gate locked', reported_at: '2026-08-26T12:00:00Z',
        review_state: 'resolved', resolution_state: 'blocked',
      }],
    }))).toBeNull()
    expect(normalizePickupExceptionTriageQueue(queue({
      customer_reports: [{
        rfq_id: 'rfq-1', pickup_task_id: 'task-1', report_event_id: 'report-1',
        description: 'Gate locked', reported_at: 'not-a-date',
        review_state: 'review_required', resolution_state: 'blocked',
      }],
    }))).toBeNull()
    expect(normalizePickupExceptionTriageQueue(queue({
      customer_reports: [{
        rfq_id: 'rfq-1', pickup_task_id: 'task-1', report_event_id: 'report-1',
        description: 'Gate locked', reported_at: '2026-08-26T12:00:00Z',
        review_state: 'review_required', resolution_state: 'blocked',
        billing_authority: true,
      }],
    }))).toBeNull()
  })
})
