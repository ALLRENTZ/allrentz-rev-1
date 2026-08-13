import { describe, expect, it } from 'vitest';
import { normalizeOffRentControlRecord, offRentEventLabel } from './offRentControl';

describe('off-rent control response policy', () => {
  it('fails closed when authority fields are absent or malformed', () => {
    const record = normalizeOffRentControlRecord({
      rfq_id: 'rfq-1',
      operational_status: 'demobilizing',
      authority: { contractual_status: 'DETERMINED' },
    });

    expect(record?.authority).toMatchObject({
      contractual_status: 'UNKNOWN',
      billing_cutoff_status: 'BLOCKED',
      blocker_code: 'STOP_RULE_UNKNOWN',
    });
  });

  it('accepts determined timestamps only with the complete governed projection', () => {
    const record = normalizeOffRentControlRecord({
      rfq_id: 'rfq-1',
      operational_status: 'off_rent',
      authority: {
        contractual_status: 'DETERMINED',
        billing_cutoff_status: 'DETERMINED',
        determined_at: '2026-08-12T13:00:00Z',
        stop_effective_at: '2026-08-12T12:00:00Z',
        billable_through_at: '2026-08-12T23:59:59Z',
        explanation: 'Governed determination.',
        determination_version: 1,
      },
      timeline: [],
    });

    expect(record?.authority).toMatchObject({
      contractual_status: 'DETERMINED',
      billing_cutoff_status: 'DETERMINED',
      billable_through_at: '2026-08-12T23:59:59Z',
    });
  });

  it('uses operational event labels without implying billing authority', () => {
    expect(offRentEventLabel('off_rent_acknowledged', null))
      .toBe('Vendor acknowledged pickup coordination');
    expect(offRentEventLabel('status_transition', 'demobilizing'))
      .toBe('Rental moved to demobilizing');
  });
});
