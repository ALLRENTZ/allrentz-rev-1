// The database function transition_rfq_status() remains authoritative for
// whether a status transition is valid. These sets provide the Edge Function's
// early validation and actor-ownership checks.

export const VALID_STATUSES = new Set([
  'draft', 'submitted', 'pending_vendor_review', 'vendor_quote_received',
  'quote_accepted', 'vendor_confirmed', 'mobilizing', 'in_transit',
  'on_rent', 'off_rent_requested', 'demobilizing',
  'off_rent', 'completed', 'cancelled', 'rejected',
])

export const REASON_REQUIRED_STATUSES = new Set(['cancelled', 'rejected'])

export const isTransitionReasonValid = (newStatus: string, reason: string | null) =>
  !REASON_REQUIRED_STATUSES.has(newStatus) || Boolean(reason?.trim())

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
  'pending_vendor_review:cancelled',
  'vendor_quote_received:quote_accepted',
  'vendor_quote_received:cancelled',
  'vendor_quote_received:rejected',
  'on_rent:off_rent_requested',
])

export const VENDOR_TRANSITIONS = new Set([
  'pending_vendor_review:vendor_quote_received',
  'quote_accepted:vendor_confirmed',
  'vendor_confirmed:mobilizing',
  'mobilizing:in_transit',
  'off_rent_requested:demobilizing',
])

// in_transit:on_rent is valid, but it is intentionally absent from both actor
// allowlists. The canonical on-rent timestamp is system-owned and must be based
// on recorded field acceptance evidence, not a unilateral customer or vendor
// action. Until that workflow exists, only the existing admin override can
// perform the transition.

// off_rent:completed is also valid but absent from both actor allowlists.
// Canonical closure requires completed reconciliation and bilateral closeout;
// a vendor cannot unilaterally close the rental. Until a dedicated closeout
// workflow exists, only the existing admin override can perform this transition.

// demobilizing:off_rent is valid but absent from both actor allowlists. The
// vendor owns acknowledgment and pickup activity; the contractual stop-rent
// timestamp is a system determination based on the recorded rule and evidence.
// Vendor pickup activity cannot unilaterally establish the billing stop.

// vendor_confirmed:cancelled and mobilizing:cancelled are valid exception paths
// but intentionally absent from both actor allowlists. Post-order cancellation
// requires recorded terms or elevated administrative cancellation authority;
// it cannot be a unilateral vendor action.

// quote_accepted:cancelled and quote_accepted:rejected are valid exception
// paths but intentionally absent from both actor allowlists. Quote acceptance
// creates the rental order boundary; termination after that point requires
// governed cancellation terms or an elevated administrative exception.

// submitted:pending_vendor_review is valid but absent from both actor
// allowlists. Moving an RFQ into vendor review belongs to platform matching or
// operations; the Edge Function has no pre-review vendor invitation authority
// that could safely grant this transition to an arbitrary vendor member.
