-- Governed RFQ-wide PickupTask attempt outcome and exception-progress slice.
--
-- An assigned field actor may append one operational attempt outcome after a
-- governed arrival assertion. A collection assertion is evidence of what the
-- actor reported only. It never establishes physical or legal custody,
-- successful return, task closure, contractual stop authority, billing cutoff,
-- invoice authority, condition liability, or granular equipment scope.

CREATE TABLE public.rental_pickup_attempt_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id      uuid NOT NULL,
  rfq_id              uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  event_sequence      integer NOT NULL DEFAULT 1 CHECK (event_sequence = 1),
  event_type          text NOT NULL CHECK (event_type IN (
                        'attempt_collection_asserted',
                        'attempt_failed'
                      )),
  actor_id            uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role          text NOT NULL DEFAULT 'assigned_field_actor'
                      CHECK (actor_role = 'assigned_field_actor'),
  assigned_actor_id   uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  reason_code         text CHECK (reason_code IS NULL OR reason_code IN (
                        'customer_access_unavailable',
                        'site_restriction',
                        'equipment_not_ready',
                        'equipment_not_found',
                        'weather_or_safety',
                        'contact_issue',
                        'other'
                      )),
  notes               text CHECK (notes IS NULL OR length(notes) <= 4000),
  idempotency_key     text NOT NULL CHECK (
                        length(idempotency_key) BETWEEN 1 AND 200
                      ),
  correlation_id      uuid NOT NULL UNIQUE,
  audit_event_id      uuid NOT NULL UNIQUE
                      REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pickup_task_id, event_sequence),
  UNIQUE (pickup_task_id, idempotency_key),
  FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)
    REFERENCES public.rental_pickup_tasks (id, rfq_id, is_simulated)
    ON DELETE RESTRICT,
  CHECK (
    (event_type = 'attempt_collection_asserted' AND reason_code IS NULL)
    OR
    (event_type = 'attempt_failed' AND reason_code IS NOT NULL)
  ),
  CHECK (reason_code <> 'other' OR NULLIF(btrim(notes), '') IS NOT NULL)
);

ALTER TABLE public.rental_pickup_attempt_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_attempt_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rental_pickup_attempt_events TO service_role;

CREATE POLICY "pickup_attempt_events_service_read"
  ON public.rental_pickup_attempt_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_attempt_events_rfq
  ON public.rental_pickup_attempt_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_attempt_events_actor
  ON public.rental_pickup_attempt_events (actor_id);
CREATE INDEX idx_pickup_attempt_events_assigned_actor
  ON public.rental_pickup_attempt_events (assigned_actor_id);

