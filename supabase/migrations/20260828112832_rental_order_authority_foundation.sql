-- Canonical Rental Order authority foundation.
--
-- A Rental Order is created only when the existing canonical RFQ transition
-- accepts a vendor quote. The order is a durable RFQ-wide identity and version
-- 1 is an immutable snapshot of the accepted quote. This migration does not
-- create purchase-order issuance, extension/change-order approval, billing,
-- custody, closeout, override, or granular rental authority.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

-- Monetary contract version 1. Quote authors submit decimal values as JSON
-- strings. PostgreSQL numeric is the only calculation authority; browser
-- number arithmetic is never accepted as a contractual total.
-- A governed original quote document/hash remains unavailable until the
-- separate Evidence Artifact authority exists. This contract records that
-- absence explicitly and never treats an arbitrary URL as quote authority.
ALTER TABLE public.vendor_quote_responses
  ADD COLUMN monetary_contract_version text,
  ADD COLUMN currency_code text,
  ADD COLUMN pricing_state text,
  ADD COLUMN total_calculation_method text,
  ADD COLUMN calculation_policy_version text,
  ADD COLUMN tax_status text,
  ADD COLUMN tax_exemption_claimed boolean,
  ADD COLUMN tax_determination_status text,
  ADD COLUMN vendor_stated_total numeric(20, 2),
  ADD COLUMN calculated_total numeric(20, 2),
  ADD COLUMN pricing_payload jsonb,
  ADD COLUMN idempotency_key uuid,
  ADD COLUMN submission_correlation_id uuid,
  ADD COLUMN submission_audit_event_id uuid REFERENCES public.audit_events ON DELETE RESTRICT;

ALTER TABLE public.vendor_quote_responses
  ADD CONSTRAINT vendor_quote_monetary_contract_check CHECK (
    (monetary_contract_version IS NULL
      AND currency_code IS NULL
      AND pricing_state IS NULL
      AND total_calculation_method IS NULL
      AND calculation_policy_version IS NULL
      AND tax_status IS NULL
      AND tax_exemption_claimed IS NULL
      AND tax_determination_status IS NULL
      AND pricing_payload IS NULL
      AND idempotency_key IS NULL
      AND submission_correlation_id IS NULL
      AND submission_audit_event_id IS NULL)
    OR
    (monetary_contract_version IS NOT NULL
      AND currency_code IS NOT NULL
      AND pricing_state IS NOT NULL
      AND total_calculation_method IS NOT NULL
      AND calculation_policy_version IS NOT NULL
      AND tax_status IS NOT NULL
      AND tax_exemption_claimed IS NOT NULL
      AND tax_determination_status IS NOT NULL
      AND pricing_payload IS NOT NULL
      AND monetary_contract_version = 'usd-v1'
      AND currency_code = 'USD'
      AND pricing_state IN ('acceptance_ready', 'incomplete', 'requires_acknowledgment')
      AND total_calculation_method IN ('deterministic', 'vendor_stated', 'incomplete')
      AND calculation_policy_version = 'allrentz-usd-1'
      AND tax_status IN ('not_calculated', 'exclusive', 'included')
      AND tax_determination_status IN ('not_determined', 'taxable', 'exempt')
      AND jsonb_typeof(pricing_payload) = 'object'
      AND idempotency_key IS NOT NULL
      AND submission_correlation_id IS NOT NULL
      AND submission_audit_event_id IS NOT NULL)
  ),
  ADD CONSTRAINT vendor_quote_totals_check CHECK (
    (vendor_stated_total IS NULL OR vendor_stated_total >= 0)
    AND (calculated_total IS NULL OR calculated_total >= 0)
    AND (total_calculation_method <> 'vendor_stated' OR vendor_stated_total IS NOT NULL)
    AND (total_calculation_method <> 'deterministic' OR calculated_total IS NOT NULL)
    AND (
      (pricing_state = 'acceptance_ready' AND total_calculation_method IN ('deterministic', 'vendor_stated'))
      OR (pricing_state <> 'acceptance_ready' AND total_calculation_method = 'incomplete')
    )
  ),
  ADD CONSTRAINT vendor_quote_intent_unique
    UNIQUE (rfq_id, vendor_organization_id, idempotency_key),
  ADD CONSTRAINT vendor_quote_submission_correlation_unique
    UNIQUE (submission_correlation_id),
  ADD CONSTRAINT vendor_quote_submission_audit_unique
    UNIQUE (submission_audit_event_id);

CREATE TABLE public.vendor_quote_rate_terms (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                uuid NOT NULL REFERENCES public.vendor_quote_responses ON DELETE RESTRICT,
  line_key                text NOT NULL CHECK (line_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  rate_basis              text NOT NULL CHECK (rate_basis IN (
                            'per_hour', 'per_shift', 'per_day', 'per_week',
                            'per_28_days', 'per_calendar_month', 'flat_rental_term'
                          )),
  rate_scope              text NOT NULL CHECK (rate_scope IN ('per_equipment_item', 'entire_line')),
  equipment_quantity      numeric(18, 4) NOT NULL CHECK (equipment_quantity > 0),
  rental_period_quantity  numeric(18, 4) NOT NULL CHECK (rental_period_quantity > 0),
  period_quantity_source  text NOT NULL CHECK (period_quantity_source IN (
                            'vendor_stated', 'contract_schedule'
                          )),
  minimum_billable_quantity numeric(18, 4) CHECK (minimum_billable_quantity > 0),
  calendar_timezone       text,
  included_usage_quantity numeric(18, 4) CHECK (included_usage_quantity > 0),
  included_usage_unit     text CHECK (included_usage_unit IS NULL OR length(btrim(included_usage_unit)) BETWEEN 1 AND 100),
  overtime_rate           numeric(20, 4) CHECK (overtime_rate > 0),
  overtime_multiplier     numeric(9, 6) CHECK (overtime_multiplier > 0),
  proration_policy        text NOT NULL CHECK (proration_policy IN ('allowed', 'not_allowed', 'unknown')),
  rental_period_definition text NOT NULL CHECK (length(btrim(rental_period_definition)) BETWEEN 1 AND 500),
  vendor_calculation_terms text NOT NULL CHECK (length(btrim(vendor_calculation_terms)) BETWEEN 1 AND 1000),
  unit_rate               numeric(20, 4),
  amount_status           text NOT NULL CHECK (amount_status IN (
                            'priced', 'excluded', 'tbd', 'not_applicable'
                          )),
  calculation_method      text NOT NULL CHECK (calculation_method IN (
                            'deterministic', 'vendor_stated', 'incomplete'
                          )),
  line_amount             numeric(20, 2),
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, line_key),
  CHECK (
    (amount_status = 'priced' AND unit_rate IS NOT NULL AND line_amount IS NOT NULL)
    OR (amount_status <> 'priced' AND unit_rate IS NULL AND line_amount IS NULL)
  ),
  CHECK (
    (amount_status = 'priced' AND calculation_method IN ('deterministic', 'vendor_stated'))
    OR (amount_status <> 'priced' AND calculation_method = 'incomplete')
  ),
  CHECK (
    calculation_method <> 'deterministic'
    OR line_amount = round(
      unit_rate * CASE WHEN rate_scope = 'per_equipment_item' THEN equipment_quantity ELSE 1 END
      * greatest(rental_period_quantity, COALESCE(minimum_billable_quantity, rental_period_quantity)),
      2
    )
  ),
  CHECK (rate_basis <> 'flat_rental_term' OR rental_period_quantity = 1),
  CHECK (rate_basis <> 'per_calendar_month' OR calendar_timezone IS NOT NULL),
  CHECK ((included_usage_quantity IS NULL) = (included_usage_unit IS NULL)),
  CHECK (overtime_rate IS NULL OR overtime_multiplier IS NULL)
);

CREATE TABLE public.vendor_quote_charge_lines (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id                  uuid NOT NULL REFERENCES public.vendor_quote_responses ON DELETE RESTRICT,
  line_key                  text NOT NULL CHECK (line_key ~ '^[a-z0-9][a-z0-9_-]{0,63}$'),
  charge_type               text NOT NULL CHECK (charge_type IN (
                              'delivery', 'pickup', 'freight', 'mobilization',
                              'demobilization', 'transportation_surcharge',
                              'environmental', 'fuel', 'rental_protection',
                              'setup_teardown', 'labor_technician', 'cleaning',
                              'consumables', 'tax', 'discount', 'other'
                            )),
  description               text NOT NULL CHECK (length(btrim(description)) BETWEEN 1 AND 500),
  amount_status             text NOT NULL CHECK (amount_status IN (
                              'priced', 'included', 'excluded', 'tbd',
                              'contingent', 'not_applicable'
                            )),
  calculation_method        text NOT NULL CHECK (calculation_method IN (
                              'fixed', 'percentage', 'vendor_stated', 'incomplete'
                            )),
  amount                    numeric(20, 2),
  percentage_rate           numeric(9, 6),
  percentage_base_line_ids  text[],
  included_in_line_key      text,
  contingent_trigger        text,
  created_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (quote_id, line_key),
  CHECK (
    (amount_status = 'priced' AND amount IS NOT NULL)
    OR (amount_status <> 'priced' AND amount IS NULL)
  ),
  CHECK (
    (amount_status = 'priced' AND calculation_method IN ('fixed', 'percentage', 'vendor_stated'))
    OR (amount_status = 'contingent' AND calculation_method = 'incomplete')
    OR (amount_status NOT IN ('priced', 'contingent') AND calculation_method = 'incomplete')
  ),
  CHECK (
    calculation_method <> 'percentage'
    OR (percentage_rate IS NOT NULL
      AND percentage_rate >= 0
      AND percentage_base_line_ids IS NOT NULL
      AND cardinality(percentage_base_line_ids) > 0)
  ),
  CHECK (calculation_method = 'percentage' OR (percentage_rate IS NULL AND percentage_base_line_ids IS NULL)),
  CHECK (amount_status <> 'included' OR included_in_line_key IS NOT NULL),
  CHECK (amount_status <> 'contingent' OR length(btrim(contingent_trigger)) > 0),
  CHECK (charge_type = 'discount' OR amount IS NULL OR amount >= 0),
  CHECK (charge_type <> 'discount' OR amount IS NULL OR amount <= 0)
);

