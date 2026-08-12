-- Governed customer off-rent request and vendor acknowledgment evidence.
--
-- These operations deliberately stop at demobilizing. Neither operation
-- determines the contractual stop-rent timestamp or advances the rental to
-- off_rent; that remains a separate system-owned determination.

CREATE TABLE public.rental_off_rent_requests (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL UNIQUE
                           REFERENCES public.rental_requests ON DELETE RESTRICT,
  requested_by             uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  requested_at             timestamptz NOT NULL DEFAULT now(),
  requested_stop_at        timestamptz NOT NULL,
  pickup_available_from    timestamptz NOT NULL,
  pickup_available_until   timestamptz NOT NULL,
  customer_notes           text CHECK (
                             customer_notes IS NULL OR length(customer_notes) <= 4000
                           ),
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (pickup_available_from >= requested_stop_at),
  CHECK (pickup_available_until > pickup_available_from)
);

CREATE TABLE public.rental_off_rent_acknowledgments (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL UNIQUE
                           REFERENCES public.rental_requests ON DELETE RESTRICT,
  off_rent_request_id      uuid NOT NULL UNIQUE
                           REFERENCES public.rental_off_rent_requests ON DELETE RESTRICT,
  vendor_organization_id   uuid NOT NULL
                           REFERENCES public.organizations ON DELETE RESTRICT,
  acknowledged_by          uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  acknowledged_at          timestamptz NOT NULL DEFAULT now(),
  pickup_window_start      timestamptz NOT NULL,
  pickup_window_end        timestamptz NOT NULL,
  vendor_notes             text CHECK (
                             vendor_notes IS NULL OR length(vendor_notes) <= 4000
                           ),
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  CHECK (pickup_window_end > pickup_window_start)
);

ALTER TABLE public.rental_off_rent_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_off_rent_acknowledgments ENABLE ROW LEVEL SECURITY;

-- Data API exposure is explicit. Authorized parties may read the immutable
-- evidence, while all writes stay behind service-role-only RPCs.
REVOKE ALL ON public.rental_off_rent_requests FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_off_rent_acknowledgments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rental_off_rent_requests TO authenticated;
GRANT SELECT ON public.rental_off_rent_acknowledgments TO authenticated;
GRANT ALL ON public.rental_off_rent_requests TO service_role;
GRANT ALL ON public.rental_off_rent_acknowledgments TO service_role;

CREATE POLICY "off_rent_requests_select_customer"
  ON public.rental_off_rent_requests FOR SELECT TO authenticated
  USING (
    rfq_id IN (
      SELECT rr.id
      FROM public.rental_requests AS rr
      WHERE rr.customer_id = auth.uid()
         OR rr.customer_organization_id IN (
           SELECT om.organization_id
           FROM public.organization_memberships AS om
           WHERE om.user_id = auth.uid()
             AND om.archived_at IS NULL
         )
    )
  );

CREATE POLICY "off_rent_requests_select_accepted_vendor"
  ON public.rental_off_rent_requests FOR SELECT TO authenticated
  USING (public.rfq_vendor_has_accepted_quote(rfq_id));

CREATE POLICY "off_rent_requests_service"
  ON public.rental_off_rent_requests FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE POLICY "off_rent_acknowledgments_select_customer"
  ON public.rental_off_rent_acknowledgments FOR SELECT TO authenticated
  USING (
    rfq_id IN (
      SELECT rr.id
      FROM public.rental_requests AS rr
      WHERE rr.customer_id = auth.uid()
         OR rr.customer_organization_id IN (
           SELECT om.organization_id
           FROM public.organization_memberships AS om
           WHERE om.user_id = auth.uid()
             AND om.archived_at IS NULL
         )
    )
  );

CREATE POLICY "off_rent_acknowledgments_select_vendor"
  ON public.rental_off_rent_acknowledgments FOR SELECT TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships AS om
      JOIN public.organizations AS org
        ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
  );

CREATE POLICY "off_rent_acknowledgments_service"
  ON public.rental_off_rent_acknowledgments FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_off_rent_requests_correlation
  ON public.rental_off_rent_requests (correlation_id);
CREATE INDEX idx_off_rent_acknowledgments_vendor_org
  ON public.rental_off_rent_acknowledgments (vendor_organization_id);
CREATE INDEX idx_off_rent_acknowledgments_correlation
  ON public.rental_off_rent_acknowledgments (correlation_id);