CREATE TRIGGER rental_pickup_attempt_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_attempt_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.record_rental_pickup_attempt_outcome(
  p_rfq_id          uuid,
  p_actor_id        uuid,
  p_outcome         text,
  p_reason_code     text,
  p_notes           text,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq              record;
  v_latest_dispatch  record;
  v_existing_event   record;
  v_event_id         uuid := gen_random_uuid();
  v_correlation_id   uuid := gen_random_uuid();
  v_audit_event_id   uuid;
  v_event_type       text;
  v_reason_code      text := NULLIF(btrim(p_reason_code), '');
  v_notes            text := NULLIF(btrim(p_notes), '');
  v_idempotency_key  text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup attempt actor is required';
  END IF;
  IF p_outcome IS NULL OR p_outcome NOT IN ('collection_asserted', 'failed') THEN
    RAISE EXCEPTION 'Pickup attempt outcome must be collection_asserted or failed';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup attempt notes cannot exceed 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup attempt idempotency key must contain 1 to 200 characters';
  END IF;
  IF p_outcome = 'collection_asserted' AND v_reason_code IS NOT NULL THEN
    RAISE EXCEPTION 'Pickup attempt reason is only permitted for a failed attempt';
  END IF;
  IF p_outcome = 'failed' AND (v_reason_code IS NULL OR v_reason_code NOT IN (
    'customer_access_unavailable',
    'site_restriction',
    'equipment_not_ready',
    'equipment_not_found',
    'weather_or_safety',
    'contact_issue',
    'other'
  )) THEN
    RAISE EXCEPTION 'Failed pickup attempt requires a governed reason code';
  END IF;
  IF v_reason_code = 'other' AND v_notes IS NULL THEN
    RAISE EXCEPTION 'Pickup attempt notes are required when reason code is other';
  END IF;

  SELECT rr.id, rr.operational_status, rr.is_simulated,
         task.id AS pickup_task_id, task.customer_organization_id,
         task.vendor_organization_id, task.object_scope
  INTO v_rfq
  FROM public.rental_requests AS rr
  JOIN public.rental_pickup_tasks AS task ON task.rfq_id = rr.id
  WHERE rr.id = p_rfq_id
  FOR UPDATE OF rr;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Governed pickup task not found for RFQ %', p_rfq_id;
  END IF;
  IF v_rfq.object_scope <> 'rfq' THEN
    RAISE EXCEPTION 'Pickup task scope must remain RFQ-wide';
  END IF;
  IF v_rfq.operational_status NOT IN (
    'demobilizing'::public.app_rfq_status,
    'off_rent'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before attempt outcome; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup attempt actor simulation scope does not match RFQ %', p_rfq_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.organization_memberships AS membership
    JOIN public.organizations AS organization
      ON organization.id = membership.organization_id
     AND organization.org_type IN ('vendor', 'both')
     AND organization.is_simulated = v_rfq.is_simulated
     AND organization.archived_at IS NULL
    WHERE membership.organization_id = v_rfq.vendor_organization_id
      AND membership.user_id = p_actor_id
      AND membership.role IN ('owner', 'admin', 'member')
      AND membership.is_simulated = v_rfq.is_simulated
      AND membership.archived_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Actor % lacks assigned-vendor pickup attempt authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT *
  INTO v_existing_event
  FROM public.rental_pickup_attempt_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
    AND idempotency_key = v_idempotency_key;

  v_event_type := CASE p_outcome
    WHEN 'collection_asserted' THEN 'attempt_collection_asserted'
    ELSE 'attempt_failed'
  END;

  IF FOUND THEN
    IF v_existing_event.actor_id = p_actor_id
       AND v_existing_event.assigned_actor_id = p_actor_id
       AND v_existing_event.event_type = v_event_type
       AND v_existing_event.reason_code IS NOT DISTINCT FROM v_reason_code
       AND v_existing_event.notes IS NOT DISTINCT FROM v_notes THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_rfq.pickup_task_id,
        'attempt_event_id', v_existing_event.id,
        'correlation_id', v_existing_event.correlation_id,
        'event_type', v_existing_event.event_type,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup attempt idempotency key conflicts with an existing command';
  END IF;

  SELECT *
  INTO v_latest_dispatch
  FROM public.rental_pickup_dispatch_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
  ORDER BY event_sequence DESC
  LIMIT 1;

  IF NOT FOUND OR v_latest_dispatch.event_type <> 'arrival_recorded' THEN
    RAISE EXCEPTION 'Pickup attempt requires an assigned-actor arrival assertion';
  END IF;
  IF v_latest_dispatch.assigned_actor_id <> p_actor_id THEN
    RAISE EXCEPTION 'Actor % is not the assigned pickup field actor for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.rental_pickup_attempt_events
    WHERE pickup_task_id = v_rfq.pickup_task_id
  ) THEN
    RAISE EXCEPTION 'Pickup task already has an attempt outcome; retry authority is not included';
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_rfq.pickup_task_id,
    p_event_type                       := 'pickup.' || v_event_type,
    p_event_category                   := 'vendor',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'assigned_field_actor',
    p_actor_type                       := 'user',
    p_old_value                        := jsonb_build_object(
                                             'dispatch_state', 'arrival_recorded',
                                             'attempt_state', 'not_recorded'
                                           ),
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'attempt_state', v_event_type,
                                             'exception_state', CASE
                                               WHEN v_event_type = 'attempt_failed'
                                               THEN 'review_required'
                                               ELSE 'none_recorded'
                                             END
                                           ),
    p_reason                           := COALESCE(v_reason_code, v_notes),
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_rfq.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'pickup_task_id', v_rfq.pickup_task_id,
                                             'assigned_actor_id', p_actor_id,
                                             'actor_assertion_only', true,
                                             'non_financial', true,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'successful_return_authority', false,
                                             'task_closure_authority', false,
                                             'invoice_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_attempt_events (
    id, pickup_task_id, rfq_id, event_sequence, event_type, actor_id,
    actor_role, assigned_actor_id, reason_code, notes, idempotency_key,
    correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_rfq.pickup_task_id, p_rfq_id, 1, v_event_type, p_actor_id,
    'assigned_field_actor', p_actor_id, v_reason_code, v_notes,
    v_idempotency_key, v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_rfq.pickup_task_id,
    'attempt_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', v_event_type,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_pickup_attempt_outcome(
  uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_pickup_attempt_outcome(
  uuid, uuid, text, text, text, text
) TO service_role;

-- Deliberate authority boundary: no rental request update, retry/exception
-- resolution command, pickup success, custody/condition assertion, billing or
-- invoice effect, stop-rent rule, override, or granular/partial scope is added.