ALTER TABLE public.vendor_quote_rate_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_quote_charge_lines ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.vendor_quote_rate_terms
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.vendor_quote_charge_lines
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.vendor_quote_rate_terms TO authenticated, service_role;
GRANT SELECT ON TABLE public.vendor_quote_charge_lines TO authenticated, service_role;

CREATE POLICY vendor_quote_rate_terms_select_parties
  ON public.vendor_quote_rate_terms FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_quote_responses AS quote
      WHERE quote.id = vendor_quote_rate_terms.quote_id
    )
  );

CREATE POLICY vendor_quote_rate_terms_service_read
  ON public.vendor_quote_rate_terms FOR SELECT TO service_role USING (true);

CREATE POLICY vendor_quote_charge_lines_select_parties
  ON public.vendor_quote_charge_lines FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.vendor_quote_responses AS quote
      WHERE quote.id = vendor_quote_charge_lines.quote_id
    )
  );

CREATE POLICY vendor_quote_charge_lines_service_read
  ON public.vendor_quote_charge_lines FOR SELECT TO service_role USING (true);

CREATE INDEX idx_vendor_quote_rate_terms_quote
  ON public.vendor_quote_rate_terms (quote_id, line_key);
CREATE INDEX idx_vendor_quote_charge_lines_quote
  ON public.vendor_quote_charge_lines (quote_id, line_key);

CREATE OR REPLACE FUNCTION private.prevent_quote_commercial_line_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; submit a new quote revision instead', TG_TABLE_NAME;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_quote_commercial_line_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER vendor_quote_rate_terms_immutable
BEFORE UPDATE OR DELETE ON public.vendor_quote_rate_terms
FOR EACH ROW EXECUTE FUNCTION private.prevent_quote_commercial_line_mutation();

CREATE TRIGGER vendor_quote_charge_lines_immutable
BEFORE UPDATE OR DELETE ON public.vendor_quote_charge_lines
FOR EACH ROW EXECUTE FUNCTION private.prevent_quote_commercial_line_mutation();

CREATE OR REPLACE FUNCTION private.contract_decimal(
  p_value text,
  p_scale integer,
  p_field text,
  p_allow_zero boolean DEFAULT true
)
RETURNS numeric
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  v_pattern text;
  v_value numeric;
BEGIN
  IF p_scale = 4 THEN
    v_pattern := '^[0-9]+([.][0-9]{1,4})?$';
  ELSIF p_scale = 2 THEN
    v_pattern := '^[0-9]+([.][0-9]{1,2})?$';
  ELSIF p_scale = 6 THEN
    v_pattern := '^[0-9]+([.][0-9]{1,6})?$';
  ELSE
    RAISE EXCEPTION 'Unsupported monetary scale: %', p_scale USING ERRCODE = '22023';
  END IF;

  IF p_value IS NULL OR p_value !~ v_pattern THEN
    RAISE EXCEPTION '% must be an unsigned decimal string with at most % fractional digits',
      p_field, p_scale USING ERRCODE = '22023';
  END IF;
  v_value := p_value::numeric;
  IF (NOT p_allow_zero AND v_value <= 0) OR (p_allow_zero AND v_value < 0) THEN
    RAISE EXCEPTION '% is outside its permitted range', p_field USING ERRCODE = '22023';
  END IF;
  IF v_value > 9999999999999999.9999::numeric THEN
    RAISE EXCEPTION '% exceeds the supported monetary bound', p_field USING ERRCODE = '22003';
  END IF;
  RETURN v_value;
END;
$$;

REVOKE ALL ON FUNCTION private.contract_decimal(text, integer, text, boolean)
  FROM PUBLIC, anon, authenticated, service_role;

DROP FUNCTION IF EXISTS public.submit_vendor_quote(
  uuid, uuid, numeric, numeric, numeric, integer, date, boolean, text,
  boolean, text[], text
);

