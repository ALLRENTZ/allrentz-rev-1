-- Governed RFQ-wide PickupTask dispatch and field-progress slice.
--
-- These events are non-financial operational assertions. Assignment, en-route,
-- and arrival never determine custody, condition, collection, rental lifecycle,
-- contractual stop authority, billing cutoff, invoice liability, or granular
-- equipment scope.

CREATE TABLE public.rental_pickup_dispatch_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id      uuid NOT NULL,
  rfq_id              uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  event_sequence      integer NOT NULL CHECK (event_sequence > 0),
  event_type          text NOT NULL CHECK (event_type IN (
                        'field_actor_assigned',
                        'en_route_recorded',
                        'arrival_recorded'
                      )),
  actor_id            uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role          text NOT NULL CHECK (actor_role IN (
                        'vendor_dispatcher', 'assigned_field_actor'
                      )),
  assigned_actor_id   uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
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
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_pickup_dispatch_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_dispatch_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rental_pickup_dispatch_events TO service_role;

CREATE POLICY "pickup_dispatch_events_service_read"
  ON public.rental_pickup_dispatch_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_dispatch_events_rfq
  ON public.rental_pickup_dispatch_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_dispatch_events_actor
  ON public.rental_pickup_dispatch_events (actor_id);
CREATE INDEX idx_pickup_dispatch_events_assigned_actor
  ON public.rental_pickup_dispatch_events (assigned_actor_id);

