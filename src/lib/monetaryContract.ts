export const MONETARY_CONTRACT_VERSION = 'usd-v1' as const;
export const CALCULATION_POLICY_VERSION = 'allrentz-usd-1' as const;
export const SUPPORTED_CURRENCY = 'USD' as const;

export const RATE_BASES = [
  'per_hour', 'per_shift', 'per_day', 'per_week', 'per_28_days',
  'per_calendar_month', 'flat_rental_term',
] as const;

export const CHARGE_TYPES = [
  'delivery', 'pickup', 'freight', 'mobilization', 'demobilization',
  'transportation_surcharge', 'environmental', 'fuel', 'rental_protection',
  'setup_teardown', 'labor_technician', 'cleaning', 'consumables',
  'discount', 'tax', 'other',
] as const;

export const CHARGE_STATUSES = [
  'priced', 'included', 'excluded', 'tbd', 'contingent', 'not_applicable',
] as const;

export type RateBasis = (typeof RATE_BASES)[number];
export type ChargeType = (typeof CHARGE_TYPES)[number];
export type ChargeStatus = (typeof CHARGE_STATUSES)[number];
export type RateScope = 'per_equipment_item' | 'entire_line';
export type ProrationPolicy = 'allowed' | 'not_allowed' | 'unknown';

export type GovernedRateTermDraft = {
  lineKey: string;
  rateBasis: RateBasis;
  rateScope: RateScope;
  unitRate: string;
  equipmentQuantity: string;
  rentalPeriodQuantity: string;
  minimumBillableQuantity: string;
  calendarTimezone: string;
  includedUsageQuantity: string;
  includedUsageUnit: string;
  overtimeRate: string;
  overtimeMultiplier: string;
  prorationPolicy: ProrationPolicy;
  rentalPeriodDefinition: string;
  vendorCalculationTerms: string;
};

export type GovernedChargeLineDraft = {
  lineKey: string;
  chargeType: ChargeType;
  description: string;
  amountStatus: ChargeStatus;
  amount: string;
  includedInLineKey: string;
  contingentTrigger: string;
};

export type GovernedQuoteDraft = {
  rateTerms: GovernedRateTermDraft[];
  chargeLines: GovernedChargeLineDraft[];
  vendorNotes: string;
  complianceConfirmed: boolean;
};

export const createGovernedRateTerm = (lineKey = 'rate_1'): GovernedRateTermDraft => ({
  lineKey,
  rateBasis: 'per_day',
  rateScope: 'per_equipment_item',
  unitRate: '',
  equipmentQuantity: '1',
  rentalPeriodQuantity: '1',
  minimumBillableQuantity: '',
  calendarTimezone: '',
  includedUsageQuantity: '',
  includedUsageUnit: '',
  overtimeRate: '',
  overtimeMultiplier: '',
  prorationPolicy: 'unknown',
  rentalPeriodDefinition: '',
  vendorCalculationTerms: '',
});

export const createGovernedChargeLine = (
  lineKey = 'delivery',
  chargeType: ChargeType = 'delivery',
  description = 'Delivery',
): GovernedChargeLineDraft => ({
  lineKey,
  chargeType,
  description,
  amountStatus: 'tbd',
  amount: '',
  includedInLineKey: '',
  contingentTrigger: '',
});

export const emptyGovernedQuoteDraft = (): GovernedQuoteDraft => ({
  rateTerms: [createGovernedRateTerm()],
  chargeLines: [
    createGovernedChargeLine('delivery', 'delivery', 'Delivery'),
    createGovernedChargeLine('pickup', 'pickup', 'Pickup'),
    createGovernedChargeLine('mobilization', 'mobilization', 'Mobilization'),
    createGovernedChargeLine('demobilization', 'demobilization', 'Demobilization'),
  ],
  vendorNotes: '',
  complianceConfirmed: false,
});

const decimalPattern = (scale: number) => new RegExp(`^[0-9]+(?:\\.[0-9]{1,${scale}})?$`);
const lineKeyPattern = /^[a-z0-9][a-z0-9_-]{0,63}$/;

const requirePositiveDecimal = (value: string, scale: number, label: string) => {
  if (!decimalPattern(scale).test(value) || /^0+(?:\.0+)?$/.test(value)) {
    throw new Error(`${label} must be a positive decimal with at most ${scale} decimal places.`);
  }
};

const optionalPositiveDecimal = (value: string, scale: number, label: string) => {
  if (value !== '') requirePositiveDecimal(value, scale, label);
};

const requireNonNegativeDecimal = (value: string, scale: number, label: string) => {
  if (!decimalPattern(scale).test(value)) {
    throw new Error(`${label} must be a non-negative decimal with at most ${scale} decimal places.`);
  }
};

const requireText = (value: string, label: string, max = 500) => {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) {
    throw new Error(`${label} is required and must be ${max} characters or fewer.`);
  }
  return normalized;
};

const assertUniqueLineKeys = (lineKeys: string[]) => {
  if (lineKeys.some((lineKey) => !lineKeyPattern.test(lineKey))) {
    throw new Error('Every rate and charge requires a lowercase stable line key.');
  }
  if (new Set(lineKeys).size !== lineKeys.length) {
    throw new Error('Rate and charge line keys must be unique across the quote.');
  }
};