CREATE OR REPLACE FUNCTION public.submit_vendor_quote(
  p_rfq_id                  uuid,
  p_vendor_organization_id  uuid,
  p_idempotency_key         uuid,
  p_pricing                 jsonb,
  p_available_start_date    date DEFAULT NULL,
  p_equipment_substitution  boolean DEFAULT false,
  p_substitution_notes      text DEFAULT NULL,
  p_compliance_confirmed    boolean DEFAULT false,
  p_compliance_notes        text[] DEFAULT ARRAY[]::text[],
  p_vendor_notes            text DEFAULT NULL
)
RETURNS TABLE (
  quote_id uuid,
  quote_version integer,
  pricing_state text,
  currency_code text,
  correlation_id uuid,
  replayed boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id uuid := auth.uid();
  v_actor_role text;
  v_actor_is_demo boolean;
  v_rfq record;
  v_org record;
  v_existing record;
  v_quote_id uuid := gen_random_uuid();
  v_version integer;
  v_quote_status text;
  v_pricing_state text := 'acceptance_ready';
  v_total_method text := 'deterministic';
  v_tax_status text;
  v_tax_exemption_claimed boolean;
  v_vendor_stated_total numeric(20, 2);
  v_calculated_total numeric(20, 2) := 0;
  v_rate jsonb;
  v_charge jsonb;
  v_line_key text;
  v_rate_basis text;
  v_rate_scope text;
  v_amount_status text;
  v_calculation_method text;
  v_equipment_quantity numeric(18, 4);
  v_period_quantity numeric(18, 4);
  v_period_quantity_source text;
  v_minimum_billable_quantity numeric(18, 4);
  v_calendar_timezone text;
  v_included_usage_quantity numeric(18, 4);
  v_included_usage_unit text;
  v_overtime_rate numeric(20, 4);
  v_overtime_multiplier numeric(9, 6);
  v_proration_policy text;
  v_rental_period_definition text;
  v_vendor_calculation_terms text;
  v_unit_rate numeric(20, 4);
  v_line_amount numeric(20, 2);
  v_charge_type text;
  v_description text;
  v_percentage_rate numeric(9, 6);
  v_percentage_base_ids text[];
  v_base_total numeric(20, 2);
  v_included_in_line_key text;
  v_contingent_trigger text;
  v_daily_rate numeric;
  v_delivery_fee numeric;
  v_mobilization_fee numeric;
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_transition_correlation_id uuid;
  v_base_match_count integer;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to submit a vendor quote'
      USING ERRCODE = '42501';
  END IF;
  IF p_idempotency_key IS NULL THEN
    RAISE EXCEPTION 'idempotency_key is required' USING ERRCODE = '22023';
  END IF;

  SELECT profile.is_demo
  INTO v_actor_is_demo
  FROM public.profiles AS profile
  WHERE profile.id = v_actor_id
    AND profile.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active vendor profile authority is required'
      USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(p_pricing) IS DISTINCT FROM 'object'
     OR p_pricing ->> 'schema_version' IS DISTINCT FROM '1'
     OR p_pricing ->> 'currency_code' IS DISTINCT FROM 'USD'
     OR p_pricing ->> 'calculation_policy_version' IS DISTINCT FROM 'allrentz-usd-1'
     OR jsonb_typeof(p_pricing -> 'rate_terms') IS DISTINCT FROM 'array'
     OR jsonb_array_length(p_pricing -> 'rate_terms') = 0
     OR jsonb_array_length(p_pricing -> 'rate_terms') > 50
     OR COALESCE(jsonb_typeof(p_pricing -> 'charge_lines'), 'array') <> 'array'
     OR jsonb_array_length(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) > 100 THEN
    RAISE EXCEPTION 'pricing payload does not satisfy monetary contract usd-v1'
      USING ERRCODE = '22023';
  END IF;
  IF pg_column_size(p_pricing) > 262144
     OR EXISTS (
       SELECT 1 FROM jsonb_object_keys(p_pricing) AS keys(field_name)
       WHERE field_name NOT IN (
         'schema_version', 'currency_code', 'calculation_policy_version',
         'tax_status', 'tax_exemption_claimed', 'vendor_stated_total',
         'rate_terms', 'charge_lines'
       )
     ) THEN
    RAISE EXCEPTION 'pricing payload exceeds its versioned size or field contract'
      USING ERRCODE = '22023';
  END IF;
  IF EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS rate(rate_value)
    JOIN jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) AS charge(charge_value)
      ON rate_value ->> 'line_key' = charge_value ->> 'line_key'
  ) THEN
    RAISE EXCEPTION 'rate and charge line keys must be unique across the quote'
      USING ERRCODE = '22023';
  END IF;
  v_tax_status := p_pricing ->> 'tax_status';
  IF v_tax_status IS NULL
     OR v_tax_status NOT IN ('not_calculated', 'exclusive', 'included') THEN
    RAISE EXCEPTION 'tax_status is required and invalid' USING ERRCODE = '22023';
  END IF;
  IF jsonb_typeof(p_pricing -> 'tax_exemption_claimed') IS DISTINCT FROM 'boolean' THEN
    RAISE EXCEPTION 'tax_exemption_claimed must be an explicit boolean claim'
      USING ERRCODE = '22023';
  END IF;
  v_tax_exemption_claimed := (p_pricing ->> 'tax_exemption_claimed')::boolean;
  IF p_pricing ? 'vendor_stated_total' THEN
    v_vendor_stated_total := private.contract_decimal(
      p_pricing ->> 'vendor_stated_total', 2, 'vendor_stated_total', true
    )::numeric(20, 2);
  END IF;
  IF length(COALESCE(p_vendor_notes, '')) > 5000
     OR length(COALESCE(p_substitution_notes, '')) > 5000
     OR cardinality(COALESCE(p_compliance_notes, ARRAY[]::text[])) > 50
     OR EXISTS (
       SELECT 1
       FROM unnest(COALESCE(p_compliance_notes, ARRAY[]::text[])) AS notes(note_text)
       WHERE length(note_text) > 500
     ) THEN
    RAISE EXCEPTION 'quote notes cannot exceed 5000 characters' USING ERRCODE = '22023';
  END IF;
  IF NOT COALESCE(p_equipment_substitution, false)
     AND NULLIF(btrim(COALESCE(p_substitution_notes, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'substitution_notes require equipment_substitution=true'
      USING ERRCODE = '22023';
  END IF;

  SELECT rr.id, rr.operational_status, rr.is_simulated
  INTO v_rfq
  FROM public.rental_requests AS rr
  WHERE rr.id = p_rfq_id
  FOR UPDATE;

  SELECT org.id, org.org_type, org.archived_at, org.is_simulated
  INTO v_org
  FROM public.organizations AS org
  WHERE org.id = p_vendor_organization_id;
  IF NOT FOUND OR v_org.archived_at IS NOT NULL
     OR v_org.org_type NOT IN ('vendor', 'both') THEN
    RAISE EXCEPTION 'Active vendor organization authority is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT membership.role
  INTO v_actor_role
  FROM public.organization_memberships AS membership
  WHERE membership.user_id = v_actor_id
    AND membership.organization_id = p_vendor_organization_id
    AND membership.archived_at IS NULL
    AND membership.role IN ('owner', 'admin', 'member')
    AND membership.is_simulated = v_org.is_simulated;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active vendor organization membership is required'
      USING ERRCODE = '42501';
  END IF;

  IF v_rfq.id IS NULL THEN
    RAISE EXCEPTION 'RFQ is not available for vendor quote submission'
      USING ERRCODE = '42501';
  END IF;
  IF v_actor_is_demo IS DISTINCT FROM v_rfq.is_simulated
     OR v_org.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'RFQ is not available for vendor quote submission'
      USING ERRCODE = '42501';
  END IF;

  SELECT quote.id, quote.version, quote.pricing_state, quote.currency_code,
         quote.submission_correlation_id, quote.pricing_payload,
         quote.available_start_date, quote.equipment_substitution,
         quote.substitution_notes, quote.compliance_confirmed,
         quote.compliance_notes, quote.vendor_notes
  INTO v_existing
  FROM public.vendor_quote_responses AS quote
  WHERE quote.rfq_id = p_rfq_id
    AND quote.vendor_organization_id = p_vendor_organization_id
    AND quote.idempotency_key = p_idempotency_key;
  IF FOUND THEN
    IF v_existing.pricing_payload IS DISTINCT FROM p_pricing
       OR v_existing.available_start_date IS DISTINCT FROM p_available_start_date
       OR v_existing.equipment_substitution IS DISTINCT FROM COALESCE(p_equipment_substitution, false)
       OR v_existing.substitution_notes IS DISTINCT FROM NULLIF(btrim(COALESCE(p_substitution_notes, '')), '')
       OR v_existing.compliance_confirmed IS DISTINCT FROM COALESCE(p_compliance_confirmed, false)
       OR v_existing.compliance_notes IS DISTINCT FROM COALESCE(p_compliance_notes, ARRAY[]::text[])
       OR v_existing.vendor_notes IS DISTINCT FROM NULLIF(btrim(COALESCE(p_vendor_notes, '')), '') THEN
      RAISE EXCEPTION 'idempotency_key was already used for a different pricing payload'
        USING ERRCODE = '23505';
    END IF;
    RETURN QUERY SELECT v_existing.id, v_existing.version, v_existing.pricing_state,
      v_existing.currency_code, v_existing.submission_correlation_id, true;
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.rfq_vendor_invitations AS invitation
    WHERE invitation.rfq_id = p_rfq_id
      AND invitation.vendor_organization_id = p_vendor_organization_id
      AND invitation.invitation_status = 'invited'
      AND invitation.revoked_at IS NULL
      AND invitation.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'RFQ is not available for vendor quote submission'
      USING ERRCODE = '42501';
  END IF;
  IF v_rfq.operational_status NOT IN (
    'pending_vendor_review'::public.app_rfq_status,
    'vendor_quote_received'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ is not accepting quote submissions or revisions'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.vendor_quote_responses AS quote
    WHERE quote.rfq_id = p_rfq_id
      AND quote.vendor_organization_id = p_vendor_organization_id
      AND quote.status IN ('accepted', 'rejected', 'expired', 'withdrawn')
  ) THEN
    RAISE EXCEPTION 'A finalized quote cannot be revised' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(max(quote.version), 0) + 1
  INTO v_version
  FROM public.vendor_quote_responses AS quote
  WHERE quote.rfq_id = p_rfq_id
    AND quote.vendor_organization_id = p_vendor_organization_id;
  v_quote_status := CASE WHEN v_version = 1 THEN 'submitted' ELSE 'revised' END;

  FOR v_rate IN SELECT value FROM jsonb_array_elements(p_pricing -> 'rate_terms')
  LOOP
    IF jsonb_typeof(v_rate) <> 'object' THEN
      RAISE EXCEPTION 'each rate term must be an object' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_rate) AS keys(field_name)
      WHERE field_name NOT IN (
        'line_key', 'rate_basis', 'rate_scope', 'equipment_quantity',
        'rental_period_quantity', 'period_quantity_source',
        'minimum_billable_quantity', 'calendar_timezone', 'unit_rate',
        'included_usage_quantity', 'included_usage_unit',
        'overtime_rate', 'overtime_multiplier', 'proration_policy',
        'rental_period_definition', 'vendor_calculation_terms',
        'amount_status', 'calculation_method', 'line_amount'
      )
    ) THEN
      RAISE EXCEPTION 'rate term contains fields outside monetary contract usd-v1'
        USING ERRCODE = '22023';
    END IF;
    v_line_key := v_rate ->> 'line_key';
    v_rate_basis := v_rate ->> 'rate_basis';
    v_rate_scope := v_rate ->> 'rate_scope';
    v_amount_status := v_rate ->> 'amount_status';
    v_calculation_method := v_rate ->> 'calculation_method';
    v_period_quantity_source := v_rate ->> 'period_quantity_source';
    v_calendar_timezone := NULLIF(v_rate ->> 'calendar_timezone', '');
    v_included_usage_unit := NULLIF(btrim(v_rate ->> 'included_usage_unit'), '');
    v_proration_policy := v_rate ->> 'proration_policy';
    v_rental_period_definition := NULLIF(btrim(v_rate ->> 'rental_period_definition'), '');
    v_vendor_calculation_terms := NULLIF(btrim(v_rate ->> 'vendor_calculation_terms'), '');
    IF v_line_key IS NULL OR v_line_key !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
       OR v_rate_basis IS NULL OR v_rate_basis NOT IN (
         'per_hour', 'per_shift', 'per_day', 'per_week', 'per_28_days',
         'per_calendar_month', 'flat_rental_term'
       )
       OR v_rate_scope IS NULL OR v_rate_scope NOT IN ('per_equipment_item', 'entire_line')
       OR v_proration_policy IS NULL OR v_proration_policy NOT IN ('allowed', 'not_allowed', 'unknown')
       OR v_rental_period_definition IS NULL OR length(v_rental_period_definition) > 500
       OR v_vendor_calculation_terms IS NULL OR length(v_vendor_calculation_terms) > 1000
       OR v_amount_status IS NULL OR v_amount_status NOT IN (
         'priced', 'excluded', 'tbd', 'not_applicable'
       )
       OR v_calculation_method IS NULL
       OR v_calculation_method NOT IN ('deterministic', 'vendor_stated', 'incomplete')
       OR v_period_quantity_source IS NULL
       OR v_period_quantity_source <> 'vendor_stated' THEN
      RAISE EXCEPTION 'invalid rate term contract' USING ERRCODE = '22023';
    END IF;
    IF v_rate_basis = 'per_calendar_month' AND (
      v_calendar_timezone IS NULL
      OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_timezone_names WHERE name = v_calendar_timezone)
    ) THEN
      RAISE EXCEPTION 'calendar-month rates require a valid IANA calendar_timezone'
        USING ERRCODE = '22023';
    END IF;
    v_equipment_quantity := private.contract_decimal(
      v_rate ->> 'equipment_quantity', 4, v_line_key || '.equipment_quantity', false
    )::numeric(18, 4);
    v_period_quantity := private.contract_decimal(
      v_rate ->> 'rental_period_quantity', 4, v_line_key || '.rental_period_quantity', false
    )::numeric(18, 4);
    IF v_rate_basis = 'flat_rental_term' AND v_period_quantity <> 1 THEN
      RAISE EXCEPTION 'flat-rental-term rates require rental_period_quantity=1'
        USING ERRCODE = '22023';
    END IF;
    v_unit_rate := NULL;
    v_line_amount := NULL;
    v_minimum_billable_quantity := NULL;
    v_included_usage_quantity := NULL;
    v_overtime_rate := NULL;
    v_overtime_multiplier := NULL;
    IF v_rate ? 'minimum_billable_quantity' THEN
      v_minimum_billable_quantity := private.contract_decimal(
        v_rate ->> 'minimum_billable_quantity', 4,
        v_line_key || '.minimum_billable_quantity', false
      )::numeric(18, 4);
    END IF;
    IF v_rate ? 'included_usage_quantity' THEN
      v_included_usage_quantity := private.contract_decimal(
        v_rate ->> 'included_usage_quantity', 4, v_line_key || '.included_usage_quantity', false
      )::numeric(18, 4);
    END IF;
    IF (v_included_usage_quantity IS NULL) <> (v_included_usage_unit IS NULL) THEN
      RAISE EXCEPTION 'included usage requires both quantity and unit' USING ERRCODE = '22023';
    END IF;
    IF v_rate ? 'overtime_rate' THEN
      v_overtime_rate := private.contract_decimal(
        v_rate ->> 'overtime_rate', 4, v_line_key || '.overtime_rate', false
      )::numeric(20, 4);
    END IF;
    IF v_rate ? 'overtime_multiplier' THEN
      v_overtime_multiplier := private.contract_decimal(
        v_rate ->> 'overtime_multiplier', 6, v_line_key || '.overtime_multiplier', false
      )::numeric(9, 6);
    END IF;
    IF v_overtime_rate IS NOT NULL AND v_overtime_multiplier IS NOT NULL THEN
      RAISE EXCEPTION 'overtime must use either a rate or multiplier, not both' USING ERRCODE = '22023';
    END IF;
    IF v_amount_status = 'priced' THEN
      v_unit_rate := private.contract_decimal(
        v_rate ->> 'unit_rate', 4, v_line_key || '.unit_rate', true
      )::numeric(20, 4);
      IF v_calculation_method = 'deterministic' THEN
        -- PostgreSQL numeric round(value, 2) uses midpoint-away-from-zero.
        v_line_amount := round(
          v_unit_rate * CASE WHEN v_rate_scope = 'per_equipment_item' THEN v_equipment_quantity ELSE 1 END
          * greatest(v_period_quantity, COALESCE(v_minimum_billable_quantity, v_period_quantity)),
          2
        );
      ELSIF v_calculation_method = 'vendor_stated' THEN
        v_line_amount := private.contract_decimal(
          v_rate ->> 'line_amount', 2, v_line_key || '.line_amount', true
        )::numeric(20, 2);
        v_total_method := 'vendor_stated';
      ELSE
        RAISE EXCEPTION 'priced rate terms require deterministic or vendor_stated calculation'
          USING ERRCODE = '22023';
      END IF;
      v_calculated_total := v_calculated_total + v_line_amount;
    ELSIF v_calculation_method <> 'incomplete' THEN
      RAISE EXCEPTION 'unpriced rate terms require incomplete calculation_method'
        USING ERRCODE = '22023';
    ELSIF v_amount_status IN ('tbd', 'excluded') THEN
      v_pricing_state := CASE
        WHEN v_amount_status = 'tbd' THEN 'incomplete'
        WHEN v_pricing_state <> 'incomplete' THEN 'requires_acknowledgment'
        ELSE v_pricing_state
      END;
      v_total_method := 'incomplete';
    END IF;
  END LOOP;

  FOR v_charge IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb))
  LOOP
    IF jsonb_typeof(v_charge) <> 'object' THEN
      RAISE EXCEPTION 'each charge line must be an object' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_object_keys(v_charge) AS keys(field_name)
      WHERE field_name NOT IN (
        'line_key', 'charge_type', 'description', 'amount_status',
        'calculation_method', 'amount', 'percentage_rate',
        'percentage_base_line_ids', 'included_in_line_key', 'contingent_trigger'
      )
    ) THEN
      RAISE EXCEPTION 'charge line contains fields outside monetary contract usd-v1'
        USING ERRCODE = '22023';
    END IF;
    v_line_key := v_charge ->> 'line_key';
    v_charge_type := v_charge ->> 'charge_type';
    v_description := NULLIF(btrim(v_charge ->> 'description'), '');
    v_amount_status := v_charge ->> 'amount_status';
    v_calculation_method := v_charge ->> 'calculation_method';
    v_included_in_line_key := NULLIF(v_charge ->> 'included_in_line_key', '');
    v_contingent_trigger := NULLIF(btrim(v_charge ->> 'contingent_trigger'), '');
    IF v_line_key IS NULL OR v_line_key !~ '^[a-z0-9][a-z0-9_-]{0,63}$'
       OR v_charge_type IS NULL OR v_charge_type NOT IN (
         'delivery', 'pickup', 'freight', 'mobilization', 'demobilization',
         'transportation_surcharge', 'environmental', 'fuel',
         'rental_protection', 'setup_teardown', 'labor_technician',
         'cleaning', 'consumables', 'tax', 'discount', 'other'
       )
       OR v_description IS NULL OR length(v_description) > 500
       OR v_amount_status IS NULL OR v_amount_status NOT IN (
         'priced', 'included', 'excluded', 'tbd', 'contingent', 'not_applicable'
       )
       OR v_calculation_method IS NULL
       OR v_calculation_method NOT IN ('fixed', 'percentage', 'vendor_stated', 'incomplete') THEN
      RAISE EXCEPTION 'invalid charge line contract' USING ERRCODE = '22023';
    END IF;
    IF v_amount_status = 'included' AND v_included_in_line_key IS NULL THEN
      RAISE EXCEPTION 'included charge lines require included_in_line_key'
        USING ERRCODE = '22023';
    END IF;
    IF v_amount_status = 'included' AND NOT EXISTS (
      SELECT 1 FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS terms(term_value)
      WHERE term_value ->> 'line_key' = v_included_in_line_key
    ) THEN
      RAISE EXCEPTION 'included charge line must reference an exact rate line'
        USING ERRCODE = '22023';
    END IF;
    IF v_amount_status = 'contingent' AND v_contingent_trigger IS NULL THEN
      RAISE EXCEPTION 'contingent charge lines require a trigger and calculation basis'
        USING ERRCODE = '22023';
    END IF;
    v_line_amount := NULL;
    v_percentage_rate := NULL;
    v_percentage_base_ids := NULL;
    IF v_amount_status = 'contingent' AND v_calculation_method <> 'incomplete' THEN
      RAISE EXCEPTION 'contingent charge lines require vendor-stated calculation terms'
        USING ERRCODE = '22023';
    END IF;
    IF v_amount_status = 'priced'
       AND v_calculation_method NOT IN ('fixed', 'percentage', 'vendor_stated') THEN
      RAISE EXCEPTION 'priced charges require fixed, percentage, or vendor_stated calculation'
        USING ERRCODE = '22023';
    END IF;
    IF v_amount_status NOT IN ('priced', 'contingent')
       AND v_calculation_method <> 'incomplete' THEN
      RAISE EXCEPTION 'unpriced charge lines require incomplete calculation_method'
        USING ERRCODE = '22023';
    END IF;
    IF v_calculation_method = 'percentage'
       AND v_amount_status IN ('priced', 'contingent') THEN
      v_percentage_rate := private.contract_decimal(
        v_charge ->> 'percentage_rate', 6, v_line_key || '.percentage_rate', true
      )::numeric(9, 6);
      IF jsonb_typeof(v_charge -> 'percentage_base_line_ids') <> 'array'
         OR jsonb_array_length(v_charge -> 'percentage_base_line_ids') = 0 THEN
        RAISE EXCEPTION 'percentage charges require explicit base line ids'
          USING ERRCODE = '22023';
      END IF;
      SELECT array_agg(DISTINCT value ORDER BY value), count(DISTINCT value)
      INTO v_percentage_base_ids, v_base_match_count
      FROM jsonb_array_elements_text(v_charge -> 'percentage_base_line_ids');
      SELECT count(DISTINCT term_value ->> 'line_key')
      INTO v_base_match_count
      FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS terms(term_value)
      WHERE term_value ->> 'line_key' = ANY(v_percentage_base_ids)
        AND term_value ->> 'amount_status' = 'priced';
      IF v_base_match_count <> cardinality(v_percentage_base_ids) THEN
        RAISE EXCEPTION 'every percentage base line id must resolve to one priced rate term'
          USING ERRCODE = '22023';
      END IF;
    END IF;
    IF v_amount_status = 'priced' THEN
      IF v_calculation_method IN ('fixed', 'vendor_stated') THEN
        v_line_amount := private.contract_decimal(
          v_charge ->> 'amount', 2, v_line_key || '.amount', true
        )::numeric(20, 2);
        IF v_calculation_method = 'vendor_stated' THEN
          v_total_method := 'vendor_stated';
        END IF;
      ELSIF v_calculation_method = 'percentage' THEN
        SELECT COALESCE(sum(
          CASE
            WHEN term_value ->> 'calculation_method' = 'deterministic' THEN round(
              private.contract_decimal(term_value ->> 'unit_rate', 4, 'percentage base unit_rate', true)
              * CASE WHEN term_value ->> 'rate_scope' = 'per_equipment_item'
                  THEN private.contract_decimal(term_value ->> 'equipment_quantity', 4, 'percentage base equipment_quantity', false)
                  ELSE 1
                END
              * greatest(
                  private.contract_decimal(term_value ->> 'rental_period_quantity', 4, 'percentage base rental_period_quantity', false),
                  CASE WHEN term_value ? 'minimum_billable_quantity'
                    THEN private.contract_decimal(term_value ->> 'minimum_billable_quantity', 4, 'percentage base minimum_billable_quantity', false)
                    ELSE private.contract_decimal(term_value ->> 'rental_period_quantity', 4, 'percentage base rental_period_quantity', false)
                  END
                ),
              2
            )
            WHEN term_value ->> 'calculation_method' = 'vendor_stated' THEN
              private.contract_decimal(term_value ->> 'line_amount', 2, 'percentage base line_amount', true)
            ELSE NULL
          END
        ), 0)
        INTO v_base_total
        FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS terms(term_value)
        WHERE term_value ->> 'line_key' = ANY(v_percentage_base_ids)
          AND term_value ->> 'amount_status' = 'priced';
        IF v_base_total <= 0 THEN
          RAISE EXCEPTION 'percentage charge base lines must resolve to priced rate terms'
            USING ERRCODE = '22023';
        END IF;
        v_line_amount := round(v_base_total * v_percentage_rate / 100, 2);
      ELSE
        RAISE EXCEPTION 'priced charges require fixed, percentage, or vendor_stated calculation'
          USING ERRCODE = '22023';
      END IF;
      IF v_charge_type = 'discount' THEN
        v_line_amount := -v_line_amount;
      END IF;
      v_calculated_total := v_calculated_total + v_line_amount;
    ELSIF v_amount_status IN ('tbd', 'excluded') THEN
      v_pricing_state := CASE
        WHEN v_amount_status = 'tbd' THEN 'incomplete'
        WHEN v_pricing_state <> 'incomplete' THEN 'requires_acknowledgment'
        ELSE v_pricing_state
      END;
      v_total_method := 'incomplete';
    END IF;
  END LOOP;

  IF v_tax_status = 'included' AND NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) AS charges(charge_value)
    WHERE charge_value ->> 'charge_type' = 'tax'
      AND charge_value ->> 'amount_status' IN ('priced', 'included')
  ) THEN
    RAISE EXCEPTION 'tax_status included requires an explicit tax charge line'
      USING ERRCODE = '22023';
  END IF;
  IF v_tax_status = 'not_calculated' AND EXISTS (
    SELECT 1
    FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) AS charges(charge_value)
    WHERE charge_value ->> 'charge_type' = 'tax'
      AND charge_value ->> 'amount_status' = 'priced'
  ) THEN
    RAISE EXCEPTION 'priced tax lines require tax_status exclusive or included'
      USING ERRCODE = '22023';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS rates(rate_value)
    WHERE rate_value ->> 'amount_status' = 'priced'
  ) THEN
    v_pricing_state := 'incomplete';
  END IF;

  IF v_pricing_state <> 'acceptance_ready' THEN
    v_total_method := 'incomplete';
  ELSIF v_vendor_stated_total IS NOT NULL THEN
    v_total_method := 'vendor_stated';
  ELSIF v_total_method = 'vendor_stated' THEN
    v_total_method := 'incomplete';
    v_pricing_state := 'incomplete';
  END IF;
  IF v_total_method <> 'deterministic' THEN
    v_calculated_total := NULL;
  END IF;

  SELECT private.contract_decimal(rate_value ->> 'unit_rate', 4, 'legacy daily_rate', true)
  INTO v_daily_rate
  FROM jsonb_array_elements(p_pricing -> 'rate_terms') AS rates(rate_value)
  WHERE rate_value ->> 'rate_basis' = 'per_day'
    AND rate_value ->> 'amount_status' = 'priced'
  ORDER BY rate_value ->> 'line_key'
  LIMIT 1;
  SELECT private.contract_decimal(charge_value ->> 'amount', 2, 'legacy delivery_fee', true)
  INTO v_delivery_fee
  FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) AS charges(charge_value)
  WHERE charge_value ->> 'charge_type' = 'delivery'
    AND charge_value ->> 'amount_status' = 'priced'
    AND charge_value ->> 'calculation_method' IN ('fixed', 'vendor_stated')
  ORDER BY charge_value ->> 'line_key'
  LIMIT 1;
  SELECT private.contract_decimal(charge_value ->> 'amount', 2, 'legacy mobilization_fee', true)
  INTO v_mobilization_fee
  FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb)) AS charges(charge_value)
  WHERE charge_value ->> 'charge_type' = 'mobilization'
    AND charge_value ->> 'amount_status' = 'priced'
    AND charge_value ->> 'calculation_method' IN ('fixed', 'vendor_stated')
  ORDER BY charge_value ->> 'line_key'
  LIMIT 1;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id := v_correlation_id,
    p_entity_type := 'vendor_quote_response',
    p_entity_id := v_quote_id,
    p_event_type := CASE WHEN v_version = 1 THEN 'vendor_quote.submitted' ELSE 'vendor_quote.revised' END,
    p_event_category := 'rfq',
    p_actor_id := v_actor_id,
    p_actor_role := v_actor_role,
    p_actor_type := 'user',
    p_new_value := jsonb_build_object(
      'quote_id', v_quote_id,
      'quote_version', v_version,
      'currency_code', 'USD',
      'pricing_state', v_pricing_state,
      'calculation_policy_version', 'allrentz-usd-1',
      'tax_exemption_claimed', v_tax_exemption_claimed,
      'tax_determination_status', 'not_determined'
    ),
    p_reason := CASE WHEN v_version = 1 THEN 'Vendor quote submitted' ELSE 'Vendor quote revision submitted' END,
    p_source := 'vendor_action',
    p_is_simulated := v_rfq.is_simulated,
    p_related_rfq_id := p_rfq_id,
    p_related_vendor_organization_id := p_vendor_organization_id,
    p_metadata := jsonb_build_object(
      'monetary_contract_version', 'usd-v1',
      'tax_status', v_tax_status,
      'tax_exemption_claimed', v_tax_exemption_claimed,
      'tax_determination_status', 'not_determined',
      'total_calculation_method', v_total_method
    )
  );

  INSERT INTO public.vendor_quote_responses (
    id, rfq_id, vendor_organization_id, submitted_by, version, status,
    daily_rate, delivery_fee, mobilization_fee, available_start_date,
    equipment_substitution, substitution_notes, compliance_confirmed,
    compliance_notes, vendor_notes, submitted_at, is_simulated,
    monetary_contract_version, currency_code, pricing_state,
    total_calculation_method, calculation_policy_version, tax_status,
    tax_exemption_claimed, tax_determination_status,
    vendor_stated_total, calculated_total, pricing_payload, idempotency_key,
    submission_correlation_id, submission_audit_event_id
  ) VALUES (
    v_quote_id, p_rfq_id, p_vendor_organization_id, v_actor_id, v_version, v_quote_status,
    v_daily_rate, v_delivery_fee, v_mobilization_fee, p_available_start_date,
    COALESCE(p_equipment_substitution, false),
    NULLIF(btrim(COALESCE(p_substitution_notes, '')), ''),
    COALESCE(p_compliance_confirmed, false), COALESCE(p_compliance_notes, ARRAY[]::text[]),
    NULLIF(btrim(COALESCE(p_vendor_notes, '')), ''), now(), v_rfq.is_simulated,
    'usd-v1', 'USD', v_pricing_state, v_total_method, 'allrentz-usd-1', v_tax_status,
    v_tax_exemption_claimed, 'not_determined',
    v_vendor_stated_total, v_calculated_total, p_pricing, p_idempotency_key,
    v_correlation_id, v_audit_event_id
  );

  FOR v_rate IN SELECT value FROM jsonb_array_elements(p_pricing -> 'rate_terms')
  LOOP
    v_line_key := v_rate ->> 'line_key';
    v_rate_basis := v_rate ->> 'rate_basis';
    v_rate_scope := v_rate ->> 'rate_scope';
    v_amount_status := v_rate ->> 'amount_status';
    v_calculation_method := v_rate ->> 'calculation_method';
    v_period_quantity_source := v_rate ->> 'period_quantity_source';
    v_calendar_timezone := NULLIF(v_rate ->> 'calendar_timezone', '');
    v_included_usage_unit := NULLIF(btrim(v_rate ->> 'included_usage_unit'), '');
    v_proration_policy := v_rate ->> 'proration_policy';
    v_rental_period_definition := btrim(v_rate ->> 'rental_period_definition');
    v_vendor_calculation_terms := btrim(v_rate ->> 'vendor_calculation_terms');
    v_equipment_quantity := private.contract_decimal(v_rate ->> 'equipment_quantity', 4, v_line_key || '.equipment_quantity', false);
    v_period_quantity := private.contract_decimal(v_rate ->> 'rental_period_quantity', 4, v_line_key || '.rental_period_quantity', false);
    v_unit_rate := NULL;
    v_line_amount := NULL;
    v_minimum_billable_quantity := NULL;
    v_included_usage_quantity := NULL;
    v_overtime_rate := NULL;
    v_overtime_multiplier := NULL;
    IF v_rate ? 'minimum_billable_quantity' THEN
      v_minimum_billable_quantity := private.contract_decimal(
        v_rate ->> 'minimum_billable_quantity', 4,
        v_line_key || '.minimum_billable_quantity', false
      );
    END IF;
    IF v_rate ? 'included_usage_quantity' THEN
      v_included_usage_quantity := private.contract_decimal(v_rate ->> 'included_usage_quantity', 4, v_line_key || '.included_usage_quantity', false);
    END IF;
    IF v_rate ? 'overtime_rate' THEN
      v_overtime_rate := private.contract_decimal(v_rate ->> 'overtime_rate', 4, v_line_key || '.overtime_rate', false);
    END IF;
    IF v_rate ? 'overtime_multiplier' THEN
      v_overtime_multiplier := private.contract_decimal(v_rate ->> 'overtime_multiplier', 6, v_line_key || '.overtime_multiplier', false);
    END IF;
    IF v_amount_status = 'priced' THEN
      v_unit_rate := private.contract_decimal(v_rate ->> 'unit_rate', 4, v_line_key || '.unit_rate', true);
      v_line_amount := CASE
        WHEN v_calculation_method = 'deterministic' THEN round(
          v_unit_rate * CASE WHEN v_rate_scope = 'per_equipment_item' THEN v_equipment_quantity ELSE 1 END
          * greatest(v_period_quantity, COALESCE(v_minimum_billable_quantity, v_period_quantity)),
          2
        )
        ELSE private.contract_decimal(v_rate ->> 'line_amount', 2, v_line_key || '.line_amount', true)
      END;
    END IF;
    INSERT INTO public.vendor_quote_rate_terms (
      quote_id, line_key, rate_basis, rate_scope, equipment_quantity, rental_period_quantity,
      period_quantity_source, minimum_billable_quantity, calendar_timezone,
      included_usage_quantity, included_usage_unit, overtime_rate, overtime_multiplier,
      proration_policy, rental_period_definition, vendor_calculation_terms,
      unit_rate, amount_status, calculation_method, line_amount
    ) VALUES (
      v_quote_id, v_line_key, v_rate_basis, v_rate_scope, v_equipment_quantity, v_period_quantity,
      v_period_quantity_source, v_minimum_billable_quantity, v_calendar_timezone,
      v_included_usage_quantity, v_included_usage_unit, v_overtime_rate, v_overtime_multiplier,
      v_proration_policy, v_rental_period_definition, v_vendor_calculation_terms,
      v_unit_rate, v_amount_status, v_calculation_method, v_line_amount
    );
  END LOOP;

  FOR v_charge IN
    SELECT value FROM jsonb_array_elements(COALESCE(p_pricing -> 'charge_lines', '[]'::jsonb))
  LOOP
    v_line_key := v_charge ->> 'line_key';
    v_charge_type := v_charge ->> 'charge_type';
    v_description := btrim(v_charge ->> 'description');
    v_amount_status := v_charge ->> 'amount_status';
    v_calculation_method := v_charge ->> 'calculation_method';
    v_included_in_line_key := NULLIF(v_charge ->> 'included_in_line_key', '');
    v_contingent_trigger := NULLIF(btrim(v_charge ->> 'contingent_trigger'), '');
    v_line_amount := NULL;
    v_percentage_rate := NULL;
    v_percentage_base_ids := NULL;
    IF v_calculation_method = 'percentage'
       AND v_amount_status IN ('priced', 'contingent') THEN
      v_percentage_rate := private.contract_decimal(
        v_charge ->> 'percentage_rate', 6, v_line_key || '.percentage_rate', true
      );
      SELECT array_agg(DISTINCT value ORDER BY value) INTO v_percentage_base_ids
      FROM jsonb_array_elements_text(v_charge -> 'percentage_base_line_ids');
    END IF;
    IF v_amount_status = 'priced' THEN
      IF v_calculation_method IN ('fixed', 'vendor_stated') THEN
        v_line_amount := private.contract_decimal(v_charge ->> 'amount', 2, v_line_key || '.amount', true);
      ELSE
        SELECT COALESCE(sum(line_amount), 0) INTO v_base_total
        FROM public.vendor_quote_rate_terms
        WHERE quote_id = v_quote_id AND line_key = ANY(v_percentage_base_ids);
        v_line_amount := round(v_base_total * v_percentage_rate / 100, 2);
      END IF;
      IF v_charge_type = 'discount' THEN v_line_amount := -v_line_amount; END IF;
    END IF;
    INSERT INTO public.vendor_quote_charge_lines (
      quote_id, line_key, charge_type, description, amount_status,
      calculation_method, amount, percentage_rate, percentage_base_line_ids,
      included_in_line_key, contingent_trigger
    ) VALUES (
      v_quote_id, v_line_key, v_charge_type, v_description, v_amount_status,
      v_calculation_method, v_line_amount, v_percentage_rate, v_percentage_base_ids,
      v_included_in_line_key, v_contingent_trigger
    );
  END LOOP;

  IF v_version = 1 THEN
    v_transition_correlation_id := public.transition_rfq_status(
      p_rfq_id := p_rfq_id,
      p_new_status := 'vendor_quote_received'::public.app_rfq_status,
      p_actor_id := v_actor_id,
      p_actor_role := v_actor_role,
      p_reason := 'Vendor quote submitted',
      p_source := 'vendor_action',
      p_is_simulated := v_rfq.is_simulated,
      p_vqr_id := NULL
    );
  END IF;

  RETURN QUERY SELECT v_quote_id, v_version, v_pricing_state, 'USD'::text,
    v_correlation_id, false;
