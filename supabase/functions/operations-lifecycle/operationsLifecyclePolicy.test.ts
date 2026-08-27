import { describe, expect, it } from 'vitest'
import {
  hasOperationsLifecycleRole,
  isAppRfqStatus,
  lifecycleRowsAreConsistent,
  validateOperationsLifecycleAction,
} from './operationsLifecyclePolicy'

describe('operations lifecycle policy', () => {
  it('accepts only the bounded read-only list action', () => {
    expect(validateOperationsLifecycleAction({ action: 'list' })).toEqual({
      valid: true,
      input: { action: 'list' },
    })
    expect(validateOperationsLifecycleAction({ action: 'list', rfq_id: 'hidden-scope' }).valid).toBe(false)
    expect(validateOperationsLifecycleAction({ action: 'resolve' }).valid).toBe(false)
    expect(validateOperationsLifecycleAction(null).valid).toBe(false)
  })

  it('permits only verified platform operations roles', () => {
    expect(hasOperationsLifecycleRole([{ role: 'admin' }])).toBe(true)
    expect(hasOperationsLifecycleRole([{ role: 'manager' }])).toBe(true)
    expect(hasOperationsLifecycleRole([{ role: 'customer' }, { role: 'vendor' }])).toBe(false)
    expect(hasOperationsLifecycleRole(undefined)).toBe(false)
  })

  it('recognizes only canonical RFQ lifecycle statuses', () => {
    expect(isAppRfqStatus('off_rent_requested')).toBe(true)
    expect(isAppRfqStatus('picked_up')).toBe(false)
    expect(isAppRfqStatus('billing_stopped')).toBe(false)
  })

  it('fails closed when status history contradicts the current state', () => {
    expect(lifecycleRowsAreConsistent({
      currentStatus: 'on_rent',
      events: [{ previous_status: 'in_transit', new_status: 'on_rent' }],
    })).toBe(true)
    expect(lifecycleRowsAreConsistent({
      currentStatus: 'off_rent',
      events: [
        { previous_status: 'on_rent', new_status: 'off_rent_requested' },
        { previous_status: 'demobilizing', new_status: 'off_rent' },
      ],
    })).toBe(false)
    expect(lifecycleRowsAreConsistent({
      currentStatus: 'billing_stopped',
      events: [],
    })).toBe(false)
  })
})
