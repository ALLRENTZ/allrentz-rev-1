-- Governed Rental Order end-date change-review intake.
--
-- The accepted Rental Order snapshot does not yet contain an authoritative
-- agreed rental end date. This slice therefore records immutable counterparty
-- requests and exposes review visibility only. It does not accept a change,
-- create a change order/version, mutate RFQ lifecycle state, or affect billing.

CREATE TABLE public.rental_order_change_review_requests (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rental_order_id       uuid NOT NULL,
  rfq_id                uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  request_kind          text NOT NULL DEFAULT 'end_date_change_review'
                        CHECK (request_kind = 'end_date_change_review'),
  requester_party       text NOT NULL CHECK (requester_party IN ('customer', 'vendor')),
  proposed_end_date     date NOT NULL,
  request_reason        text NOT NULL CHECK (
                          length(btrim(request_reason)) BETWEEN 5 AND 4000
                        ),
  requested_by          uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  idempotency_key       text NOT NULL CHECK (
                          length(idempotency_key) BETWEEN 8 AND 200
                        ),
  correlation_id        uuid NOT NULL UNIQUE,
  audit_event_id        uuid NOT NULL UNIQUE REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated          boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rental_order_id, idempotency_key),
  FOREIGN KEY (rental_order_id, is_simulated)
    REFERENCES public.rental_orders (id, is_simulated)
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_order_change_review_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.rental_order_change_review_requests
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rental_order_change_review_requests TO service_role;

CREATE POLICY rental_order_change_review_requests_service_read
  ON public.rental_order_change_review_requests
  FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_rental_order_change_review_order
  ON public.rental_order_change_review_requests (rental_order_id, created_at DESC);
CREATE INDEX idx_rental_order_change_review_rfq
  ON public.rental_order_change_review_requests (rfq_id, created_at DESC);

CREATE OR REPLACE FUNCTION private.prevent_rental_order_change_review_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; append a separately authorized review event',
    TG_TABLE_NAME;
END;
$$;

REVOKE ALL ON FUNCTION private.prevent_rental_order_change_review_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER rental_order_change_review_requests_immutable
BEFORE UPDATE OR DELETE ON public.rental_order_change_review_requests
FOR EACH ROW EXECUTE FUNCTION private.prevent_rental_order_change_review_mutation();

