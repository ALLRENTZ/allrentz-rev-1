import { describe, expect, it } from 'vitest';
import {
  buildUsdPricingPayload,
  emptyGovernedQuoteDraft,
  formatStoredUsd,
} from './monetaryContract';

describe('USD monetary contract payload', () => {
  it('keeps decimal inputs as strings and declares every authority field', () => {
    const payload = buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      rateBasis: 'per_28_days',
      unitRate: '1250.1250',
      equipmentQuantity: '2',
      rentalPeriodQuantity: '1.5000',
      minimumBillableQuantity: '1',
      deliveryFee: '250.00',
    });

    expect(payload).toMatchObject({
      schema_version: 1,
      currency_code: 'USD',
      calculation_policy_version: 'allrentz-usd-1',
      tax_status: 'not_calculated',
      tax_exemption_claimed: false,
    });
    expect(payload.rate_terms[0]).toMatchObject({
      rate_basis: 'per_28_days',
      unit_rate: '1250.1250',
      equipment_quantity: '2',
      rental_period_quantity: '1.5000',
      period_quantity_source: 'vendor_stated',
      minimum_billable_quantity: '1',
      calculation_method: 'deterministic',
    });
  });

  it('rejects browser-float syntax and excess precision', () => {
    expect(() => buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      unitRate: '1e3',
    })).toThrow(/Unit rate/);
    expect(() => buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      unitRate: '10.00001',
    })).toThrow(/Unit rate/);
    expect(() => buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      unitRate: '10.0000',
      deliveryFee: '10.001',
    })).toThrow(/Delivery fee/);
    expect(() => buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      unitRate: '10.0000',
      rateBasis: 'per_calendar_month',
    })).toThrow(/timezone/);
  });

  it('rejects an ambiguous multiplier for a flat rental term', () => {
    expect(() => buildUsdPricingPayload({
      ...emptyGovernedQuoteDraft(),
      rateBasis: 'flat_rental_term',
      unitRate: '1000',
      rentalPeriodQuantity: '2',
    })).toThrow('Flat rental term requires a rental-period quantity of exactly 1.');
  });

  it('formats stored decimals without floating-point arithmetic', () => {
    expect(formatStoredUsd('1250.5')).toBe('1250.50 USD');
    expect(formatStoredUsd(null)).toBe('UNKNOWN');
  });
});