END;
$$;

COMMENT ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, uuid, jsonb, date, boolean, text, boolean, text[], text
) IS 'Submits or idempotently replays an immutable USD quote revision using exact decimal strings and server-derived totals.';

REVOKE EXECUTE ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, uuid, jsonb, date, boolean, text, boolean, text[], text
) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, uuid, jsonb, date, boolean, text, boolean, text[], text
) TO authenticated;

CREATE OR REPLACE FUNCTION private.enforce_governed_quote_revision()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF OLD.monetary_contract_version IS NOT NULL AND (
    NEW.rfq_id IS DISTINCT FROM OLD.rfq_id
    OR NEW.vendor_organization_id IS DISTINCT FROM OLD.vendor_organization_id
    OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
    OR NEW.version IS DISTINCT FROM OLD.version
    OR NEW.daily_rate IS DISTINCT FROM OLD.daily_rate
    OR NEW.delivery_fee IS DISTINCT FROM OLD.delivery_fee
    OR NEW.mobilization_fee IS DISTINCT FROM OLD.mobilization_fee
    OR NEW.available_start_date IS DISTINCT FROM OLD.available_start_date
    OR NEW.equipment_substitution IS DISTINCT FROM OLD.equipment_substitution
    OR NEW.substitution_notes IS DISTINCT FROM OLD.substitution_notes
    OR NEW.compliance_confirmed IS DISTINCT FROM OLD.compliance_confirmed
    OR NEW.compliance_notes IS DISTINCT FROM OLD.compliance_notes
    OR NEW.vendor_notes IS DISTINCT FROM OLD.vendor_notes
    OR NEW.is_simulated IS DISTINCT FROM OLD.is_simulated
    OR NEW.monetary_contract_version IS DISTINCT FROM OLD.monetary_contract_version
    OR NEW.currency_code IS DISTINCT FROM OLD.currency_code
    OR NEW.pricing_state IS DISTINCT FROM OLD.pricing_state
    OR NEW.total_calculation_method IS DISTINCT FROM OLD.total_calculation_method
    OR NEW.calculation_policy_version IS DISTINCT FROM OLD.calculation_policy_version
    OR NEW.tax_status IS DISTINCT FROM OLD.tax_status
    OR NEW.tax_exemption_claimed IS DISTINCT FROM OLD.tax_exemption_claimed
    OR NEW.tax_determination_status IS DISTINCT FROM OLD.tax_determination_status
    OR NEW.vendor_stated_total IS DISTINCT FROM OLD.vendor_stated_total
    OR NEW.calculated_total IS DISTINCT FROM OLD.calculated_total
    OR NEW.pricing_payload IS DISTINCT FROM OLD.pricing_payload
    OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
    OR NEW.submission_correlation_id IS DISTINCT FROM OLD.submission_correlation_id
    OR NEW.submission_audit_event_id IS DISTINCT FROM OLD.submission_audit_event_id
  ) THEN
    RAISE EXCEPTION 'Submitted quote commercial terms are immutable; submit a new revision'
      USING ERRCODE = '55000';
  END IF;

  IF NEW.status = 'accepted' AND OLD.status IS DISTINCT FROM NEW.status THEN
    IF OLD.status NOT IN ('submitted', 'revised') THEN
      RAISE EXCEPTION 'Only a submitted or revised quote can be accepted'
        USING ERRCODE = '22023';
    END IF;
    IF OLD.monetary_contract_version <> 'usd-v1'
       OR OLD.currency_code <> 'USD'
       OR OLD.calculation_policy_version <> 'allrentz-usd-1'
       OR OLD.pricing_state <> 'acceptance_ready'
       OR OLD.tax_status IS NULL
       OR (OLD.total_calculation_method = 'deterministic' AND OLD.calculated_total IS NULL)
       OR (OLD.total_calculation_method = 'vendor_stated' AND OLD.vendor_stated_total IS NULL)
       OR OLD.total_calculation_method NOT IN ('deterministic', 'vendor_stated') THEN
      RAISE EXCEPTION 'Quote is not complete under monetary contract usd-v1'
        USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
      SELECT 1 FROM public.vendor_quote_rate_terms AS term
      WHERE term.quote_id = OLD.id AND term.amount_status = 'priced'
    ) THEN
      RAISE EXCEPTION 'Quote requires at least one priced rate term'
        USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.vendor_quote_rate_terms AS term
      WHERE term.quote_id = OLD.id AND term.amount_status IN ('tbd', 'excluded')
    ) OR EXISTS (
      SELECT 1 FROM public.vendor_quote_charge_lines AS charge
      WHERE charge.quote_id = OLD.id AND charge.amount_status IN ('tbd', 'excluded')
    ) THEN
      RAISE EXCEPTION 'Quote has unresolved or unacknowledged monetary lines'
        USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.vendor_quote_responses AS newer
      WHERE newer.rfq_id = OLD.rfq_id
        AND newer.vendor_organization_id = OLD.vendor_organization_id
        AND newer.version > OLD.version
        AND newer.status IN ('submitted', 'revised')
    ) THEN
      RAISE EXCEPTION 'A superseded quote revision cannot be accepted'
        USING ERRCODE = '22023';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.enforce_governed_quote_revision()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER vendor_quote_revision_contract
