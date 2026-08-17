import { describe, expect, it } from 'vitest'
import { validatePickupTaskAction } from './pickupTaskPolicy'

describe('PickupTask action policy', () => {
  it('accepts the read-only status projection', () => {
    expect(validatePickupTaskAction({ action: 'status', rfq_id: 'rfq-1' })).toEqual({
      valid: true,
      input: { action: 'status', rfqId: 'rfq-1' },
    })
  })

  it('accepts a complete vendor proposal', () => {
    expect(validatePickupTaskAction({
      action: 'propose',
      rfq_id: 'rfq-1',
      pickup_window_start: '2026-08-18T14:00:00Z',
      pickup_window_end: '2026-08-18T17:00:00Z',
      notes: 'Gate 3',
      idempotency_key: 'proposal-1',
    })).toMatchObject({ valid: true, input: { action: 'propose' } })
  })

  it('accepts confirmation and requires a reason for rejection', () => {
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'confirm',
      idempotency_key: 'response-1',
    })).toMatchObject({ valid: true, input: { decision: 'confirm' } })
    expect(validatePickupTaskAction({
      action: 'respond', rfq_id: 'rfq-1', decision: 'reject',
      idempotency_key: 'response-2',
    })).toEqual({ valid: false, error: 'notes are required when rejecting a pickup schedule' })
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
      notes: 'x'.repeat(4001), idempotency_key: 'response-3',
    })).toEqual({ valid: false, error: 'notes cannot exceed 4000 characters' })
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
