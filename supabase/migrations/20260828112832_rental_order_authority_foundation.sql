-- Canonical Rental Order authority foundation.
--
-- A Rental Order is created only when the existing canonical RFQ transition
-- accepts a vendor quote. The order is a durable RFQ-wide identity and version
-- 1 is an immutable snapshot of the accepted quote. This migration does not
-- create purchase-order issuance, extension/change-order approval, billing,
-- custody, closeout, override, or granular rental authority.

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated, service_role;

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
                             AND snapshot_payload ->> 'schema_version' = '1'
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
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_order_reference text;
  v_snapshot       jsonb;
BEGIN
  SELECT
    quote.id,
    quote.rfq_id,
    quote.vendor_organization_id,
    quote.equipment_id,
    quote.version,
    quote.status,
    quote.daily_rate,
    quote.delivery_fee,
    quote.mobilization_fee,
    quote.minimum_rental_days,
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
  IF public.is_demo_actor(v_quote.accepted_by) IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Accepted quote actor simulation scope does not match RFQ %', v_rfq.id;
  END IF;
  IF v_rfq.customer_organization_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.organizations AS organization
    WHERE organization.id = v_rfq.customer_organization_id
      AND organization.org_type IN ('customer', 'both')
      AND organization.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'Customer organization boundary does not match RFQ %', v_rfq.id;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.organizations AS organization
    WHERE organization.id = v_quote.vendor_organization_id
      AND organization.org_type IN ('vendor', 'both')
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
    'schema_version', 1,
    'object_scope', 'rfq',
    'rfq_id', v_rfq.id,
    'accepted_quote', jsonb_build_object(
      'id', v_quote.id,
      'version', v_quote.version,
      'accepted_at', v_quote.accepted_at,
      'accepted_by', v_quote.accepted_by,
      'vendor_organization_id', v_quote.vendor_organization_id,
      'equipment_id', v_quote.equipment_id,
      'daily_rate', v_quote.daily_rate,
      'delivery_fee', v_quote.delivery_fee,
      'mobilization_fee', v_quote.mobilization_fee,
      'minimum_rental_days', v_quote.minimum_rental_days,
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
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_orders (
    id, order_reference, rfq_id, accepted_quote_id, customer_user_id,
    customer_organization_id, vendor_organization_id, current_version_number,
    customer_organization_state, accepted_at, created_by, correlation_id,
    audit_event_id, is_simulated
  ) VALUES (
    v_order_id, v_order_reference, v_rfq.id, v_quote.id, v_rfq.customer_id,
    v_rfq.customer_organization_id, v_quote.vendor_organization_id, 1,
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