CREATE OR REPLACE FUNCTION public.record_rental_off_rent_request(
  p_rfq_id                 uuid,
  p_actor_id               uuid,
  p_requested_stop_at      timestamptz,
  p_pickup_available_from  timestamptz,
  p_pickup_available_until timestamptz,
  p_customer_notes         text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq                  record;
  v_request_id           uuid := gen_random_uuid();
  v_correlation_id       uuid := gen_random_uuid();
  v_request_event_id     uuid;
  v_transition_event_id  uuid;
  v_requested_at         timestamptz := now();
BEGIN
  SELECT id, operational_status, customer_id, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot request off-rent for non-simulated RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF v_rfq.operational_status <> 'on_rent'::public.app_rfq_status THEN
    RAISE EXCEPTION 'RFQ % must be on_rent before off-rent can be requested; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;

  IF NOT (
    v_rfq.customer_id = p_actor_id
    OR (
      v_rfq.customer_organization_id IS NOT NULL
      AND EXISTS (
        SELECT 1
        FROM public.organization_memberships AS om
        WHERE om.user_id = p_actor_id
          AND om.organization_id = v_rfq.customer_organization_id
          AND om.archived_at IS NULL
          AND om.role IN ('owner', 'admin', 'member')
      )
    )
  ) THEN
    RAISE EXCEPTION 'Actor % lacks customer off-rent authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF p_requested_stop_at IS NULL
     OR p_pickup_available_from IS NULL
     OR p_pickup_available_until IS NULL THEN
    RAISE EXCEPTION 'Requested stop time and pickup availability window are required';
  END IF;

  IF p_pickup_available_from < p_requested_stop_at THEN
    RAISE EXCEPTION 'Pickup availability cannot begin before the requested stop time';
  END IF;

  IF p_pickup_available_until <= p_pickup_available_from THEN
    RAISE EXCEPTION 'Pickup availability end must be after its start';
  END IF;

  IF p_customer_notes IS NOT NULL AND length(p_customer_notes) > 4000 THEN
    RAISE EXCEPTION 'Customer notes cannot exceed 4000 characters';
  END IF;

  IF EXISTS (SELECT 1 FROM public.rental_off_rent_requests WHERE rfq_id = p_rfq_id) THEN
    RAISE EXCEPTION 'Off-rent request already exists for RFQ %', p_rfq_id;
  END IF;

  v_request_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_off_rent_request',
    p_entity_id                        := v_request_id,
    p_event_type                       := 'off_rent_requested',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer_coordinator',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'requested_at', v_requested_at,
                                             'requested_stop_at', p_requested_stop_at,
                                             'pickup_available_from', p_pickup_available_from,
                                             'pickup_available_until', p_pickup_available_until
                                           ),
    p_reason                           := NULLIF(btrim(p_customer_notes), ''),
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id
  );

  INSERT INTO public.rental_off_rent_requests (
    id, rfq_id, requested_by, requested_at, requested_stop_at,
    pickup_available_from, pickup_available_until, customer_notes,
    correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_request_id, p_rfq_id, p_actor_id, v_requested_at, p_requested_stop_at,
    p_pickup_available_from, p_pickup_available_until, NULLIF(btrim(p_customer_notes), ''),
    v_correlation_id, v_request_event_id, v_rfq.is_simulated
  );

  v_transition_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer_coordinator',
    p_actor_type                       := 'user',
    p_old_value                        := jsonb_build_object('operational_status', 'on_rent'),
    p_new_value                        := jsonb_build_object('operational_status', 'off_rent_requested'),
    p_reason                           := 'Customer submitted governed off-rent request',
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                         := jsonb_build_object('off_rent_request_id', v_request_id)
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, 'on_rent', 'off_rent_requested', p_actor_id, 'customer_coordinator',
    'Customer submitted governed off-rent request', v_correlation_id,
    v_transition_event_id, v_rfq.is_simulated
  );

  UPDATE public.rental_requests
  SET operational_status = 'off_rent_requested'
  WHERE id = p_rfq_id;

  RETURN v_correlation_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_rental_off_rent_acknowledgment(
  p_rfq_id              uuid,
  p_actor_id            uuid,
  p_pickup_window_start timestamptz,
  p_pickup_window_end   timestamptz,
  p_vendor_notes        text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq                  record;
  v_request              record;
  v_vendor_org_id        uuid;
  v_acknowledgment_id    uuid := gen_random_uuid();
  v_correlation_id       uuid := gen_random_uuid();
  v_ack_event_id         uuid;
  v_transition_event_id  uuid;
  v_acknowledged_at      timestamptz := now();
BEGIN
  SELECT id, operational_status, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot acknowledge off-rent for non-simulated RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF v_rfq.operational_status <> 'off_rent_requested'::public.app_rfq_status THEN
    RAISE EXCEPTION 'RFQ % must be off_rent_requested before vendor acknowledgment; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;

  SELECT *
  INTO v_request
  FROM public.rental_off_rent_requests
  WHERE rfq_id = p_rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Governed off-rent request not found for RFQ %', p_rfq_id;
  END IF;

  SELECT vqr.vendor_organization_id
  INTO v_vendor_org_id
  FROM public.vendor_quote_responses AS vqr
  JOIN public.organization_memberships AS om
    ON om.organization_id = vqr.vendor_organization_id
  JOIN public.organizations AS org
    ON org.id = vqr.vendor_organization_id
  WHERE vqr.rfq_id = p_rfq_id
    AND vqr.status = 'accepted'
    AND om.user_id = p_actor_id
    AND om.archived_at IS NULL
    AND om.role IN ('owner', 'admin', 'member')
    AND org.org_type IN ('vendor', 'both')
    AND org.archived_at IS NULL
  ORDER BY vqr.accepted_at DESC NULLS LAST
  LIMIT 1;

  IF v_vendor_org_id IS NULL THEN
    RAISE EXCEPTION 'Actor % lacks accepted-vendor acknowledgment authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF p_pickup_window_start IS NULL OR p_pickup_window_end IS NULL THEN
    RAISE EXCEPTION 'Vendor pickup window is required';
  END IF;

  IF p_pickup_window_end <= p_pickup_window_start THEN
    RAISE EXCEPTION 'Vendor pickup window end must be after its start';
  END IF;

  IF p_vendor_notes IS NOT NULL AND length(p_vendor_notes) > 4000 THEN
    RAISE EXCEPTION 'Vendor notes cannot exceed 4000 characters';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rental_off_rent_acknowledgments WHERE rfq_id = p_rfq_id
  ) THEN
    RAISE EXCEPTION 'Off-rent acknowledgment already exists for RFQ %', p_rfq_id;
  END IF;

  v_ack_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_off_rent_acknowledgment',
    p_entity_id                        := v_acknowledgment_id,
    p_event_type                       := 'off_rent_acknowledged',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'vendor_dispatch',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'acknowledged_at', v_acknowledged_at,
                                             'pickup_window_start', p_pickup_window_start,
                                             'pickup_window_end', p_pickup_window_end
                                           ),
    p_reason                           := NULLIF(btrim(p_vendor_notes), ''),
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_vendor_org_id,
    p_metadata                         := jsonb_build_object(
                                             'off_rent_request_id', v_request.id
                                           )
  );

  INSERT INTO public.rental_off_rent_acknowledgments (
    id, rfq_id, off_rent_request_id, vendor_organization_id,
    acknowledged_by, acknowledged_at, pickup_window_start, pickup_window_end,
    vendor_notes, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_acknowledgment_id, p_rfq_id, v_request.id, v_vendor_org_id,
    p_actor_id, v_acknowledged_at, p_pickup_window_start, p_pickup_window_end,
    NULLIF(btrim(p_vendor_notes), ''), v_correlation_id, v_ack_event_id,
    v_rfq.is_simulated
  );

  v_transition_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'vendor_dispatch',
    p_actor_type                       := 'user',
    p_old_value                        := jsonb_build_object('operational_status', 'off_rent_requested'),
    p_new_value                        := jsonb_build_object('operational_status', 'demobilizing'),
    p_reason                           := 'Accepted vendor acknowledged pickup coordination',
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_vendor_org_id,
    p_metadata                         := jsonb_build_object(
                                             'off_rent_request_id', v_request.id,
                                             'off_rent_acknowledgment_id', v_acknowledgment_id
                                           )
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, 'off_rent_requested', 'demobilizing', p_actor_id, 'vendor_dispatch',
    'Accepted vendor acknowledged pickup coordination', v_correlation_id,
    v_transition_event_id, v_rfq.is_simulated
  );

  UPDATE public.rental_requests
  SET operational_status = 'demobilizing'
  WHERE id = p_rfq_id;

  RETURN v_correlation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_off_rent_request(
  uuid, uuid, timestamptz, timestamptz, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_off_rent_request(
  uuid, uuid, timestamptz, timestamptz, timestamptz, text
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_rental_off_rent_acknowledgment(
  uuid, uuid, timestamptz, timestamptz, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_off_rent_acknowledgment(
  uuid, uuid, timestamptz, timestamptz, text
) TO service_role;
