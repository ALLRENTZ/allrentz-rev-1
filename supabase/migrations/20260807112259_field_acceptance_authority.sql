-- Governed field acceptance and system-owned on-rent determination.
--
-- A customer field user records the delivery evidence. The database then
-- atomically records the immutable evidence/audit trail and advances the RFQ
-- from in_transit to on_rent as a system-owned state determination.

CREATE TABLE public.rental_field_acceptances (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL UNIQUE
                           REFERENCES public.rental_requests ON DELETE RESTRICT,
  accepted_by              uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  accepted_at              timestamptz NOT NULL DEFAULT now(),
  condition_notes          text NOT NULL CHECK (
                             length(btrim(condition_notes)) BETWEEN 5 AND 4000
                           ),
  evidence_references      text[] NOT NULL CHECK (
                             cardinality(evidence_references) BETWEEN 1 AND 20
                           ),
  quantities_confirmed     boolean NOT NULL CHECK (quantities_confirmed),
  accessories_confirmed    boolean NOT NULL CHECK (accessories_confirmed),
  documentation_confirmed  boolean NOT NULL CHECK (documentation_confirmed),
  terms_acknowledged       boolean NOT NULL CHECK (terms_acknowledged),
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rental_field_acceptances ENABLE ROW LEVEL SECURITY;

-- Data API access is explicit. Clients may read authorized evidence but all
-- writes remain behind the service-role-only RPC below.
REVOKE ALL ON public.rental_field_acceptances FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.rental_field_acceptances TO authenticated;
GRANT ALL ON public.rental_field_acceptances TO service_role;

CREATE POLICY "field_acceptances_select_customer"
  ON public.rental_field_acceptances FOR SELECT TO authenticated
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

CREATE POLICY "field_acceptances_service"
  ON public.rental_field_acceptances FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX idx_field_acceptances_rfq
  ON public.rental_field_acceptances (rfq_id);
CREATE INDEX idx_field_acceptances_correlation
  ON public.rental_field_acceptances (correlation_id);

CREATE OR REPLACE FUNCTION public.record_rental_field_acceptance(
  p_rfq_id                  uuid,
  p_actor_id                uuid,
  p_condition_notes         text,
  p_evidence_references     text[],
  p_quantities_confirmed    boolean,
  p_accessories_confirmed   boolean,
  p_documentation_confirmed boolean,
  p_terms_acknowledged      boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rfq                  record;
  v_acceptance_id        uuid := gen_random_uuid();
  v_correlation_id       uuid := gen_random_uuid();
  v_acceptance_event_id  uuid;
  v_transition_event_id  uuid;
  v_accepted_at          timestamptz := now();
  v_reference            text;
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
    RAISE EXCEPTION 'Demo actor % cannot accept delivery for non-simulated RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF v_rfq.operational_status <> 'in_transit'::public.app_rfq_status THEN
    RAISE EXCEPTION 'RFQ % must be in_transit before field acceptance; current status is %',
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
    RAISE EXCEPTION 'Actor % lacks customer field-acceptance authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  IF p_condition_notes IS NULL OR length(btrim(p_condition_notes)) < 5 THEN
    RAISE EXCEPTION 'Condition notes must contain at least 5 characters';
  END IF;

  IF length(btrim(p_condition_notes)) > 4000 THEN
    RAISE EXCEPTION 'Condition notes cannot exceed 4000 characters';
  END IF;

  IF p_evidence_references IS NULL OR cardinality(p_evidence_references) = 0 THEN
    RAISE EXCEPTION 'At least one delivery evidence reference is required';
  END IF;

  IF cardinality(p_evidence_references) > 20 THEN
    RAISE EXCEPTION 'No more than 20 delivery evidence references are allowed';
  END IF;

  FOREACH v_reference IN ARRAY p_evidence_references LOOP
    IF v_reference IS NULL OR btrim(v_reference) = '' THEN
      RAISE EXCEPTION 'Delivery evidence references cannot be blank';
    END IF;
    IF length(v_reference) > 500 THEN
      RAISE EXCEPTION 'Delivery evidence references cannot exceed 500 characters';
    END IF;
  END LOOP;

  IF NOT coalesce(p_quantities_confirmed, false)
     OR NOT coalesce(p_accessories_confirmed, false)
     OR NOT coalesce(p_documentation_confirmed, false)
     OR NOT coalesce(p_terms_acknowledged, false) THEN
    RAISE EXCEPTION 'All field acceptance confirmations are required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rental_field_acceptances WHERE rfq_id = p_rfq_id
  ) THEN
    RAISE EXCEPTION 'Field acceptance already exists for RFQ %', p_rfq_id;
  END IF;

  -- Event integrity: the field-user event is written before the evidence and
  -- status rows. Any later failure rolls the entire transaction back.
  v_acceptance_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_field_acceptance',
    p_entity_id                        := v_acceptance_id,
    p_event_type                       := 'delivery_field_accepted',
    p_event_category                   := 'inspection',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer_field_user',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'accepted_at', v_accepted_at,
                                             'quantities_confirmed', true,
                                             'accessories_confirmed', true,
                                             'documentation_confirmed', true,
                                             'terms_acknowledged', true
                                           ),
    p_reason                           := btrim(p_condition_notes),
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'evidence_reference_count', cardinality(p_evidence_references)
                                           )
  );

  INSERT INTO public.rental_field_acceptances (
    id, rfq_id, accepted_by, accepted_at, condition_notes,
    evidence_references, quantities_confirmed, accessories_confirmed,
    documentation_confirmed, terms_acknowledged, correlation_id,
    audit_event_id, is_simulated
  ) VALUES (
    v_acceptance_id, p_rfq_id, p_actor_id, v_accepted_at, btrim(p_condition_notes),
    p_evidence_references, true, true, true, true, v_correlation_id,
    v_acceptance_event_id, v_rfq.is_simulated
  );

  -- The resulting ON_RENT determination is system-owned. The user is the
  -- recorded field accepter, not the actor that directly changes rental state.
  v_transition_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := NULL,
    p_actor_role                       := 'system',
    p_actor_type                       := 'system',
    p_old_value                        := jsonb_build_object('operational_status', 'in_transit'),
    p_new_value                        := jsonb_build_object('operational_status', 'on_rent'),
    p_reason                           := 'Recorded field acceptance satisfied the on-rent gate',
    p_source                           := 'system',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                         := jsonb_build_object('field_acceptance_id', v_acceptance_id)
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, 'in_transit', 'on_rent', NULL, 'system',
    'Recorded field acceptance satisfied the on-rent gate',
    v_correlation_id, v_transition_event_id, v_rfq.is_simulated
  );

  UPDATE public.rental_requests
  SET operational_status = 'on_rent',
      on_rent_at = v_accepted_at
  WHERE id = p_rfq_id;

  RETURN v_correlation_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_field_acceptance(
  uuid, uuid, text, text[], boolean, boolean, boolean, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.record_rental_field_acceptance(
  uuid, uuid, text, text[], boolean, boolean, boolean, boolean
) TO service_role;
