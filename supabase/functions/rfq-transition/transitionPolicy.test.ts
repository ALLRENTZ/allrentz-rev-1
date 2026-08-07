import { describe, expect, it } from 'vitest'
import {
  CUSTOMER_TRANSITIONS,
  VALID_TRANSITIONS,
  VENDOR_TRANSITIONS,
} from './transitionPolicy'

describe('RFQ transition ownership', () => {
  it('allows the canonical on-rent to off-rent-requested transition', () => {
    expect(VALID_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(true)
  })

  it('assigns the off-rent request to the customer', () => {
    expect(CUSTOMER_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(true)
    expect(VENDOR_TRANSITIONS.has('on_rent:off_rent_requested')).toBe(false)
  })

  it('retains the vendor-owned acknowledgment and return sequence', () => {
    expect(VENDOR_TRANSITIONS.has('off_rent_requested:demobilizing')).toBe(true)
    expect(VENDOR_TRANSITIONS.has('demobilizing:off_rent')).toBe(true)
  })
})
