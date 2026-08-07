import { describe, expect, it } from 'vitest';
import { VENDOR_TRANSITIONS } from '../../supabase/functions/rfq-transition/transitionPolicy';
import { getVendorLifecycleAction, getVendorLifecycleLabel } from './vendorLifecycle';

describe('vendor lifecycle actions', () => {
  it('advances the existing vendor-owned fulfillment sequence', () => {
    expect(getVendorLifecycleAction('quote_accepted')?.nextStatus).toBe('vendor_confirmed');
    expect(getVendorLifecycleAction('vendor_confirmed')?.nextStatus).toBe('mobilizing');
    expect(getVendorLifecycleAction('mobilizing')?.nextStatus).toBe('in_transit');
  });

  it('exposes only transitions authorized by the Edge Function vendor policy', () => {
    for (const currentStatus of ['quote_accepted', 'vendor_confirmed', 'mobilizing']) {
      const action = getVendorLifecycleAction(currentStatus);
      expect(action).not.toBeNull();
      expect(VENDOR_TRANSITIONS.has(`${currentStatus}:${action!.nextStatus}`)).toBe(true);
    }
  });

  it('does not let the vendor determine that an in-transit rental is on rent', () => {
    expect(getVendorLifecycleAction('in_transit')).toBeNull();
    expect(getVendorLifecycleLabel('in_transit')).toContain('awaiting field acceptance');
  });
});
