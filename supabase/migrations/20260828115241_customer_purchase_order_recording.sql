-- Customer-owned external purchase-order recording for a canonical Rental Order.
--
-- This is an immutable customer assertion that an external PO reference was
-- issued. ALLRENTZ does not issue, approve, validate, fund, amend, release,
-- bill, or post the PO. One RFQ-wide record is allowed per Rental Order until a
-- separately governed amendment/change-order authority exists.

CREATE TABLE public.rental_customer_purchase_order_records (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id            uuid NOT NULL UNIQUE,
  rfq_id                     uuid NOT NULL UNIQUE
                             REFERENCES public.rental_requests ON DELETE RESTRICT,
  customer_organization_id   uuid NOT NULL
                             REFERENCES public.organizations ON DELETE RESTRICT,
  vendor_organization_id     uuid NOT NULL
                             REFERENCES public.organizations ON DELETE RESTRICT,
  external_reference         text NOT NULL CHECK (
                               length(btrim(external_reference)) BETWEEN 1 AND 100
                             ),
  customer_stated_issue_date date NOT NULL,
  recorded_by                uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  idempotency_key            text NOT NULL CHECK (
                               length(idempotency_key) BETWEEN 8 AND 200
                             ),
  correlation_id             uuid NOT NULL UNIQUE,
  audit_event_id             uuid NOT NULL UNIQUE
                             REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated               boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (rental_order_id, is_simulated)
    REFERENCES public.rental_orders (id, is_simulated)
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_customer_purchase_order_records ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.rental_customer_purchase_order_records
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT
  ON TABLE public.rental_customer_purchase_order_records
  TO service_role;

CREATE POLICY rental_customer_purchase_order_records_service_read
  ON public.rental_customer_purchase_order_records
  FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_rental_customer_po_customer_organization
  ON public.rental_customer_purchase_order_records (customer_organization_id, created_at DESC);
CREATE INDEX idx_rental_customer_po_vendor_organization
  ON public.rental_customer_purchase_order_records (vendor_organization_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.prevent_customer_purchase_order_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; governed PO amendment authority is not implemented',
    TG_TABLE_NAME;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_customer_purchase_order_record_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER rental_customer_purchase_order_records_immutable
BEFORE UPDATE OR DELETE ON public.rental_customer_purchase_order_records
FOR EACH ROW EXECUTE FUNCTION private.prevent_customer_purchase_order_record_mutation();

CREATE OR REPLACE FUNCTION public.record_rental_customer_purchase_order(
  p_rental_order_id            uuid,
  p_actor_id                   uuid,
  p_external_reference         text,
  p_customer_stated_issue_date date,
  p_idempotency_key            text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order             record;
  v_rfq_status        public.app_rfq_status;
  v_existing          record;
  v_record_id         uuid := gen_random_uuid();
  v_correlation_id    uuid := gen_random_uuid();
  v_audit_event_id    uuid;
  v_actor_is_demo     boolean;
  v_external_reference text := NULLIF(btrim(p_external_reference), '');
  v_idempotency_key   text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Customer purchase-order actor is required';
  END IF;
  IF v_external_reference IS NULL OR length(v_external_reference) > 100 THEN
    RAISE EXCEPTION 'External purchase-order reference must contain 1 to 100 characters';
  END IF;
  IF p_customer_stated_issue_date IS NULL
     OR p_customer_stated_issue_date > current_date THEN
    RAISE EXCEPTION 'Customer-stated purchase-order issue date is required and cannot be future-dated';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Purchase-order idempotency key must contain 8 to 200 characters';
  END IF;

  SELECT profile.is_demo
  INTO v_actor_is_demo
  FROM public.profiles AS profile
  WHERE profile.id = p_actor_id
    AND profile.status = 'active';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active customer profile authority is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT
    rental_order.id,
    rental_order.rfq_id,
    rental_order.customer_organization_id,
    rental_order.customer_organization_state,
    rental_order.vendor_organization_id,
    rental_order.is_simulated
  INTO v_order
  FROM public.rental_orders AS rental_order
  WHERE rental_order.id = p_rental_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental Order not found: %', p_rental_order_id;
  END IF;
  IF v_order.customer_organization_id IS NULL
     OR v_order.customer_organization_state <> 'recorded' THEN
    RAISE EXCEPTION 'Rental Order % has no established customer organization authority',
      p_rental_order_id;
  END IF;
  IF v_actor_is_demo IS DISTINCT FROM v_order.is_simulated THEN
    RAISE EXCEPTION 'Purchase-order actor simulation scope does not match Rental Order %',
      p_rental_order_id;
  END IF;
  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships AS membership
    JOIN public.organizations AS organization
      ON organization.id = membership.organization_id
     AND organization.org_type IN ('customer', 'both')
     AND organization.is_simulated = v_order.is_simulated
     AND organization.archived_at IS NULL
    WHERE membership.organization_id = v_order.customer_organization_id
      AND membership.user_id = p_actor_id
      AND membership.role IN ('owner', 'admin', 'member')
      AND membership.is_simulated = v_order.is_simulated
      AND membership.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Actor % lacks customer purchase-order authority for Rental Order %',
      p_actor_id, p_rental_order_id;
  END IF;

  SELECT request.operational_status
  INTO v_rfq_status
  FROM public.rental_requests AS request
  WHERE request.id = v_order.rfq_id
    AND request.is_simulated = v_order.is_simulated
  FOR KEY SHARE;

  IF NOT FOUND OR v_rfq_status NOT IN (
    'quote_accepted'::public.app_rfq_status,
    'vendor_confirmed'::public.app_rfq_status,
    'mobilizing'::public.app_rfq_status,
    'in_transit'::public.app_rfq_status,
    'on_rent'::public.app_rfq_status,
    'rental_extended'::public.app_rfq_status,
    'off_rent_requested'::public.app_rfq_status,
    'demobilizing'::public.app_rfq_status,
    'off_rent'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'Rental Order % is outside the customer PO-recording lifecycle boundary',
      p_rental_order_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.rental_customer_purchase_order_records AS purchase_order
  WHERE purchase_order.rental_order_id = p_rental_order_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.idempotency_key = v_idempotency_key
       AND v_existing.recorded_by = p_actor_id
       AND v_existing.external_reference = v_external_reference
       AND v_existing.customer_stated_issue_date = p_customer_stated_issue_date THEN
      RETURN jsonb_build_object(
        'rental_order_id', p_rental_order_id,
        'purchase_order_record_id', v_existing.id,
        'external_reference', v_existing.external_reference,
        'customer_stated_issue_date', v_existing.customer_stated_issue_date,
        'record_state', 'recorded',
        'validation_state', 'customer_asserted_not_validated',
        'correlation_id', v_existing.correlation_id,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Customer purchase order is already recorded; amendment authority is not implemented';
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_customer_purchase_order',
    p_entity_id                        := v_record_id,
    p_event_type                       := 'purchase_order.customer_recorded',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer_organization_member',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rental_order_id', p_rental_order_id,
                                             'rfq_id', v_order.rfq_id,
                                             'record_state', 'recorded',
                                             'validation_state', 'customer_asserted_not_validated'
                                           ),
    p_reason                           := 'Customer recorded an externally issued purchase-order reference',
    p_source                           := 'customer_action',
    p_is_simulated                     := v_order.is_simulated,
    p_related_rfq_id                   := v_order.rfq_id,
    p_related_customer_organization_id := v_order.customer_organization_id,
    p_related_vendor_organization_id   := v_order.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'platform_issued', false,
                                             'external_issuance_validated', false,
                                             'release_authority', false,
                                             'billing_authority', false,
                                             'financial_posting_authority', false,
                                             'amendment_authority', false,
                                             'document_sufficiency_authority', false,
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_customer_purchase_order_records (
    id, rental_order_id, rfq_id, customer_organization_id,
    vendor_organization_id, external_reference, customer_stated_issue_date,
    recorded_by, idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_record_id, p_rental_order_id, v_order.rfq_id, v_order.customer_organization_id,
    v_order.vendor_organization_id, v_external_reference, p_customer_stated_issue_date,
    p_actor_id, v_idempotency_key, v_correlation_id, v_audit_event_id,
    v_order.is_simulated
  );

  RETURN jsonb_build_object(
    'rental_order_id', p_rental_order_id,
    'purchase_order_record_id', v_record_id,
    'external_reference', v_external_reference,
    'customer_stated_issue_date', p_customer_stated_issue_date,
    'record_state', 'recorded',
    'validation_state', 'customer_asserted_not_validated',
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_customer_purchase_order(
  uuid, uuid, text, date, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_rental_customer_purchase_order(
  uuid, uuid, text, date, text
) TO service_role;
