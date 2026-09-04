import { describe, expect, it } from 'vitest';
import {
  buildComplianceDocumentRegister,
  buildUnknownComplianceDocumentRegister,
} from './complianceDocumentRegister';

describe('compliance document register', () => {
  it('keeps required document presence and legal sufficiency unknown', () => {
    const register = buildComplianceDocumentRegister({
      twic_required: true,
      isnet_required: true,
      purchase_order_required: true,
      updated_at: '2026-08-26T20:00:00.000Z',
    });

    expect(register.items.every((item) => item.requirementStatus === 'REQUIRED')).toBe(true);
    expect(register.items.every((item) => item.documentStatus === 'UNKNOWN')).toBe(true);
    expect(register.documentAuthority).toBe('UNKNOWN');
    expect(register.legalSufficiency).toBe('UNKNOWN');
    expect(register.approvalAuthority).toBe('NOT AVAILABLE');
  });

  it('does not invent a document requirement when a declaration is false', () => {
    const register = buildComplianceDocumentRegister({
      twic_required: false,
      isnet_required: false,
      purchase_order_required: false,
      updated_at: null,
    });

    expect(register.items.every((item) => item.requirementStatus === 'NOT REQUIRED')).toBe(true);
    expect(register.items.every((item) => item.documentStatus === 'NOT APPLICABLE')).toBe(true);
  });

  it('fails closed when requirement declarations are missing', () => {
    const register = buildUnknownComplianceDocumentRegister();

    expect(register.items.every((item) => item.requirementStatus === 'UNKNOWN')).toBe(true);
    expect(register.items.every((item) => item.documentStatus === 'REVIEW REQUIRED')).toBe(true);
    expect(register.recordedAt).toBeNull();
  });

  it('does not accept a malformed source timestamp as evidence', () => {
    const register = buildComplianceDocumentRegister({
      twic_required: true,
      isnet_required: false,
      purchase_order_required: null,
      updated_at: 'not-a-timestamp',
    });

    expect(register.recordedAt).toBeNull();
  });
});