export const buildUsdPricingPayload = (draft: GovernedQuoteDraft) => {
  if (draft.rateTerms.length < 1 || draft.rateTerms.length > 50) {
    throw new Error('A quote requires between 1 and 50 rate terms.');
  }
  if (draft.chargeLines.length > 100) {
    throw new Error('A quote cannot contain more than 100 charge lines.');
  }
  assertUniqueLineKeys([
    ...draft.rateTerms.map((term) => term.lineKey),
    ...draft.chargeLines.map((line) => line.lineKey),
  ]);

  const rateTerms = draft.rateTerms.map((term, index) => {
    const label = `Rate ${index + 1}`;
    requirePositiveDecimal(term.unitRate, 4, `${label} unit rate`);
    requirePositiveDecimal(term.equipmentQuantity, 4, `${label} equipment quantity`);
    requirePositiveDecimal(term.rentalPeriodQuantity, 4, `${label} rental-period quantity`);
    optionalPositiveDecimal(term.minimumBillableQuantity, 4, `${label} minimum billable quantity`);
    optionalPositiveDecimal(term.includedUsageQuantity, 4, `${label} included usage`);
    optionalPositiveDecimal(term.overtimeRate, 4, `${label} overtime rate`);
    optionalPositiveDecimal(term.overtimeMultiplier, 6, `${label} overtime multiplier`);
    if ((term.includedUsageQuantity === '') !== (term.includedUsageUnit.trim() === '')) {
      throw new Error(`${label} included usage requires both a quantity and unit.`);
    }
    if (term.overtimeRate !== '' && term.overtimeMultiplier !== '') {
      throw new Error(`${label} must state either an overtime rate or multiplier, not both.`);
    }
    if (term.rateBasis === 'flat_rental_term' && term.rentalPeriodQuantity !== '1') {
      throw new Error(`${label} flat rental term requires a rental-period quantity of exactly 1.`);
    }
    if (term.rateBasis === 'per_calendar_month' && term.calendarTimezone.trim() === '') {
      throw new Error(`${label} calendar-month rate requires an IANA timezone.`);
    }

    return {
      line_key: term.lineKey,
      rate_basis: term.rateBasis,
      rate_scope: term.rateScope,
      equipment_quantity: term.equipmentQuantity,
      rental_period_quantity: term.rentalPeriodQuantity,
      period_quantity_source: 'vendor_stated',
      ...(term.minimumBillableQuantity === '' ? {} : { minimum_billable_quantity: term.minimumBillableQuantity }),
      ...(term.rateBasis === 'per_calendar_month' ? { calendar_timezone: term.calendarTimezone.trim() } : {}),
      ...(term.includedUsageQuantity === '' ? {} : {
        included_usage_quantity: term.includedUsageQuantity,
        included_usage_unit: term.includedUsageUnit.trim(),
      }),
      ...(term.overtimeRate === '' ? {} : { overtime_rate: term.overtimeRate }),
      ...(term.overtimeMultiplier === '' ? {} : { overtime_multiplier: term.overtimeMultiplier }),
      proration_policy: term.prorationPolicy,
      rental_period_definition: requireText(term.rentalPeriodDefinition, `${label} rental-period definition`),
      vendor_calculation_terms: requireText(term.vendorCalculationTerms, `${label} calculation terms`, 1000),
      unit_rate: term.unitRate,
      amount_status: 'priced',
      calculation_method: 'deterministic',
    };
  });

  const rateKeys = new Set(draft.rateTerms.map((term) => term.lineKey));
  const chargeLines = draft.chargeLines.map((line, index) => {
    const label = `Charge ${index + 1}`;
    const description = requireText(line.description, `${label} description`);
    if (line.amountStatus === 'tbd') {
      throw new Error(`${description} must be explicitly priced, included, excluded, contingent, or not applicable.`);
    }
    if (line.amountStatus === 'priced') {
      requireNonNegativeDecimal(line.amount, 2, `${description} amount`);
    } else if (line.amount !== '') {
      throw new Error(`${description} amount must be blank unless its status is priced.`);
    }
    if (line.amountStatus === 'included' && !rateKeys.has(line.includedInLineKey)) {
      throw new Error(`${description} must identify the exact rate line that includes it.`);
    }
    if (line.amountStatus === 'contingent' && line.contingentTrigger.trim() === '') {
      throw new Error(`${description} requires explicit contingent calculation terms.`);
    }

    return {
      line_key: line.lineKey,
      charge_type: line.chargeType,
      description,
      amount_status: line.amountStatus,
      calculation_method: line.amountStatus === 'priced' ? 'fixed' : 'incomplete',
      ...(line.amountStatus === 'priced' ? { amount: line.amount } : {}),
      ...(line.amountStatus === 'included' ? { included_in_line_key: line.includedInLineKey } : {}),
      ...(line.amountStatus === 'contingent' ? { contingent_trigger: line.contingentTrigger.trim() } : {}),
    };
  });

  return {
    schema_version: 1,
    currency_code: SUPPORTED_CURRENCY,
    calculation_policy_version: CALCULATION_POLICY_VERSION,
    tax_status: 'not_calculated',
    tax_exemption_claimed: false,
    rate_terms: rateTerms,
    charge_lines: chargeLines,
  };
};

export const formatStoredUsd = (value: string | number | null | undefined, scale = 2) => {
  if (value === null || value === undefined) return 'UNKNOWN';
  const raw = String(value);
  if (!/^-?[0-9]+(?:\.[0-9]+)?$/.test(raw)) return 'UNKNOWN';
  const [whole, fraction = ''] = raw.split('.');
  return `${whole}.${fraction.padEnd(scale, '0').slice(0, scale)} USD`;
};

export const rateBasisLabel = (basis: string) => ({
  per_hour: 'hour',
  per_shift: 'shift',
  per_day: 'day',
  per_week: 'week',
  per_28_days: '28 days',
  per_calendar_month: 'calendar month',
  flat_rental_term: 'rental term',
}[basis] ?? 'UNKNOWN');

export const chargeTypeLabel = (type: string) => type
  .split('_')
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
  .join(' ');
