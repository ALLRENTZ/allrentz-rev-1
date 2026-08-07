import { describe, expect, it } from 'vitest'
import { validateOffRentAction } from './offRentPolicy'

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
      error: 'action must be request or acknowledge',
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
