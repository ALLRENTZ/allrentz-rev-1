import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { buildSmartDraft, type SmartDraftRequest } from './smartDraftService';

const request: SmartDraftRequest = {
  equipmentType: 'Air Compressor',
  jobType: 'Turnaround',
  deliveryZipCode: '77002',
  deliveryStartDate: '2026-09-10',
  deliveryEndDate: '2026-09-15',
  durationDays: 5,
  siteRequirements: ['TWIC Required'],
  specialInstructions: 'Gate access after 06:00',
};

describe('SmartDraft invented-fact containment', () => {
  it('returns only customer-recorded request facts', () => {
    const draft = buildSmartDraft(request);

    expect(draft).toEqual({
      source: 'customer_input',
      request,
    });
    expect(draft.request).not.toBe(request);
    expect(draft.request.siteRequirements).not.toBe(request.siteRequirements);
  });

  it('does not produce vendor, pricing, delivery, availability, or workflow claims', () => {
    const draft = buildSmartDraft(request);
    const serialized = JSON.stringify(draft);

    expect(serialized).not.toMatch(/matchedVendor|estimatedDailyRate|estimatedDeliveryFee/);
    expect(serialized).not.toMatch(/responseTime|availability|sent_to_vendor|vendor_confirmed/);
  });

  it('keeps the exposed workflow disconnected from Supabase and operational status claims', () => {
    const preview = readFileSync(
      new URL('../components/SmartDraftPreview.tsx', import.meta.url),
      'utf8',
    );
    const workflow = readFileSync(
      new URL('../components/SmartDraftWorkflow.tsx', import.meta.url),
      'utf8',
    );

    expect(preview).not.toMatch(/supabase|smart_draft_quotes|sent_to_vendor|vendor_confirmed/);
    expect(preview).not.toMatch(/Matched Vendor|Estimated Pricing|Proceed to Booking/);
    expect(workflow).not.toMatch(/SmartDraftStatusTracker|status/);
    expect(preview).toContain('Request draft only — not sent');
  });
});