BEFORE UPDATE ON public.vendor_quote_responses
FOR EACH ROW EXECUTE FUNCTION private.enforce_governed_quote_revision();

CREATE TABLE public.rental_orders (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_reference             text NOT NULL UNIQUE CHECK (
                                order_reference ~ '^ARO-[0-9]{8}-[0-9A-F]{10}$'
                              ),
  rfq_id                      uuid NOT NULL UNIQUE
                              REFERENCES public.rental_requests ON DELETE RESTRICT,
  accepted_quote_id           uuid NOT NULL UNIQUE
                              REFERENCES public.vendor_quote_responses ON DELETE RESTRICT,
  customer_user_id            uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  customer_organization_id    uuid REFERENCES public.organizations ON DELETE RESTRICT,
  vendor_organization_id      uuid NOT NULL REFERENCES public.organizations ON DELETE RESTRICT,
  currency_code               text NOT NULL CHECK (currency_code = 'USD'),
  calculation_policy_version  text NOT NULL CHECK (
                                calculation_policy_version = 'allrentz-usd-1'
                              ),
  current_version_number      integer NOT NULL DEFAULT 1 CHECK (current_version_number > 0),
  customer_organization_state text NOT NULL CHECK (
                                customer_organization_state IN ('recorded', 'unknown')
                              ),
  accepted_at                 timestamptz NOT NULL,
  created_by                  uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  correlation_id              uuid NOT NULL UNIQUE,
  audit_event_id              uuid NOT NULL UNIQUE
                              REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated                boolean NOT NULL DEFAULT false,
  created_at                  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, is_simulated),
  CHECK (
    (customer_organization_id IS NOT NULL AND customer_organization_state = 'recorded')
    OR (customer_organization_id IS NULL AND customer_organization_state = 'unknown')
  )
);

