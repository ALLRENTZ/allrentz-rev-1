// The database function transition_rfq_status() remains authoritative for
// whether a status transition is valid. These sets provide the Edge Function's
// early validation and actor-ownership checks.

export const VALID_STATUSES = new Set([
  'draft', 'submitted', 'pending_vendor_review', 'vendor_quote_received',
  'quote_accepted', 'vendor_confirmed', 'mobilizing', 'in_transit',
  'on_rent', 'off_rent_requested', 'demobilizing',
  'off_rent', 'completed', 'cancelled', 'rejected',
])

export const VALID_TRANSITIONS = new Set([
  'draft:submitted',
  'draft:cancelled',
  'submitted:pending_vendor_review',
  'submitted:cancelled',
  'pending_vendor_review:vendor_quote_received',
  'pending_vendor_review:cancelled',
  'vendor_quote_received:quote_accepted',
  'vendor_quote_received:cancelled',
  'vendor_quote_received:rejected',
  'quote_accepted:vendor_confirmed',
  'quote_accepted:cancelled',
  'quote_accepted:rejected',
  'vendor_confirmed:mobilizing',
  'vendor_confirmed:cancelled',
  'mobilizing:in_transit',
  'mobilizing:cancelled',
  'in_transit:on_rent',
  'on_rent:off_rent_requested',
  'off_rent_requested:demobilizing',
  'demobilizing:off_rent',
  'off_rent:completed',
])

// rental_extended is intentionally excluded. It requires a bilateral change
// order workflow and must not be modeled as a unilateral lifecycle action.

export const CUSTOMER_TRANSITIONS = new Set([
  'draft:submitted',
  'draft:cancelled',
  'submitted:cancelled',
  'vendor_quote_received:quote_accepted',
  'vendor_quote_received:cancelled',
  'vendor_quote_received:rejected',
  'quote_accepted:cancelled',
  'quote_accepted:rejected',
  'on_rent:off_rent_requested',
])

export const VENDOR_TRANSITIONS = new Set([
  'submitted:pending_vendor_review',
  'pending_vendor_review:vendor_quote_received',
  'pending_vendor_review:cancelled',
  'quote_accepted:vendor_confirmed',
  'vendor_confirmed:mobilizing',
  'vendor_confirmed:cancelled',
  'mobilizing:in_transit',
  'mobilizing:cancelled',
  'in_transit:on_rent',
  'off_rent_requested:demobilizing',
  'demobilizing:off_rent',
  'off_rent:completed',
])
