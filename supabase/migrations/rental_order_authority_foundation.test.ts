import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const migration = readFileSync(
  resolve(process.cwd(), 'supabase/migrations/20260828112832_rental_order_authority_foundation.sql'),
  'utf8',
)

describe('canonical Rental Order authority foundation', () => {
  it('creates one durable order identity and immutable accepted-quote version', () => {
    expect(migration).toContain('CREATE TABLE public.rental_orders')
    expect(migration).toContain('CREATE TABLE public.rental_order_versions')
    expect(migration).toContain('rfq_id                      uuid NOT NULL UNIQUE')
    expect(migration).toContain('accepted_quote_id           uuid NOT NULL UNIQUE')
    expect(migration).toContain("snapshot_kind = 'accepted_quote'")
    expect(migration).toContain('rental_orders_immutable')
    expect(migration).toContain('rental_order_versions_immutable')
    expect(migration).toContain("currency_code               text NOT NULL CHECK (currency_code = 'USD')")
    expect(migration).toContain("snapshot_payload ->> 'schema_version' = '2'")
  })

  it('defines exact versioned quote money before creating an order', () => {
    expect(migration).toContain('CREATE TABLE public.vendor_quote_rate_terms')
    expect(migration).toContain('CREATE TABLE public.vendor_quote_charge_lines')
    expect(migration).toContain("monetary_contract_version = 'usd-v1'")
    expect(migration).toContain("calculation_policy_version = 'allrentz-usd-1'")
    expect(migration).toContain("currency_code = 'USD'")
    expect(migration).toContain("'per_28_days', 'per_calendar_month', 'flat_rental_term'")
    expect(migration).toContain('equipment_quantity      numeric(18, 4)')
    expect(migration).toContain("rate_scope              text NOT NULL CHECK (rate_scope IN ('per_equipment_item', 'entire_line'))")
    expect(migration).toContain('rental_period_quantity  numeric(18, 4)')
    expect(migration).toContain('period_quantity_source  text NOT NULL')
    expect(migration).toContain('minimum_billable_quantity numeric(18, 4)')
    expect(migration).toContain('included_usage_quantity numeric(18, 4)')
    expect(migration).toContain('overtime_multiplier     numeric(9, 6)')
    expect(migration).toContain("proration_policy        text NOT NULL")
    expect(migration).toContain('rental_period_definition text NOT NULL')
    expect(migration).toContain('vendor_calculation_terms text NOT NULL')
    expect(migration).toContain('vendor-stated line extensions require quoted total excluding tax')
    expect(migration).toContain('quoted total excluding tax does not reconcile to finalized line extensions')
    expect(migration).toContain('delivery, pickup, and environmental charges require explicit commercial status')
    expect(migration).toContain("rate_basis <> 'per_calendar_month' OR calendar_timezone IS NOT NULL")
    expect(migration).toContain('calendar-month rates require a valid IANA calendar_timezone')
    expect(migration).toContain('unit_rate               numeric(20, 4)')
    expect(migration).toContain('amount                    numeric(20, 2)')
    expect(migration).toContain('PostgreSQL numeric round(value, 2) uses midpoint-away-from-zero')
    expect(migration).toContain('greatest(v_period_quantity, COALESCE(v_minimum_billable_quantity, v_period_quantity))')
    expect(migration).toContain('flat-rental-term rates require rental_period_quantity=1')
    expect(migration).toContain("CASE WHEN v_rate_scope = 'per_equipment_item' THEN v_equipment_quantity ELSE 1 END")
    expect(migration).toContain("'pickup', 'freight', 'mobilization'")
  })

  it('replaces browser-number quote submission with an idempotent JSON decimal contract', () => {
    expect(migration).toContain('p_idempotency_key         uuid')
    expect(migration).toContain('p_pricing                 jsonb')
    expect(migration).toContain('private.contract_decimal(')
    expect(migration).toContain('idempotency_key was already used for a different pricing payload')
    expect(migration).toContain("p_pricing ->> 'currency_code' IS DISTINCT FROM 'USD'")
    expect(migration).toContain("p_pricing ->> 'calculation_policy_version' IS DISTINCT FROM 'allrentz-usd-1'")
    expect(migration).toContain('DROP FUNCTION IF EXISTS public.submit_vendor_quote(')
  })

  it('makes revisions and commercial line records immutable and gates acceptance', () => {
    expect(migration).toContain('vendor_quote_rate_terms_immutable')
    expect(migration).toContain('vendor_quote_charge_lines_immutable')
    expect(migration).toContain('vendor_quote_revision_contract')
    expect(migration).toContain('Submitted quote commercial terms are immutable; submit a new revision')
    expect(migration).toContain('Only a submitted or revised quote can be accepted')
    expect(migration).toContain('A superseded quote revision cannot be accepted')
    expect(migration).toContain("OLD.pricing_state <> 'acceptance_ready'")
    expect(migration).toContain('tax_status included requires an explicit tax charge line')
    expect(migration).toContain('priced tax lines require tax_status exclusive or included')
    expect(migration).toContain('tax_exemption_claimed must be an explicit boolean claim')
    expect(migration).toContain("tax_determination_status IN ('not_determined', 'taxable', 'exempt')")
  })

  it('derives the order atomically from the governed quote-acceptance boundary', () => {
    expect(migration).toContain(
      'CREATE OR REPLACE FUNCTION private.materialize_rental_order_from_accepted_quote',
    )
    expect(migration).toContain('vendor_quote_acceptance_creates_rental_order')
    expect(migration).toContain("NEW.status = 'accepted'")
    expect(migration).toContain("'rental_order.created'")
    expect(migration).toContain('v_audit_event_id := public.log_audit_event')
    expect(migration).toContain('Created immutable Rental Order version 1 from accepted quote')
    expect(migration).toContain('total does not reproduce from finalized lines')
    expect(migration).toContain("status.new_status = 'quote_accepted'::public.app_rfq_status")
    expect(migration).toContain("'rate_terms', COALESCE((")
    expect(migration).toContain("'charge_lines', COALESCE((")
    expect(migration).toContain("'accepted_quote_submission_correlation_id'")
    expect(migration).toContain("'source_document_authority', 'not_recorded'")
  })

  it('fails closed across lifecycle, organization, and simulation boundaries', () => {
    expect(migration).toContain('Accepted quote simulation scope does not match RFQ')
    expect(migration).toContain('Accepted quote actor simulation scope does not match RFQ')
    expect(migration).toContain('Customer organization boundary does not match RFQ')
    expect(migration).toContain('Vendor organization boundary does not match accepted quote')
    expect(migration).toContain('outside the Rental Order lifecycle boundary')
    expect(migration).toContain("customer_organization_state IN ('recorded', 'unknown')")
  })

  it('uses explicit grants and party-scoped read-only RLS', () => {
    expect(migration).toContain('ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY')
    expect(migration).toContain('ALTER TABLE public.rental_order_versions ENABLE ROW LEVEL SECURITY')
    expect(migration).toMatch(
      /REVOKE ALL PRIVILEGES ON TABLE public\.rental_orders[\s\S]*FROM PUBLIC, anon, authenticated, service_role/,
    )
    expect(migration).toMatch(
      /GRANT SELECT ON TABLE public\.rental_orders TO authenticated, service_role/,
    )
    expect(migration).toContain('rental_orders_select_parties')
    expect(migration).toContain('public.is_demo_actor((SELECT auth.uid())) = is_simulated')
    expect(migration).not.toContain('GRANT ALL')
  })

  it('keeps all unresolved downstream authorities explicitly disabled', () => {
    expect(migration).toContain("'purchase_order_authority', false")
    expect(migration).toContain("'extension_authority', false")
    expect(migration).toContain("'billing_authority', false")
    expect(migration).toContain("'custody_authority', false")
    expect(migration).toContain("'closeout_authority', false")
    expect(migration).toContain("'granular_scope_authority', false")
    expect(migration).not.toContain('purchase_order_number')
    expect(migration).not.toContain('billable_through_at')
    expect(migration).not.toContain('custody_transferred_at')
    expect(migration).not.toContain('closeout_approved_at')
  })

  it('backfills prior accepted quotes through the same fail-closed materializer', () => {
    expect(migration).toMatch(
      /WHERE quote\.status = 'accepted'[\s\S]*PERFORM private\.materialize_rental_order_from_accepted_quote\(v_quote\.id\)/,
    )
    expect(migration).toContain('Any contradictory historical row fails the migration closed')
  })
})