CREATE TRIGGER rental_pickup_dispatch_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_dispatch_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.assign_rental_pickup_field_actor(
  p_rfq_id          uuid,
  p_actor_id        uuid,
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
  v_latest_schedule  record;
  v_existing_event   record;
  v_event_id         uuid := gen_random_uuid();
  v_correlation_id   uuid := gen_random_uuid();
  v_audit_event_id   uuid;
  v_notes            text := NULLIF(btrim(p_notes), '');
  v_idempotency_key  text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup field actor is required';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup field assignment notes cannot exceed 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup dispatch idempotency key must contain 1 to 200 characters';
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
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before field assignment; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup field assignment actor simulation scope does not match RFQ %', p_rfq_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.vendor_quote_responses AS vqr
    JOIN public.organization_memberships AS membership
      ON membership.organization_id = v_rfq.vendor_organization_id
     AND membership.user_id = p_actor_id
     AND membership.role IN ('owner', 'admin')
     AND membership.is_simulated = v_rfq.is_simulated
     AND membership.archived_at IS NULL
    JOIN public.organizations AS organization
      ON organization.id = membership.organization_id
     AND organization.org_type IN ('vendor', 'both')
     AND organization.is_simulated = v_rfq.is_simulated
     AND organization.archived_at IS NULL
    WHERE vqr.rfq_id = p_rfq_id
      AND vqr.vendor_organization_id = v_rfq.vendor_organization_id
      AND vqr.status = 'accepted'
      AND vqr.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'Actor % lacks accepted-vendor field assignment authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT *
  INTO v_latest_schedule
  FROM public.rental_pickup_schedule_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
  ORDER BY event_sequence DESC
  LIMIT 1;

  IF NOT FOUND OR v_latest_schedule.event_type <> 'schedule_confirmed' THEN
    RAISE EXCEPTION 'Pickup task requires a currently confirmed schedule before field assignment';
  END IF;

  SELECT *
  INTO v_existing_event
  FROM public.rental_pickup_dispatch_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
    AND idempotency_key = v_idempotency_key;

  IF FOUND THEN
    IF v_existing_event.actor_id = p_actor_id
       AND v_existing_event.event_type = 'field_actor_assigned'
       AND v_existing_event.assigned_actor_id = p_actor_id
       AND v_existing_event.notes IS NOT DISTINCT FROM v_notes THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_rfq.pickup_task_id,
        'dispatch_event_id', v_existing_event.id,
        'correlation_id', v_existing_event.correlation_id,
        'event_type', v_existing_event.event_type,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup dispatch idempotency key conflicts with an existing command';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.rental_pickup_dispatch_events
    WHERE pickup_task_id = v_rfq.pickup_task_id
  ) THEN
    RAISE EXCEPTION 'Pickup task already has a field assignment; reassignment is not authorized';
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_rfq.pickup_task_id,
    p_event_type                       := 'pickup.field_actor_assigned',
    p_event_category                   := 'vendor',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'vendor_dispatcher',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'dispatch_state', 'field_actor_assigned',
                                             'assigned_actor_id', p_actor_id
                                           ),
    p_reason                           := v_notes,
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_rfq.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'pickup_task_id', v_rfq.pickup_task_id,
                                             'non_financial', true,
                                             'billing_authority', false,
                                             'custody_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_dispatch_events (
    id, pickup_task_id, rfq_id, event_sequence, event_type, actor_id,
    actor_role, assigned_actor_id, notes, idempotency_key, correlation_id,
    audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_rfq.pickup_task_id, p_rfq_id, 1, 'field_actor_assigned',
    p_actor_id, 'vendor_dispatcher', p_actor_id, v_notes, v_idempotency_key,
    v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_rfq.pickup_task_id,
    'dispatch_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', 'field_actor_assigned',
    'idempotent_replay', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.record_rental_pickup_dispatch_progress(
  p_rfq_id          uuid,
  p_actor_id        uuid,
  p_progress        text,
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
  v_latest_event     record;
  v_existing_event   record;
  v_event_id         uuid := gen_random_uuid();
  v_correlation_id   uuid := gen_random_uuid();
  v_audit_event_id   uuid;
  v_event_type       text;
  v_expected_prior   text;
  v_notes            text := NULLIF(btrim(p_notes), '');
  v_idempotency_key  text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup dispatch progress actor is required';
  END IF;
  IF p_progress NOT IN ('en_route', 'arrived') THEN
    RAISE EXCEPTION 'Pickup dispatch progress must be en_route or arrived';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup dispatch progress notes cannot exceed 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup dispatch idempotency key must contain 1 to 200 characters';
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
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before dispatch progress; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup dispatch actor simulation scope does not match RFQ %', p_rfq_id;
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
    RAISE EXCEPTION 'Actor % lacks assigned-vendor dispatch progress authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT *
  INTO v_existing_event
  FROM public.rental_pickup_dispatch_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
    AND idempotency_key = v_idempotency_key;

  v_event_type := CASE p_progress
    WHEN 'en_route' THEN 'en_route_recorded'
    ELSE 'arrival_recorded'
  END;

  IF FOUND THEN
    IF v_existing_event.actor_id = p_actor_id
       AND v_existing_event.assigned_actor_id = p_actor_id
       AND v_existing_event.event_type = v_event_type
       AND v_existing_event.notes IS NOT DISTINCT FROM v_notes THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_rfq.pickup_task_id,
        'dispatch_event_id', v_existing_event.id,
        'correlation_id', v_existing_event.correlation_id,
        'event_type', v_existing_event.event_type,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup dispatch idempotency key conflicts with an existing command';
  END IF;

  SELECT *
  INTO v_latest_event
  FROM public.rental_pickup_dispatch_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
  ORDER BY event_sequence DESC
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Pickup task requires a field assignment before dispatch progress';
  END IF;
  IF v_latest_event.assigned_actor_id <> p_actor_id THEN
    RAISE EXCEPTION 'Actor % is not the assigned pickup field actor for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  v_expected_prior := CASE p_progress
    WHEN 'en_route' THEN 'field_actor_assigned'
    ELSE 'en_route_recorded'
  END;
  IF v_latest_event.event_type <> v_expected_prior THEN
    RAISE EXCEPTION 'Pickup dispatch transition % requires prior state %; current state is %',
      p_progress, v_expected_prior, v_latest_event.event_type;
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
                                             'dispatch_state', v_latest_event.event_type
                                           ),
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'dispatch_state', v_event_type
                                           ),
    p_reason                           := v_notes,
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_rfq.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'pickup_task_id', v_rfq.pickup_task_id,
                                             'assigned_actor_id', p_actor_id,
                                             'non_financial', true,
                                             'billing_authority', false,
                                             'custody_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_dispatch_events (
    id, pickup_task_id, rfq_id, event_sequence, event_type, actor_id,
    actor_role, assigned_actor_id, notes, idempotency_key, correlation_id,
    audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_rfq.pickup_task_id, p_rfq_id, v_latest_event.event_sequence + 1,
    v_event_type, p_actor_id, 'assigned_field_actor', p_actor_id, v_notes,
    v_idempotency_key, v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_rfq.pickup_task_id,
    'dispatch_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', v_event_type,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.assign_rental_pickup_field_actor(
  uuid, uuid, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.assign_rental_pickup_field_actor(
  uuid, uuid, text, text
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.record_rental_pickup_dispatch_progress(
  uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_pickup_dispatch_progress(
  uuid, uuid, text, text, text
) TO service_role;

-- Deliberate authority boundary: no rental_requests update, no billing field,
-- no stop-rent rule, no override, no custody/condition/collection assertion,
-- and no line/item/unit/quantity/kit/component/partial-return scope is added.
