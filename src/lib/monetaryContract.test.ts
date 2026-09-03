import { describe, expect, it } from 'vitest';
import {
  buildUsdPricingPayload,
  createGovernedRateTerm,
  emptyGovernedQuoteDraft,
  formatStoredUsd,
  type GovernedQuoteDraft,
} from './monetaryContract';

const validDraft = (): GovernedQuoteDraft => {
  const draft = emptyGovernedQuoteDraft();
  return {
    ...draft,
    rateTerms: [{
      ...draft.rateTerms[0],
      unitRate: '1250.1250',
      quotedLineAmount: '1250.13',
      rentalPeriodDefinition: 'Each 28-day period begins at governed dispatch.',
      vendorCalculationTerms: 'Rate times equipment count and billable 28-day periods.',
    }],
    chargeLines: draft.chargeLines.map((line) => ({ ...line, amountStatus: 'not_applicable' })),
    quotedTotalExcludingTax: '1250.13',
  };
};

describe('USD monetary contract payload', () => {
  it('preserves a multi-rate schedule and vendor-stated calculation terms as exact strings', () => {
    const draft = validDraft();
    const payload = buildUsdPricingPayload({
      ...draft,
      rateTerms: [{
        ...draft.rateTerms[0],
        rateBasis: 'per_28_days',
        rateScope: 'per_equipment_item',
        equipmentQuantity: '2',
        rentalPeriodQuantity: '1.5000',
        minimumBillableQuantity: '1',
        includedUsageQuantity: '160',
        includedUsageUnit: 'engine hours',
        overtimeMultiplier: '1.500000',
        prorationPolicy: 'not_allowed',
        quotedLineAmount: '2500.25',
      }, {
        ...createGovernedRateTerm('rate_2'),
        rateBasis: 'per_week',
        rateScope: 'entire_line',
        unitRate: '4500.0000',
        equipmentQuantity: '2',
        rentalPeriodDefinition: 'Seven consecutive 24-hour periods.',
        vendorCalculationTerms: 'One weekly amount for the complete equipment line.',
        quotedLineAmount: '4500.00',
      }],
      chargeLines: draft.chargeLines.map((line) => line.lineKey === 'delivery'
        ? { ...line, amountStatus: 'priced', amount: '250.00' }
        : line),
      quotedTotalExcludingTax: '7250.25',
    });

    expect(payload).toMatchObject({
      schema_version: 1,
      currency_code: 'USD',
      calculation_policy_version: 'allrentz-usd-1',
      tax_status: 'not_calculated',
      tax_exemption_claimed: false,
    });
    expect(payload.rate_terms).toHaveLength(2);
    expect(payload.rate_terms[0]).toMatchObject({
      rate_basis: 'per_28_days', rate_scope: 'per_equipment_item',
      unit_rate: '1250.1250', equipment_quantity: '2',
      rental_period_quantity: '1.5000', minimum_billable_quantity: '1',
      included_usage_quantity: '160', included_usage_unit: 'engine hours',
      overtime_multiplier: '1.500000', proration_policy: 'not_allowed',
      calculation_method: 'vendor_stated', line_amount: '2500.25',
    });
    expect(payload.rate_terms[1]).toMatchObject({ rate_scope: 'entire_line', unit_rate: '4500.0000' });
    expect(payload.charge_lines[0]).toMatchObject({ amount_status: 'priced', amount: '250.00' });
  });

  it('requires explicit charge disposition instead of converting blank fees to not-applicable', () => {
    expect(() => buildUsdPricingPayload(validDraft())).not.toThrow();
    const draft = validDraft();
    draft.chargeLines[0] = { ...draft.chargeLines[0], amountStatus: 'tbd' };
    expect(() => buildUsdPricingPayload(draft)).toThrow(/explicitly priced/);
  });

  it('rejects browser-float syntax, excess precision, and incomplete usage terms', () => {
    const scientific = validDraft();
    scientific.rateTerms[0].unitRate = '1e3';
    expect(() => buildUsdPricingPayload(scientific)).toThrow(/unit rate/);
    const precision = validDraft();
    precision.rateTerms[0].unitRate = '10.00001';
    expect(() => buildUsdPricingPayload(precision)).toThrow(/unit rate/);
    const usage = validDraft();
    usage.rateTerms[0].includedUsageQuantity = '10';
    expect(() => buildUsdPricingPayload(usage)).toThrow(/both a quantity and unit/);
  });

  it('rejects ambiguous flat-term multipliers and calendar months without timezone', () => {
    const flat = validDraft();
    flat.rateTerms[0] = { ...flat.rateTerms[0], rateBasis: 'flat_rental_term', rentalPeriodQuantity: '2' };
    expect(() => buildUsdPricingPayload(flat)).toThrow(/exactly 1/);
    const monthly = validDraft();
    monthly.rateTerms[0] = { ...monthly.rateTerms[0], rateBasis: 'per_calendar_month' };
    expect(() => buildUsdPricingPayload(monthly)).toThrow(/timezone/);
  });

  it('formats stored decimals without floating-point arithmetic', () => {
    expect(formatStoredUsd('1250.5')).toBe('1250.50 USD');
    expect(formatStoredUsd(null)).toBe('UNKNOWN');
  });
});
