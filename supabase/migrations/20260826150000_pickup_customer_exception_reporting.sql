-- Governed RFQ-wide customer pickup exception reporting.
--
-- A customer report is immutable operational evidence that requires review. It
-- does not establish a failed pickup attempt, exception resolution, assignment,
-- collection, custody, condition, return completion, stop-rent, billing,
-- invoice, override, retry, or granular rental authority.

CREATE TABLE public.rental_pickup_customer_exception_report_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id     uuid NOT NULL,
  rfq_id             uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  event_sequence     integer NOT NULL CHECK (event_sequence > 0),
  event_type         text NOT NULL DEFAULT 'customer_exception_reported'
                     CHECK (event_type = 'customer_exception_reported'),
  actor_id           uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role         text NOT NULL DEFAULT 'customer'
                     CHECK (actor_role = 'customer'),
  description        text NOT NULL CHECK (
                       length(btrim(description)) BETWEEN 1 AND 4000
                     ),
  idempotency_key    text NOT NULL CHECK (
                       length(idempotency_key) BETWEEN 1 AND 200
                     ),
  correlation_id     uuid NOT NULL UNIQUE,
  audit_event_id     uuid NOT NULL UNIQUE
                     REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated       boolean NOT NULL DEFAULT false,
  created_at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pickup_task_id, event_sequence),
  UNIQUE (pickup_task_id, idempotency_key),
  FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)
    REFERENCES public.rental_pickup_tasks (id, rfq_id, is_simulated)
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_pickup_customer_exception_report_events
  ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES
  ON TABLE public.rental_pickup_customer_exception_report_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT
  ON TABLE public.rental_pickup_customer_exception_report_events
  TO service_role;

CREATE POLICY "pickup_customer_exception_report_events_service_read"
  ON public.rental_pickup_customer_exception_report_events
  FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_customer_exception_reports_rfq
  ON public.rental_pickup_customer_exception_report_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_customer_exception_reports_actor
  ON public.rental_pickup_customer_exception_report_events (actor_id);

CREATE TRIGGER rental_pickup_customer_exception_report_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_customer_exception_report_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.record_rental_pickup_customer_exception_report(
  p_rfq_id          uuid,
  p_actor_id        uuid,
  p_description     text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq              record;
  v_task             record;
  v_existing         record;
  v_sequence         integer;
  v_event_id         uuid := gen_random_uuid();
  v_correlation_id   uuid := gen_random_uuid();
  v_audit_event_id   uuid;
  v_description      text := NULLIF(btrim(p_description), '');
  v_idempotency_key  text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup customer exception-report actor is required';
  END IF;
  IF v_description IS NULL OR length(v_description) > 4000 THEN
    RAISE EXCEPTION 'Pickup customer exception description must contain 1 to 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup customer exception idempotency key must contain 1 to 200 characters';
  END IF;

  SELECT id, customer_id, customer_organization_id, operational_status, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;
  IF v_rfq.operational_status NOT IN (
    'demobilizing'::public.app_rfq_status,
    'off_rent'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before reporting a pickup exception; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup customer exception actor simulation scope does not match RFQ %', p_rfq_id;
  END IF;
  IF NOT (
    v_rfq.customer_id = p_actor_id
    OR EXISTS (
      SELECT 1
      FROM public.organization_memberships AS membership
      JOIN public.organizations AS organization
        ON organization.id = membership.organization_id
       AND organization.org_type IN ('customer', 'both')
       AND organization.is_simulated = v_rfq.is_simulated
       AND organization.archived_at IS NULL
      WHERE membership.organization_id = v_rfq.customer_organization_id
        AND membership.user_id = p_actor_id
        AND membership.role IN ('owner', 'admin', 'member')
        AND membership.is_simulated = v_rfq.is_simulated
        AND membership.archived_at IS NULL
    )
  ) THEN
    RAISE EXCEPTION 'Actor % lacks customer pickup exception-report authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT * INTO v_task
  FROM public.rental_pickup_tasks
  WHERE rfq_id = p_rfq_id
    AND customer_organization_id = v_rfq.customer_organization_id
    AND object_scope = 'rfq'
    AND is_simulated = v_rfq.is_simulated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Governed RFQ-wide PickupTask not found for RFQ %', p_rfq_id;
  END IF;

  SELECT * INTO v_existing
  FROM public.rental_pickup_customer_exception_report_events
  WHERE pickup_task_id = v_task.id
    AND idempotency_key = v_idempotency_key;

  IF FOUND THEN
    IF v_existing.actor_id = p_actor_id
       AND v_existing.description = v_description THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_task.id,
        'customer_exception_report_event_id', v_existing.id,
        'correlation_id', v_existing.correlation_id,
        'event_type', v_existing.event_type,
        'review_state', 'review_required',
        'resolution_state', 'blocked',
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup customer exception idempotency key conflicts with an existing command';
  END IF;

  SELECT COALESCE(max(event_sequence), 0) + 1 INTO v_sequence
  FROM public.rental_pickup_customer_exception_report_events
  WHERE pickup_task_id = v_task.id;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_task.id,
    p_event_type                       := 'pickup.customer_exception_reported',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'review_state', 'review_required',
                                             'resolution_state', 'blocked'
                                           ),
    p_reason                           := v_description,
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_task.customer_organization_id,
    p_related_vendor_organization_id   := v_task.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'non_financial', true,
                                             'failed_attempt_authority', false,
                                             'resolution_authority', false,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_customer_exception_report_events (
    id, pickup_task_id, rfq_id, event_sequence, actor_id, description,
    idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_task.id, p_rfq_id, v_sequence, p_actor_id, v_description,
    v_idempotency_key, v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_task.id,
    'customer_exception_report_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', 'customer_exception_reported',
    'review_state', 'review_required',
    'resolution_state', 'blocked',
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_pickup_customer_exception_report(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_rental_pickup_customer_exception_report(
  uuid, uuid, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.get_rental_pickup_customer_exception_report_queue(
  p_actor_id uuid
)
RETURNS TABLE (
  rfq_id uuid,
  pickup_task_id uuid,
  report_event_id uuid,
  description text,
  reported_at timestamptz,
  review_state text,
  resolution_state text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.pickup_exception_triage_actor(p_actor_id) THEN
    RAISE EXCEPTION 'Actor % lacks pickup exception triage authority', p_actor_id;
  END IF;

  RETURN QUERY
  SELECT
    report.rfq_id,
    report.pickup_task_id,
    report.id,
    report.description,
    report.created_at,
    'review_required'::text,
    'blocked'::text
  FROM public.rental_pickup_customer_exception_report_events AS report
  JOIN public.rental_pickup_tasks AS task ON task.id = report.pickup_task_id
  WHERE report.is_simulated = public.is_demo_actor(p_actor_id)
    AND task.object_scope = 'rfq'
    AND task.is_simulated = report.is_simulated
  ORDER BY report.created_at ASC, report.event_sequence ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rental_pickup_customer_exception_report_queue(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_rental_pickup_customer_exception_report_queue(uuid)
  TO service_role;

-- Deliberate authority boundary: reporting creates review-required evidence
-- only. No command can claim, resolve, dismiss, or financially interpret these
-- reports. Existing failed-attempt triage remains a separate evidence stream.