CREATE TABLE public.rental_order_versions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id          uuid NOT NULL,
  version_number           integer NOT NULL CHECK (version_number > 0),
  snapshot_kind            text NOT NULL DEFAULT 'accepted_quote'
                           CHECK (snapshot_kind = 'accepted_quote'),
  source_accepted_quote_id uuid NOT NULL UNIQUE
                           REFERENCES public.vendor_quote_responses ON DELETE RESTRICT,
  snapshot_payload         jsonb NOT NULL CHECK (
                             snapshot_payload ->> 'object_scope' = 'rfq'
                             AND snapshot_payload ->> 'schema_version' = '2'
                             AND snapshot_payload #>> '{accepted_quote,currency_code}' = 'USD'
                             AND snapshot_payload #>> '{accepted_quote,calculation_policy_version}' = 'allrentz-usd-1'
                           ),
  approved_by              uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  effective_at             timestamptz NOT NULL,
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL
                           REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_order_id, version_number),
  UNIQUE (rental_order_id, correlation_id),
  FOREIGN KEY (rental_order_id, is_simulated)
    REFERENCES public.rental_orders (id, is_simulated)
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_order_versions ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_orders
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.rental_order_versions
  FROM PUBLIC, anon, authenticated, service_role;

GRANT SELECT ON TABLE public.rental_orders TO authenticated, service_role;
GRANT SELECT ON TABLE public.rental_order_versions TO authenticated, service_role;

