import { describe, expect, it } from 'vitest'
import { formatDateOnly } from './dateOnly'

describe('formatDateOnly', () => {
  it('preserves the database calendar day without a local timezone shift', () => {
    expect(formatDateOnly('2026-08-28', 'en-US')).toBe('8/28/2026')
  })

  it('fails closed for null, malformed, or impossible calendar dates', () => {
    expect(formatDateOnly(null, 'en-US')).toBe('UNKNOWN')
    expect(formatDateOnly('2026/08/28', 'en-US')).toBe('UNKNOWN')
    expect(formatDateOnly('2026-02-30', 'en-US')).toBe('UNKNOWN')
  })
})
