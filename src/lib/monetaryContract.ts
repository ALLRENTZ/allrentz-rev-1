export const MONETARY_CONTRACT_VERSION = 'usd-v1' as const;
export const CALCULATION_POLICY_VERSION = 'allrentz-usd-1' as const;
export const SUPPORTED_CURRENCY = 'USD' as const;

export const RATE_BASES = [
  'per_hour',
  'per_shift',
  'per_day',
  'per_week',
  'per_28_days',
  'per_calendar_month',
  'flat_rental_term',
] as const;

export type RateBasis = (typeof RATE_BASES)[number];

export type GovernedQuoteDraft = {
  rateBasis: RateBasis;
  unitRate: string;
  equipmentQuantity: string;
  rentalPeriodQuantity: string;
  minimumBillableQuantity: string;
  calendarTimezone: string;
  deliveryFee: string;
  mobilizationFee: string;
  vendorNotes: string;
  complianceConfirmed: boolean;
};

export const emptyGovernedQuoteDraft = (): GovernedQuoteDraft => ({
  rateBasis: 'per_day',
  unitRate: '',
  equipmentQuantity: '1',
  rentalPeriodQuantity: '1',
  minimumBillableQuantity: '',
  calendarTimezone: '',
  deliveryFee: '',
  mobilizationFee: '',
  vendorNotes: '',
  complianceConfirmed: false,
});

const decimalPattern = (scale: number) => new RegExp(`^[0-9]+(?:\\.[0-9]{1,${scale}})?$`);

const requirePositiveDecimal = (value: string, scale: number, label: string) => {
  if (!decimalPattern(scale).test(value) || /^0+(?:\.0+)?$/.test(value)) {
    throw new Error(`${label} must be a positive decimal with at most ${scale} decimal places.`);
  }
};

const optionalMoney = (value: string, label: string) => {
  if (value === '') return;
  if (!decimalPattern(2).test(value)) {
    throw new Error(`${label} must be a non-negative decimal with at most 2 decimal places.`);
  }
};

export const buildUsdPricingPayload = (draft: GovernedQuoteDraft) => {
  requirePositiveDecimal(draft.unitRate, 4, 'Unit rate');
  requirePositiveDecimal(draft.equipmentQuantity, 4, 'Equipment quantity');
  requirePositiveDecimal(draft.rentalPeriodQuantity, 4, 'Rental period quantity');
  if (draft.rateBasis === 'flat_rental_term' && draft.rentalPeriodQuantity !== '1') {
    throw new Error('Flat rental term requires a rental-period quantity of exactly 1.');
  }
  if (draft.minimumBillableQuantity !== '') {
    requirePositiveDecimal(draft.minimumBillableQuantity, 4, 'Minimum billable quantity');
  }
  if (draft.rateBasis === 'per_calendar_month' && draft.calendarTimezone.trim() === '') {
    throw new Error('Calendar-month rates require an IANA timezone.');
  }
  optionalMoney(draft.deliveryFee, 'Delivery fee');
  optionalMoney(draft.mobilizationFee, 'Mobilization fee');

  const chargeLines = [
    {
      line_key: 'delivery',
      charge_type: 'delivery',
      description: 'Delivery fee',
      amount_status: draft.deliveryFee === '' ? 'not_applicable' : 'priced',
      calculation_method: draft.deliveryFee === '' ? 'incomplete' : 'fixed',
      ...(draft.deliveryFee === '' ? {} : { amount: draft.deliveryFee }),
    },
    {
      line_key: 'mobilization',
      charge_type: 'mobilization',
      description: 'Mobilization fee',
      amount_status: draft.mobilizationFee === '' ? 'not_applicable' : 'priced',
      calculation_method: draft.mobilizationFee === '' ? 'incomplete' : 'fixed',
      ...(draft.mobilizationFee === '' ? {} : { amount: draft.mobilizationFee }),
    },
  ];

  return {
    schema_version: 1,
    currency_code: SUPPORTED_CURRENCY,
    calculation_policy_version: CALCULATION_POLICY_VERSION,
    tax_status: 'not_calculated',
    tax_exemption_claimed: false,
    rate_terms: [{
      line_key: 'equipment_rental',
      rate_basis: draft.rateBasis,
      equipment_quantity: draft.equipmentQuantity,
      rental_period_quantity: draft.rentalPeriodQuantity,
      period_quantity_source: 'vendor_stated',
      ...(draft.minimumBillableQuantity === ''
        ? {}
        : { minimum_billable_quantity: draft.minimumBillableQuantity }),
      ...(draft.rateBasis === 'per_calendar_month'
        ? { calendar_timezone: draft.calendarTimezone.trim() }
        : {}),
      unit_rate: draft.unitRate,
      amount_status: 'priced',
      calculation_method: 'deterministic',
    }],
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