CREATE POLICY rental_orders_select_parties
  ON public.rental_orders
  FOR SELECT TO authenticated
  USING (
    public.is_demo_actor((SELECT auth.uid())) = is_simulated
    AND (
      customer_user_id = (SELECT auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.organization_memberships AS membership
        WHERE membership.organization_id = rental_orders.customer_organization_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.is_simulated = rental_orders.is_simulated
          AND membership.archived_at IS NULL
      )
      OR EXISTS (
        SELECT 1
        FROM public.organization_memberships AS membership
        WHERE membership.organization_id = rental_orders.vendor_organization_id
          AND membership.user_id = (SELECT auth.uid())
          AND membership.is_simulated = rental_orders.is_simulated
          AND membership.archived_at IS NULL
      )
    )
  );

CREATE POLICY rental_orders_service_read
  ON public.rental_orders
  FOR SELECT TO service_role
  USING (true);

CREATE POLICY rental_order_versions_select_parties
  ON public.rental_order_versions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.rental_orders AS rental_order
      WHERE rental_order.id = rental_order_versions.rental_order_id
        AND rental_order.is_simulated = rental_order_versions.is_simulated
    )
  );

CREATE POLICY rental_order_versions_service_read
  ON public.rental_order_versions
  FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_rental_orders_customer_user
  ON public.rental_orders (customer_user_id, created_at DESC);
CREATE INDEX idx_rental_orders_customer_organization
  ON public.rental_orders (customer_organization_id, created_at DESC)
  WHERE customer_organization_id IS NOT NULL;
CREATE INDEX idx_rental_orders_vendor_organization
  ON public.rental_orders (vendor_organization_id, created_at DESC);
CREATE INDEX idx_rental_orders_simulation
  ON public.rental_orders (is_simulated, created_at DESC);
CREATE INDEX idx_rental_order_versions_order
  ON public.rental_order_versions (rental_order_id, version_number DESC);

CREATE OR REPLACE FUNCTION private.prevent_rental_order_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; append a governed Rental Order version instead',
    TG_TABLE_NAME;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_rental_order_record_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER rental_orders_immutable
BEFORE UPDATE OR DELETE ON public.rental_orders
FOR EACH ROW EXECUTE FUNCTION private.prevent_rental_order_record_mutation();

CREATE TRIGGER rental_order_versions_immutable
BEFORE UPDATE OR DELETE ON public.rental_order_versions
FOR EACH ROW EXECUTE FUNCTION private.prevent_rental_order_record_mutation();

