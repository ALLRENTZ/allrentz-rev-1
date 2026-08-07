import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_TRANSITIONS,
  isTransitionReasonValid,
  VALID_TRANSITIONS,
  VENDOR_TRANSITIONS,
} from './transitionPolicy'

describe('RFQ transition ownership', () => {
  it('allows the canonical on-rent to off-rent-requested transition', () => {
    expect(VALID_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(true)
  })

  it('reserves the off-rent request for the governed evidence operation', () => {
    expect(CUSTOMER_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(false)
  })

  it('reserves vendor acknowledgment for the governed evidence operation', () => {
    expect(CUSTOMER_TRANSITIONS.has('off_rent_requested:demobilizing')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('off_rent_requested:demobilizing')).toBe(false)
  })

  it('does not let a vendor determine the contractual stop-rent timestamp', () => {
    expect(VALID_TRANSITIONS.has('demobilizing:off_rent')).toBe(true)
    expect(CUSTOMER_TRANSITIONS.has('demobilizing:off_rent')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('demobilizing:off_rent')).toBe(false)
  })

  it('does not let a customer or vendor determine the system-owned on-rent state', () => {
    expect(VALID_TRANSITIONS.has('in_transit:on_rent')).toBe(true)
    expect(CUSTOMER_TRANSITIONS.has('in_transit:on_rent')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('in_transit:on_rent')).toBe(false)
  })

  it('does not let a vendor unilaterally complete rental closeout', () => {
    expect(VALID_TRANSITIONS.has('off_rent:completed')).toBe(true)
    expect(CUSTOMER_TRANSITIONS.has('off_rent:completed')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('off_rent:completed')).toBe(false)
  })

  it('does not let a vendor unilaterally cancel after order confirmation', () => {
    for (const transition of ['vendor_confirmed:cancelled', 'mobilizing:cancelled']) {
      expect(VALID_TRANSITIONS.has(transition)).toBe(true)
      expect(CUSTOMER_TRANSITIONS.has(transition)).toBe(false)
      expect(VENDOR_TRANSITIONS.has(transition)).toBe(false)
    }
  })

  it('requires recorded reasons for cancellation and rejection decisions', () => {
    expect(isTransitionReasonValid('cancelled', null)).toBe(false)
    expect(isTransitionReasonValid('cancelled', '   ')).toBe(false)
    expect(isTransitionReasonValid('rejected', 'Commercial terms not accepted')).toBe(true)
    expect(isTransitionReasonValid('on_rent', null)).toBe(true)
  })

  it('assigns pending-review RFQ cancellation to the customer', () => {
    expect(CUSTOMER_TRANSITIONS.has('pending_vendor_review:cancelled')).toBe(true)
    expect(VENDOR_TRANSITIONS.has('pending_vendor_review:cancelled')).toBe(false)
  })

  it('does not treat accepted-order termination as an ordinary customer decision', () => {
    for (const transition of ['quote_accepted:cancelled', 'quote_accepted:rejected']) {
      expect(VALID_TRANSITIONS.has(transition)).toBe(true)
      expect(CUSTOMER_TRANSITIONS.has(transition)).toBe(false)
      expect(VENDOR_TRANSITIONS.has(transition)).toBe(false)
    }
  })

  it('reserves vendor-review routing for platform matching or operations', () => {
    expect(VALID_TRANSITIONS.has('submitted:pending_vendor_review')).toBe(true)
    expect(CUSTOMER_TRANSITIONS.has('submitted:pending_vendor_review')).toBe(false)
    expect(VENDOR_TRANSITIONS.has('submitted:pending_vendor_review')).toBe(false)
  })
})
