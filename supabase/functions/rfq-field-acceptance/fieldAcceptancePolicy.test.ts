import { describe, expect, it } from 'vitest'
import {
  buildFieldAcceptanceStatusProjection,
  hasFieldAcceptanceProjectionAccess,
  normalizeEvidenceReferences,
  validateFieldAcceptance,
  validateFieldAcceptanceStatus,
} from './fieldAcceptancePolicy'

const validBody = {
  rfq_id: '00000000-0000-4000-8000-000000000001',
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

  it('accepts only a bounded status request', () => {
    expect(validateFieldAcceptanceStatus({
      action: 'status',
      rfq_id: validBody.rfq_id,
    })).toEqual({
      valid: true,
      input: { action: 'status', rfqId: validBody.rfq_id },
    })
    expect(validateFieldAcceptanceStatus({
      action: 'status',
      rfq_id: validBody.rfq_id,
      include_private_evidence: true,
    }).valid).toBe(false)
    expect(validateFieldAcceptanceStatus({ action: 'resolve', rfq_id: validBody.rfq_id }).valid).toBe(false)
  })

  it('authorizes only matching-simulation operations, customer, or accepted-vendor actors', () => {
    const base = {
      actorId: '00000000-0000-4000-8000-000000000010',
      actorIsDemo: false,
      rfq: {
        customerId: '00000000-0000-4000-8000-000000000011',
        customerOrganizationId: '00000000-0000-4000-8000-000000000012',
        isSimulated: false,
      },
      operationsRoles: [],
      memberships: [],
      acceptedVendorOrganizationIds: [],
    }
    expect(hasFieldAcceptanceProjectionAccess({ ...base, operationsRoles: [{ role: 'manager' }] })).toBe(true)
    expect(hasFieldAcceptanceProjectionAccess({ ...base, actorId: base.rfq.customerId })).toBe(true)
    expect(hasFieldAcceptanceProjectionAccess({
      ...base,
      memberships: [{ organization_id: base.rfq.customerOrganizationId, role: 'member' }],
    })).toBe(true)
    expect(hasFieldAcceptanceProjectionAccess({
      ...base,
      memberships: [{ organization_id: 'vendor-org', role: 'admin' }],
      acceptedVendorOrganizationIds: ['vendor-org'],
    })).toBe(true)
    expect(hasFieldAcceptanceProjectionAccess({
      ...base,
      actorIsDemo: true,
      operationsRoles: [{ role: 'admin' }],
    })).toBe(false)
    expect(hasFieldAcceptanceProjectionAccess({
      ...base,
      memberships: [{ organization_id: 'invited-but-not-accepted', role: 'owner' }],
      acceptedVendorOrganizationIds: ['accepted-vendor'],
    })).toBe(false)
  })

  it('projects only a canonical system-owned field acceptance record', () => {
    expect(buildFieldAcceptanceStatusProjection({
      currentStatus: 'on_rent',
      onRentAt: '2026-08-27T03:00:00.000Z',
      timelineRows: [{
        previous_status: 'in_transit',
        new_status: 'on_rent',
        transitioned_by: null,
        actor_role: 'system',
        created_at: '2026-08-27T03:00:00.250Z',
      }],
    })).toMatchObject({
      field_acceptance_state: 'RECORDED',
      delivery_evidence_state: 'RECORDED_NOT_EXPOSED',
      on_rent_determination: 'SYSTEM_RECORDED',
      accepted_at: '2026-08-27T03:00:00.000Z',
      next_step: 'MONITOR_RENTAL',
    })
  })

  it('shows awaiting acceptance in transit and fails closed on contradictory history', () => {
    expect(buildFieldAcceptanceStatusProjection({
      currentStatus: 'in_transit',
      onRentAt: null,
      timelineRows: [],
    })).toMatchObject({
      field_acceptance_state: 'AWAITING_CUSTOMER',
      delivery_evidence_state: 'UNKNOWN',
      on_rent_determination: 'NOT_RECORDED',
      next_step: 'CUSTOMER_FIELD_ACCEPTANCE',
    })
    expect(buildFieldAcceptanceStatusProjection({
      currentStatus: 'on_rent',
      onRentAt: '2026-08-27T03:00:00.000Z',
      timelineRows: [{
        previous_status: 'in_transit',
        new_status: 'on_rent',
        transitioned_by: 'customer-id',
        actor_role: 'customer',
        created_at: '2026-08-27T03:00:00.000Z',
      }],
    })).toMatchObject({
      field_acceptance_state: 'REVIEW_REQUIRED',
      on_rent_determination: 'REVIEW_REQUIRED',
      accepted_at: null,
      next_step: 'OPERATIONS_REVIEW',
    })
  })
})