CREATE OR REPLACE FUNCTION public.request_rental_order_end_date_change_review(
  p_rental_order_id   uuid,
  p_actor_id          uuid,
  p_requester_party   text,
  p_proposed_end_date date,
  p_request_reason    text,
  p_idempotency_key   text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_order             record;
  v_rfq_status        public.app_rfq_status;
  v_request_id        uuid := gen_random_uuid();
  v_correlation_id    uuid := gen_random_uuid();
  v_audit_event_id    uuid;
  v_reason            text := NULLIF(btrim(p_request_reason), '');
  v_idempotency_key   text := NULLIF(btrim(p_idempotency_key), '');
  v_existing          record;
  v_customer_authorized boolean := false;
  v_vendor_authorized boolean := false;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Rental Order change-review actor is required';
  END IF;
  IF p_requester_party NOT IN ('customer', 'vendor') THEN
    RAISE EXCEPTION 'Requester party must be customer or vendor';
  END IF;
  IF p_proposed_end_date IS NULL OR p_proposed_end_date <= current_date THEN
    RAISE EXCEPTION 'Proposed end date must be a future date';
  END IF;
  IF v_reason IS NULL OR length(v_reason) NOT BETWEEN 5 AND 4000 THEN
    RAISE EXCEPTION 'Change-review reason must contain 5 to 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Change-review idempotency key must contain 8 to 200 characters';
  END IF;

  SELECT
    rental_order.id,
    rental_order.rfq_id,
    rental_order.customer_user_id,
    rental_order.customer_organization_id,
    rental_order.vendor_organization_id,
    rental_order.current_version_number,
    rental_order.is_simulated
  INTO v_order
  FROM public.rental_orders AS rental_order
  WHERE rental_order.id = p_rental_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Rental Order not found: %', p_rental_order_id;
  END IF;
  IF public.is_demo_actor(p_actor_id) IS DISTINCT FROM v_order.is_simulated THEN
    RAISE EXCEPTION 'Change-review actor simulation scope does not match Rental Order %',
      p_rental_order_id;
  END IF;

  v_customer_authorized := v_order.customer_user_id = p_actor_id OR (
    v_order.customer_organization_id IS NOT NULL AND EXISTS (
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
    )
  );

  v_vendor_authorized := EXISTS (
    SELECT 1
    FROM public.organization_memberships AS membership
    JOIN public.organizations AS organization
      ON organization.id = membership.organization_id
     AND organization.org_type IN ('vendor', 'both')
     AND organization.is_simulated = v_order.is_simulated
     AND organization.archived_at IS NULL
    WHERE membership.organization_id = v_order.vendor_organization_id
      AND membership.user_id = p_actor_id
      AND membership.role IN ('owner', 'admin', 'member')
      AND membership.is_simulated = v_order.is_simulated
      AND membership.archived_at IS NULL
  );

  IF (p_requester_party = 'customer' AND NOT v_customer_authorized)
     OR (p_requester_party = 'vendor' AND NOT v_vendor_authorized) THEN
    RAISE EXCEPTION 'Actor % lacks % change-review authority for Rental Order %',
      p_actor_id, p_requester_party, p_rental_order_id;
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
    'rental_extended'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'Rental Order % is outside the change-review intake lifecycle boundary',
      p_rental_order_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.rental_order_change_review_requests AS review_request
  WHERE review_request.rental_order_id = p_rental_order_id
    AND review_request.idempotency_key = v_idempotency_key
  FOR UPDATE;

  IF FOUND THEN
    IF v_existing.requested_by = p_actor_id
       AND v_existing.requester_party = p_requester_party
       AND v_existing.proposed_end_date = p_proposed_end_date
       AND v_existing.request_reason = v_reason THEN
      RETURN jsonb_build_object(
        'request_id', v_existing.id,
        'rental_order_id', p_rental_order_id,
        'requester_party', v_existing.requester_party,
        'proposed_end_date', v_existing.proposed_end_date,
        'request_reason', v_existing.request_reason,
        'created_at', v_existing.created_at,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Change-review idempotency key conflicts with an existing request';
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_order_change_review',
    p_entity_id                        := v_request_id,
    p_event_type                       := 'rental_order.change_review_requested',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := p_requester_party || '_organization_member',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rental_order_id', p_rental_order_id,
                                             'rfq_id', v_order.rfq_id,
                                             'request_kind', 'end_date_change_review',
                                             'proposed_end_date', p_proposed_end_date,
                                             'review_state', 'review_required'
                                           ),
    p_reason                           := v_reason,
    p_source                           := p_requester_party || '_action',
    p_is_simulated                     := v_order.is_simulated,
    p_related_rfq_id                   := v_order.rfq_id,
    p_related_customer_organization_id := v_order.customer_organization_id,
    p_related_vendor_organization_id   := v_order.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'base_version_number', v_order.current_version_number,
                                             'base_end_date_state', 'unknown',
                                             'change_order_authority', false,
                                             'version_activation_authority', false,
                                             'lifecycle_transition_authority', false,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_order_change_review_requests (
    id, rental_order_id, rfq_id, request_kind, requester_party,
    proposed_end_date, request_reason, requested_by, idempotency_key,
    correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_request_id, p_rental_order_id, v_order.rfq_id, 'end_date_change_review',
    p_requester_party, p_proposed_end_date, v_reason, p_actor_id,
    v_idempotency_key, v_correlation_id, v_audit_event_id, v_order.is_simulated
  );

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'rental_order_id', p_rental_order_id,
    'requester_party', p_requester_party,
    'proposed_end_date', p_proposed_end_date,
    'request_reason', v_reason,
    'created_at', now(),
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.request_rental_order_end_date_change_review(
  uuid, uuid, text, date, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.request_rental_order_end_date_change_review(
  uuid, uuid, text, date, text, text
) TO service_role;
