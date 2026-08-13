import { describe, expect, it } from 'vitest'
import { projectStopAuthority, validateOffRentAction } from './offRentPolicy'

describe('off-rent action input policy', () => {
  it('accepts a complete customer request', () => {
    const result = validateOffRentAction({
      action: 'request',
      rfq_id: '00000000-0000-0000-0000-000000000001',
      requested_stop_at: '2026-08-10T14:00:00Z',
      pickup_available_from: '2026-08-10T15:00:00Z',
      pickup_available_until: '2026-08-10T18:00:00Z',
      notes: 'Gate contact has been notified.',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.action).toBe('request')
  })

  it('rejects a pickup window that starts before the requested stop', () => {
    expect(validateOffRentAction({
      action: 'request',
      rfq_id: 'rfq-1',
      requested_stop_at: '2026-08-10T15:00:00Z',
      pickup_available_from: '2026-08-10T14:00:00Z',
      pickup_available_until: '2026-08-10T18:00:00Z',
    })).toEqual({
      valid: false,
      error: 'pickup_available_from cannot be before requested_stop_at',
    })
  })

  it('accepts a complete vendor acknowledgment', () => {
    const result = validateOffRentAction({
      action: 'acknowledge',
      rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-11T14:00:00Z',
      pickup_window_end: '2026-08-11T17:00:00Z',
    })

    expect(result.valid).toBe(true)
    expect(result.input?.action).toBe('acknowledge')
  })

  it('accepts the authenticated read-only status action without mutation fields', () => {
    expect(validateOffRentAction({ action: 'status', rfq_id: 'rfq-1' })).toEqual({
      valid: true,
      input: { action: 'status', rfqId: 'rfq-1' },
    })
  })

  it('rejects a reversed vendor pickup window', () => {
    expect(validateOffRentAction({
      action: 'acknowledge',
      rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-11T17:00:00Z',
      pickup_window_end: '2026-08-11T14:00:00Z',
    })).toEqual({
      valid: false,
      error: 'pickup_window_end must be after pickup_window_start',
    })
  })

  it('rejects unsupported actions and oversized notes', () => {
    expect(validateOffRentAction({ action: 'finish', rfq_id: 'rfq-1' })).toEqual({
      valid: false,
      error: 'action must be request, acknowledge, or status',
    })
    expect(validateOffRentAction({
      action: 'acknowledge',
      rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-11T14:00:00Z',
      pickup_window_end: '2026-08-11T17:00:00Z',
      notes: 'x'.repeat(4001),
    })).toEqual({ valid: false, error: 'notes cannot exceed 4000 characters' })
  })
})

describe('stop authority projection', () => {
  it('fails closed as UNKNOWN/BLOCKED without a governed determination', () => {
    expect(projectStopAuthority({})).toMatchObject({
      contractual_status: 'UNKNOWN',
      billing_cutoff_status: 'BLOCKED',
      blocker_code: 'STOP_RULE_UNKNOWN',
      determined_at: null,
      billable_through_at: null,
    })
  })

  it('shows a recorded blocked evaluator outcome without inventing a billing cutoff', () => {
    expect(projectStopAuthority({
      attempt: {
        outcome: 'blocked',
        blocker_code: 'ACCEPTED_TERM_SNAPSHOT_MISSING',
        blocker_detail: 'Accepted terms have not been bound.',
        created_at: '2026-08-12T12:00:00Z',
      },
    })).toMatchObject({
      contractual_status: 'BLOCKED',
      billing_cutoff_status: 'BLOCKED',
      blocker_code: 'ACCEPTED_TERM_SNAPSHOT_MISSING',
      stop_effective_at: null,
    })
  })

  it('shows billing timestamps only from an immutable governed determination', () => {
    expect(projectStopAuthority({
      determination: {
        determined_at: '2026-08-12T13:00:00Z',
        stop_effective_at: '2026-08-12T12:00:00Z',
        billable_through_at: '2026-08-12T23:59:59Z',
        explanation: 'Published terms evaluated by the active evaluator.',
        determination_version: 1,
      },
    })).toEqual({
      contractual_status: 'DETERMINED',
      billing_cutoff_status: 'DETERMINED',
      blocker_code: null,
      blocker_detail: null,
      determined_at: '2026-08-12T13:00:00Z',
      stop_effective_at: '2026-08-12T12:00:00Z',
      billable_through_at: '2026-08-12T23:59:59Z',
      explanation: 'Published terms evaluated by the active evaluator.',
      determination_version: 1,
    })
  })
})
