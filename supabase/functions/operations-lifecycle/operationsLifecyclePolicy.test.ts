import { describe, expect, it } from 'vitest'
import {
  buildPreDispatchReadinessProjection,
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

  it('builds a blocked read-only pre-dispatch packet from recorded facts', () => {
    expect(buildPreDispatchReadinessProjection({
      currentStatus: 'vendor_confirmed',
      acceptedQuotes: [{ status: 'accepted', accepted_at: '2026-08-27T02:00:00.000Z' }],
      customerRequirements: {
        twic_required: true,
        isnet_required: false,
        purchase_order_required: null,
      },
      purchaseOrderRows: [{
        external_reference: 'PO-1042',
        customer_stated_issue_date: '2026-08-27',
      }],
    })).toEqual({
      authority: 'READ_ONLY_PRE_DISPATCH_PROJECTION',
      scope: 'RFQ_WIDE',
      packet_state: 'REVIEW_REQUIRED',
      release_readiness: 'BLOCKED',
      release_authority: 'NOT_IMPLEMENTED',
      accepted_quote_state: 'RECORDED',
      vendor_confirmation_state: 'RECORDED',
      requirements: [
        { key: 'twic', requirement_status: 'REQUIRED', evidence_status: 'UNKNOWN' },
        { key: 'isnet', requirement_status: 'NOT_REQUIRED', evidence_status: 'NOT_APPLICABLE' },
        { key: 'purchase_order', requirement_status: 'UNKNOWN', evidence_status: 'RECORDED' },
      ],
    })
  })

  it('fails closed when accepted-quote or requirement evidence is unavailable', () => {
    const projection = buildPreDispatchReadinessProjection({
      currentStatus: 'quote_accepted',
      acceptedQuotes: [],
      customerRequirements: null,
      purchaseOrderRows: [],
    })
    expect(projection?.accepted_quote_state).toBe('UNKNOWN')
    expect(projection?.vendor_confirmation_state).toBe('REVIEW_REQUIRED')
    expect(projection?.release_readiness).toBe('BLOCKED')
    expect(projection?.requirements.every((item) => item.requirement_status === 'UNKNOWN')).toBe(true)
    expect(buildPreDispatchReadinessProjection({
      currentStatus: 'on_rent',
      acceptedQuotes: [],
      customerRequirements: null,
      purchaseOrderRows: [],
    })).toBeNull()
  })

  it('does not treat duplicate or malformed accepted quotes as release evidence', () => {
    for (const acceptedQuotes of [
      [
        { status: 'accepted', accepted_at: '2026-08-27T02:00:00.000Z' },
        { status: 'accepted', accepted_at: '2026-08-27T02:01:00.000Z' },
      ],
      [{ status: 'accepted', accepted_at: 'not-a-date' }],
      [{ status: 'submitted', accepted_at: null }],
    ]) {
      const projection = buildPreDispatchReadinessProjection({
        currentStatus: 'mobilizing',
        acceptedQuotes,
        customerRequirements: null,
        purchaseOrderRows: [],
      })
      expect(projection?.accepted_quote_state).toBe('UNKNOWN')
      expect(projection?.release_authority).toBe('NOT_IMPLEMENTED')
    }
  })
})