CREATE OR REPLACE FUNCTION private.materialize_rental_order_from_accepted_quote(
  p_accepted_quote_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_quote          record;
  v_rfq            record;
  v_existing       record;
  v_order_id       uuid := gen_random_uuid();
  v_version_id     uuid := gen_random_uuid();
  v_correlation_id uuid;
  v_audit_event_id uuid;
  v_order_reference text;
  v_snapshot       jsonb;
  v_invalid_count  integer;
  v_recalculated_total numeric(20, 2);
  v_acceptor_is_demo boolean;
BEGIN
  SELECT
    quote.id,
    quote.rfq_id,
    quote.vendor_organization_id,
    quote.equipment_id,
    quote.version,
    quote.status,
    quote.monetary_contract_version,
    quote.currency_code,
    quote.pricing_state,
    quote.total_calculation_method,
    quote.calculation_policy_version,
    quote.tax_status,
    quote.tax_exemption_claimed,
    quote.tax_determination_status,
    quote.vendor_stated_total,
    quote.calculated_total,
    quote.pricing_payload,
    quote.submission_correlation_id,
    quote.submission_audit_event_id,
    quote.available_start_date,
    quote.equipment_substitution,
    quote.substitution_notes,
    quote.compliance_confirmed,
    quote.compliance_notes,
    quote.accepted_by,
    quote.accepted_at,
    quote.is_simulated
  INTO v_quote
  FROM public.vendor_quote_responses AS quote
  WHERE quote.id = p_accepted_quote_id
  FOR UPDATE;

  IF NOT FOUND OR v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'Rental Order requires an accepted quote: %', p_accepted_quote_id;
  END IF;
  IF v_quote.accepted_by IS NULL OR v_quote.accepted_at IS NULL THEN
    RAISE EXCEPTION 'Accepted quote % lacks its authoritative actor or timestamp', p_accepted_quote_id;
  END IF;
  IF v_quote.monetary_contract_version <> 'usd-v1'
     OR v_quote.currency_code <> 'USD'
     OR v_quote.calculation_policy_version <> 'allrentz-usd-1'
     OR v_quote.pricing_state <> 'acceptance_ready'
     OR v_quote.tax_status IS NULL
     OR v_quote.tax_exemption_claimed IS NULL
     OR v_quote.tax_determination_status IS NULL
     OR v_quote.submission_correlation_id IS NULL
     OR v_quote.submission_audit_event_id IS NULL THEN
    RAISE EXCEPTION 'Accepted quote % lacks a complete governed monetary contract',
      p_accepted_quote_id;
  END IF;

  SELECT count(*)::integer
  INTO v_invalid_count
  FROM public.vendor_quote_rate_terms AS term
  WHERE term.quote_id = v_quote.id
    AND term.calculation_method = 'deterministic'
    AND term.line_amount IS DISTINCT FROM round(
      term.unit_rate * CASE WHEN term.rate_scope = 'per_equipment_item' THEN term.equipment_quantity ELSE 1 END
      * greatest(
          term.rental_period_quantity,
          COALESCE(term.minimum_billable_quantity, term.rental_period_quantity)
        ),
      2
    );
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Accepted quote % has a non-reproducible deterministic rate line',
      p_accepted_quote_id;
  END IF;

  SELECT count(*)::integer
  INTO v_invalid_count
  FROM public.vendor_quote_charge_lines AS charge
  WHERE charge.quote_id = v_quote.id
    AND charge.calculation_method = 'percentage'
    AND charge.amount_status = 'priced'
    AND charge.amount IS DISTINCT FROM (
      CASE WHEN charge.charge_type = 'discount' THEN -1 ELSE 1 END
      * round(
          COALESCE((
            SELECT sum(rate.line_amount)
            FROM public.vendor_quote_rate_terms AS rate
            WHERE rate.quote_id = charge.quote_id
              AND rate.line_key = ANY(charge.percentage_base_line_ids)
              AND rate.amount_status = 'priced'
          ), 0) * charge.percentage_rate / 100,
          2
        )
    );
  IF v_invalid_count > 0 THEN
    RAISE EXCEPTION 'Accepted quote % has a non-reproducible percentage charge line',
      p_accepted_quote_id;
  END IF;

  IF v_quote.total_calculation_method = 'deterministic' THEN
    SELECT (
      COALESCE((
        SELECT sum(term.line_amount)
        FROM public.vendor_quote_rate_terms AS term
        WHERE term.quote_id = v_quote.id AND term.amount_status = 'priced'
      ), 0)
      + COALESCE((
        SELECT sum(charge.amount)
        FROM public.vendor_quote_charge_lines AS charge
        WHERE charge.quote_id = v_quote.id AND charge.amount_status = 'priced'
      ), 0)
    )::numeric(20, 2)
    INTO v_recalculated_total;
    IF v_recalculated_total IS DISTINCT FROM v_quote.calculated_total THEN
      RAISE EXCEPTION 'Accepted quote % total does not reproduce from finalized lines',
        p_accepted_quote_id;
    END IF;
  ELSIF v_quote.total_calculation_method = 'vendor_stated'
        AND v_quote.vendor_stated_total IS NULL THEN
    RAISE EXCEPTION 'Accepted quote % lacks its vendor-stated total', p_accepted_quote_id;
  END IF;

  SELECT
    request.id,
    request.customer_id,
    request.customer_organization_id,
    request.operational_status,
    request.is_simulated
  INTO v_rfq
  FROM public.rental_requests AS request
  WHERE request.id = v_quote.rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Accepted quote % has no RFQ', p_accepted_quote_id;
  END IF;
  IF v_rfq.operational_status NOT IN (
    'quote_accepted'::public.app_rfq_status,
    'vendor_confirmed'::public.app_rfq_status,
    'mobilizing'::public.app_rfq_status,
    'in_transit'::public.app_rfq_status,
    'on_rent'::public.app_rfq_status,
    'rental_extended'::public.app_rfq_status,
    'off_rent_requested'::public.app_rfq_status,
    'demobilizing'::public.app_rfq_status,
    'off_rent'::public.app_rfq_status,
    'completed'::public.app_rfq_status,
    'cancelled'::public.app_rfq_status,
    'rejected'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'Accepted quote % is outside the Rental Order lifecycle boundary',
      p_accepted_quote_id;
  END IF;
  IF v_quote.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Accepted quote simulation scope does not match RFQ %', v_rfq.id;
  END IF;
  SELECT profile.is_demo
  INTO v_acceptor_is_demo
  FROM public.profiles AS profile
  WHERE profile.id = v_quote.accepted_by;
  IF NOT FOUND OR v_acceptor_is_demo IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Accepted quote actor simulation scope does not match RFQ %', v_rfq.id;
  END IF;

  SELECT status.correlation_id
  INTO v_correlation_id
  FROM public.rfq_operational_status AS status
  WHERE status.rfq_id = v_rfq.id
    AND status.new_status = 'quote_accepted'::public.app_rfq_status
    AND status.transitioned_by = v_quote.accepted_by
    AND status.is_simulated = v_rfq.is_simulated
  ORDER BY status.created_at DESC, status.id DESC
  LIMIT 1;
  IF v_correlation_id IS NULL THEN
    RAISE EXCEPTION 'Accepted quote % lacks its canonical transition correlation',
      p_accepted_quote_id;
  END IF;
  IF v_rfq.customer_organization_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.organizations AS organization
    WHERE organization.id = v_rfq.customer_organization_id
      AND organization.org_type IN ('customer', 'both')
      AND organization.archived_at IS NULL
      AND organization.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'Customer organization boundary does not match RFQ %', v_rfq.id;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations AS organization
    WHERE organization.id = v_quote.vendor_organization_id
      AND organization.org_type IN ('vendor', 'both')
      AND organization.archived_at IS NULL
      AND organization.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'Vendor organization boundary does not match accepted quote %',
      p_accepted_quote_id;
  END IF;

  SELECT id, rfq_id, accepted_quote_id
  INTO v_existing
  FROM public.rental_orders
  WHERE rfq_id = v_rfq.id OR accepted_quote_id = p_accepted_quote_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.rfq_id = v_rfq.id
       AND v_existing.accepted_quote_id = p_accepted_quote_id THEN
      RETURN v_existing.id;
    END IF;
    RAISE EXCEPTION 'Rental Order identity conflict for RFQ % or accepted quote %',
      v_rfq.id, p_accepted_quote_id;
  END IF;

  v_order_reference := 'ARO-'
    || to_char(v_quote.accepted_at AT TIME ZONE 'UTC', 'YYYYMMDD')
    || '-'
    || upper(substr(replace(v_order_id::text, '-', ''), 1, 10));

  v_snapshot := jsonb_build_object(
    'schema_version', 2,
    'object_scope', 'rfq',
    'rfq_id', v_rfq.id,
    'accepted_quote', jsonb_build_object(
      'id', v_quote.id,
      'version', v_quote.version,
      'accepted_at', v_quote.accepted_at,
      'accepted_by', v_quote.accepted_by,
      'vendor_organization_id', v_quote.vendor_organization_id,
      'equipment_id', v_quote.equipment_id,
      'monetary_contract_version', v_quote.monetary_contract_version,
      'currency_code', v_quote.currency_code,
      'pricing_state', v_quote.pricing_state,
      'total_calculation_method', v_quote.total_calculation_method,
      'calculation_policy_version', v_quote.calculation_policy_version,
      'tax_status', v_quote.tax_status,
      'tax_exemption_claimed', v_quote.tax_exemption_claimed,
      'tax_determination_status', v_quote.tax_determination_status,
      'vendor_stated_total', v_quote.vendor_stated_total,
      'calculated_total', v_quote.calculated_total,
      'submission_correlation_id', v_quote.submission_correlation_id,
      'submission_audit_event_id', v_quote.submission_audit_event_id,
      'source_document_authority', 'not_recorded',
      'rate_terms', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'line_key', term.line_key,
          'rate_basis', term.rate_basis,
          'rate_scope', term.rate_scope,
          'equipment_quantity', term.equipment_quantity,
          'rental_period_quantity', term.rental_period_quantity,
          'period_quantity_source', term.period_quantity_source,
          'minimum_billable_quantity', term.minimum_billable_quantity,
          'calendar_timezone', term.calendar_timezone,
          'included_usage_quantity', term.included_usage_quantity,
          'included_usage_unit', term.included_usage_unit,
          'overtime_rate', term.overtime_rate,
          'overtime_multiplier', term.overtime_multiplier,
          'proration_policy', term.proration_policy,
          'rental_period_definition', term.rental_period_definition,
          'vendor_calculation_terms', term.vendor_calculation_terms,
          'unit_rate', term.unit_rate,
          'amount_status', term.amount_status,
          'calculation_method', term.calculation_method,
          'line_amount', term.line_amount
        ) ORDER BY term.line_key)
        FROM public.vendor_quote_rate_terms AS term
        WHERE term.quote_id = v_quote.id
      ), '[]'::jsonb),
      'charge_lines', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'line_key', charge.line_key,
          'charge_type', charge.charge_type,
          'description', charge.description,
          'amount_status', charge.amount_status,
          'calculation_method', charge.calculation_method,
          'amount', charge.amount,
          'percentage_rate', charge.percentage_rate,
          'percentage_base_line_ids', charge.percentage_base_line_ids,
          'included_in_line_key', charge.included_in_line_key,
          'contingent_trigger', charge.contingent_trigger
        ) ORDER BY charge.line_key)
        FROM public.vendor_quote_charge_lines AS charge
        WHERE charge.quote_id = v_quote.id
      ), '[]'::jsonb),
      'available_start_date', v_quote.available_start_date,
      'equipment_substitution', v_quote.equipment_substitution,
      'substitution_notes', v_quote.substitution_notes,
      'compliance_confirmed', v_quote.compliance_confirmed,
      'compliance_notes', v_quote.compliance_notes
    )
  );

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_order',
    p_entity_id                        := v_order_id,
    p_event_type                       := 'rental_order.created',
    p_event_category                   := 'rfq',
    p_actor_id                         := v_quote.accepted_by,
    p_actor_role                       := 'customer_quote_accepter',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'order_reference', v_order_reference,
                                             'rfq_id', v_rfq.id,
                                             'accepted_quote_id', v_quote.id,
                                             'accepted_quote_version', v_quote.version,
                                             'currency_code', v_quote.currency_code,
                                             'calculation_policy_version', v_quote.calculation_policy_version,
                                             'version_number', 1,
                                             'object_scope', 'rfq'
                                           ),
    p_reason                           := 'Created immutable Rental Order version 1 from accepted quote',
    p_source                           := 'system',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := v_rfq.id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_quote.vendor_organization_id,
    p_related_equipment_id             := v_quote.equipment_id,
    p_metadata                         := jsonb_build_object(
                                             'purchase_order_authority', false,
                                             'extension_authority', false,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'closeout_authority', false,
                                             'granular_scope_authority', false,
                                             'accepted_quote_submission_correlation_id', v_quote.submission_correlation_id,
                                             'tax_status', v_quote.tax_status,
                                             'tax_exemption_claimed', v_quote.tax_exemption_claimed,
                                             'tax_determination_status', v_quote.tax_determination_status,
                                             'source_document_authority', 'not_recorded'
                                           )
  );

  INSERT INTO public.rental_orders (
    id, order_reference, rfq_id, accepted_quote_id, customer_user_id,
    customer_organization_id, vendor_organization_id, currency_code,
    calculation_policy_version, current_version_number,
    customer_organization_state, accepted_at, created_by, correlation_id,
    audit_event_id, is_simulated
  ) VALUES (
    v_order_id, v_order_reference, v_rfq.id, v_quote.id, v_rfq.customer_id,
    v_rfq.customer_organization_id, v_quote.vendor_organization_id,
    v_quote.currency_code, v_quote.calculation_policy_version, 1,
    CASE WHEN v_rfq.customer_organization_id IS NULL THEN 'unknown' ELSE 'recorded' END,
    v_quote.accepted_at, v_quote.accepted_by, v_correlation_id,
    v_audit_event_id, v_rfq.is_simulated
  );

  INSERT INTO public.rental_order_versions (
    id, rental_order_id, version_number, snapshot_kind,
    source_accepted_quote_id, snapshot_payload, approved_by, effective_at,
    correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_version_id, v_order_id, 1, 'accepted_quote',
    v_quote.id, v_snapshot, v_quote.accepted_by, v_quote.accepted_at,
    v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN v_order_id;
END;
$$;

REVOKE ALL ON FUNCTION private.materialize_rental_order_from_accepted_quote(uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION private.capture_rental_order_quote_acceptance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM private.materialize_rental_order_from_accepted_quote(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.capture_rental_order_quote_acceptance()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER vendor_quote_acceptance_creates_rental_order
AFTER INSERT OR UPDATE ON public.vendor_quote_responses
FOR EACH ROW EXECUTE FUNCTION private.capture_rental_order_quote_acceptance();

-- Deterministic, idempotent backfill for accepted quotes that predate this
-- object. Any contradictory historical row fails the migration closed so the
-- affected authority can be reviewed before production changes.
DO $$
DECLARE
  v_quote record;
BEGIN
  FOR v_quote IN
    SELECT quote.id
    FROM public.vendor_quote_responses AS quote
    WHERE quote.status = 'accepted'
    ORDER BY quote.accepted_at NULLS LAST, quote.id
  LOOP
    PERFORM private.materialize_rental_order_from_accepted_quote(v_quote.id);
  END LOOP;
END;
$$;
