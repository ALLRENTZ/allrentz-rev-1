import { describe, expect, it } from 'vitest'
import { normalizeEvidenceReferences, validateFieldAcceptance } from './fieldAcceptancePolicy'

const validBody = {
  rfq_id: '00000000-0000-0000-0000-000000000001',
  condition_notes: 'Equipment received in serviceable condition.',
  evidence_references: ['delivery-photo-001', ' manifest-001 '],
  quantities_confirmed: true,
  accessories_confirmed: true,
  documentation_confirmed: true,
  terms_acknowledged: true,
}

describe('field acceptance input policy', () => {
  it('accepts complete evidence and all required acknowledgments', () => {
    const result = validateFieldAcceptance(validBody)

    expect(result.valid).toBe(true)
    expect(result.input?.evidenceReferences).toEqual(['delivery-photo-001', 'manifest-001'])
  })

  it('rejects acceptance without an evidence reference', () => {
    expect(validateFieldAcceptance({ ...validBody, evidence_references: [] })).toEqual({
      valid: false,
      error: 'At least one delivery evidence reference is required',
    })
  })

  it('rejects acceptance when any confirmation is missing', () => {
    expect(validateFieldAcceptance({ ...validBody, terms_acknowledged: false })).toEqual({
      valid: false,
      error: 'All field acceptance confirmations are required',
    })
  })

  it('rejects empty condition evidence', () => {
    expect(validateFieldAcceptance({ ...validBody, condition_notes: 'bad' })).toEqual({
      valid: false,
      error: 'condition_notes must contain at least 5 characters',
    })
  })

  it('rejects oversized evidence payloads', () => {
    expect(validateFieldAcceptance({
      ...validBody,
      evidence_references: Array.from({ length: 21 }, (_, index) => `photo-${index}`),
    })).toEqual({
      valid: false,
      error: 'No more than 20 evidence references are allowed',
    })
  })

  it('normalizes only non-empty string evidence references', () => {
    expect(normalizeEvidenceReferences(['  photo-1 ', '', null, 12, 'manifest-1'])).toEqual([
      'photo-1',
      'manifest-1',
    ])
  })
})
