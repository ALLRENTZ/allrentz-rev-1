-- Governed RFQ-wide PickupTask operational slice.
--
-- This migration adds a non-financial logistics object and an append-only
-- schedule ledger. Pickup scheduling is deliberately independent from rental
-- lifecycle state, contractual stop authority, billing cutoff, custody,
-- condition, invoice liability, and granular equipment scope.

CREATE UNIQUE INDEX IF NOT EXISTS idx_off_rent_requests_scope_identity
  ON public.rental_off_rent_requests (id, rfq_id, is_simulated);

CREATE UNIQUE INDEX IF NOT EXISTS idx_off_rent_acknowledgments_scope_identity
  ON public.rental_off_rent_acknowledgments (
    id, rfq_id, vendor_organization_id, is_simulated
  );

CREATE TABLE public.rental_pickup_tasks (
  id                         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                     uuid NOT NULL UNIQUE
                             REFERENCES public.rental_requests ON DELETE RESTRICT,
  off_rent_request_id        uuid NOT NULL UNIQUE,
  off_rent_acknowledgment_id uuid NOT NULL UNIQUE,
  customer_organization_id   uuid NOT NULL
                             REFERENCES public.organizations ON DELETE RESTRICT,
  vendor_organization_id     uuid NOT NULL
                             REFERENCES public.organizations ON DELETE RESTRICT,
  object_scope               text NOT NULL DEFAULT 'rfq'
                             CHECK (object_scope = 'rfq'),
  created_by                 uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  correlation_id             uuid NOT NULL UNIQUE,
  created_audit_event_id     uuid NOT NULL UNIQUE
                             REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated               boolean NOT NULL DEFAULT false,
  created_at                 timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, rfq_id, is_simulated),
  FOREIGN KEY (off_rent_request_id, rfq_id, is_simulated)
    REFERENCES public.rental_off_rent_requests (id, rfq_id, is_simulated)
    ON DELETE RESTRICT,
  FOREIGN KEY (
    off_rent_acknowledgment_id, rfq_id, vendor_organization_id, is_simulated
  ) REFERENCES public.rental_off_rent_acknowledgments (
    id, rfq_id, vendor_organization_id, is_simulated
  ) ON DELETE RESTRICT
);

CREATE TABLE public.rental_pickup_schedule_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id     uuid NOT NULL,
  rfq_id             uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  event_sequence     integer NOT NULL CHECK (event_sequence > 0),
  event_type         text NOT NULL CHECK (event_type IN (
                       'schedule_proposed',
                       'schedule_reschedule_proposed',
                       'schedule_confirmed',
                       'schedule_rejected'
                     )),
  actor_id           uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role         text NOT NULL CHECK (actor_role IN (
                       'vendor_scheduler', 'customer'
                     )),
  pickup_window_start timestamptz NOT NULL,
  pickup_window_end   timestamptz NOT NULL,
  reason_code         text CHECK (reason_code IS NULL OR reason_code IN (
                        'customer_access_conflict',
                        'vendor_capacity',
                        'site_restriction',
                        'weather_or_safety',
                        'equipment_not_ready',
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
  CHECK (pickup_window_end > pickup_window_start),
  UNIQUE (pickup_task_id, event_sequence),
  UNIQUE (pickup_task_id, idempotency_key),
  FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)
    REFERENCES public.rental_pickup_tasks (id, rfq_id, is_simulated)
    ON DELETE RESTRICT
);

ALTER TABLE public.rental_pickup_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_pickup_schedule_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_tasks
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_schedule_events
  FROM PUBLIC, anon, authenticated, service_role;

-- The Edge Function assembles a sanitized read-only projection only after the
-- caller proves RFQ access through the existing rental_requests RLS boundary.
GRANT SELECT ON TABLE public.rental_pickup_tasks TO service_role;
GRANT SELECT ON TABLE public.rental_pickup_schedule_events TO service_role;

CREATE POLICY "pickup_tasks_service_read"
  ON public.rental_pickup_tasks FOR SELECT TO service_role
  USING (true);

CREATE POLICY "pickup_schedule_events_service_read"
  ON public.rental_pickup_schedule_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_tasks_customer_org
  ON public.rental_pickup_tasks (customer_organization_id);
CREATE INDEX idx_pickup_tasks_vendor_org
  ON public.rental_pickup_tasks (vendor_organization_id);
CREATE INDEX idx_pickup_tasks_created_by
  ON public.rental_pickup_tasks (created_by);
CREATE INDEX idx_pickup_schedule_events_rfq
  ON public.rental_pickup_schedule_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_schedule_events_actor
  ON public.rental_pickup_schedule_events (actor_id);

CREATE OR REPLACE FUNCTION public.prevent_rental_pickup_record_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; append a governed pickup event instead',
    TG_TABLE_NAME;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.prevent_rental_pickup_record_mutation()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE TRIGGER rental_pickup_tasks_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_tasks
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE TRIGGER rental_pickup_schedule_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_schedule_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.propose_rental_pickup_schedule(
  p_rfq_id             uuid,
  p_actor_id           uuid,
  p_pickup_window_start timestamptz,
  p_pickup_window_end   timestamptz,
  p_reason_code         text,
  p_notes               text,
  p_idempotency_key     text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq                record;
  v_request            record;
  v_acknowledgment     record;
  v_task               record;
  v_existing_event     record;
  v_latest_event       record;
  v_task_id            uuid := gen_random_uuid();
  v_event_id           uuid := gen_random_uuid();
  v_correlation_id     uuid := gen_random_uuid();
  v_audit_event_id     uuid;
  v_event_type         text;
  v_event_sequence     integer;
  v_reason_code        text := NULLIF(btrim(p_reason_code), '');
  v_notes              text := NULLIF(btrim(p_notes), '');
  v_idempotency_key    text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup schedule actor is required';
  END IF;
  IF p_pickup_window_start IS NULL OR p_pickup_window_end IS NULL THEN
    RAISE EXCEPTION 'Pickup schedule window is required';
  END IF;
  IF p_pickup_window_end <= p_pickup_window_start THEN
    RAISE EXCEPTION 'Pickup schedule window end must be after its start';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup schedule notes cannot exceed 4000 characters';
  END IF;
  IF v_reason_code IS NOT NULL AND v_reason_code NOT IN (
    'customer_access_conflict', 'vendor_capacity', 'site_restriction',
    'weather_or_safety', 'equipment_not_ready', 'contact_issue', 'other'
  ) THEN
    RAISE EXCEPTION 'Pickup schedule reason code must be one of the governed values';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup schedule idempotency key must contain 1 to 200 characters';
  END IF;

  SELECT id, customer_id, customer_organization_id, operational_status, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;
  IF v_rfq.customer_organization_id IS NULL THEN
    RAISE EXCEPTION 'RFQ % has no governed customer organization', p_rfq_id;
  END IF;
  IF v_rfq.operational_status NOT IN (
    'demobilizing'::public.app_rfq_status,
    'off_rent'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before pickup scheduling; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup schedule actor simulation scope does not match RFQ %', p_rfq_id;
  END IF;

  SELECT req.*
  INTO v_request
  FROM public.rental_off_rent_requests AS req
  WHERE req.rfq_id = p_rfq_id
    AND req.is_simulated = v_rfq.is_simulated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Governed off-rent request not found for RFQ %', p_rfq_id;
  END IF;

  SELECT ack.*
  INTO v_acknowledgment
  FROM public.rental_off_rent_acknowledgments AS ack
  JOIN public.vendor_quote_responses AS vqr
    ON vqr.rfq_id = ack.rfq_id
   AND vqr.vendor_organization_id = ack.vendor_organization_id
   AND vqr.status = 'accepted'
   AND vqr.is_simulated = ack.is_simulated
  JOIN public.organization_memberships AS membership
    ON membership.organization_id = ack.vendor_organization_id
   AND membership.user_id = p_actor_id
   AND membership.role IN ('owner', 'admin')
   AND membership.is_simulated = ack.is_simulated
   AND membership.archived_at IS NULL
  JOIN public.organizations AS organization
    ON organization.id = ack.vendor_organization_id
   AND organization.org_type IN ('vendor', 'both')
   AND organization.is_simulated = ack.is_simulated
   AND organization.archived_at IS NULL
  WHERE ack.rfq_id = p_rfq_id
    AND ack.off_rent_request_id = v_request.id
    AND ack.is_simulated = v_rfq.is_simulated
  ORDER BY vqr.accepted_at DESC NULLS LAST
  LIMIT 1;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Actor % lacks accepted-vendor pickup scheduling authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT *
  INTO v_task
  FROM public.rental_pickup_tasks
  WHERE rfq_id = p_rfq_id;

  IF FOUND THEN
    SELECT *
    INTO v_existing_event
    FROM public.rental_pickup_schedule_events
    WHERE pickup_task_id = v_task.id
      AND idempotency_key = v_idempotency_key;

    IF FOUND THEN
      IF v_existing_event.actor_id = p_actor_id
         AND v_existing_event.event_type IN (
           'schedule_proposed', 'schedule_reschedule_proposed'
         )
         AND v_existing_event.pickup_window_start = p_pickup_window_start
         AND v_existing_event.pickup_window_end = p_pickup_window_end
         AND v_existing_event.reason_code IS NOT DISTINCT FROM v_reason_code
         AND v_existing_event.notes IS NOT DISTINCT FROM v_notes THEN
        RETURN jsonb_build_object(
          'pickup_task_id', v_task.id,
          'schedule_event_id', v_existing_event.id,
          'correlation_id', v_existing_event.correlation_id,
          'event_type', v_existing_event.event_type,
          'idempotent_replay', true
        );
      END IF;
      RAISE EXCEPTION 'Pickup schedule idempotency key conflicts with an existing command';
    END IF;

    SELECT *
    INTO v_latest_event
    FROM public.rental_pickup_schedule_events
    WHERE pickup_task_id = v_task.id
    ORDER BY event_sequence DESC
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Pickup task % has no schedule event and fails closed', v_task.id;
    END IF;
    IF v_notes IS NULL THEN
      RAISE EXCEPTION 'A reason is required when proposing a replacement pickup schedule';
    END IF;
    IF v_reason_code IS NULL THEN
      RAISE EXCEPTION 'A structured reason code is required when proposing a replacement pickup schedule';
    END IF;

    v_task_id := v_task.id;
    v_event_type := 'schedule_reschedule_proposed';
    v_event_sequence := v_latest_event.event_sequence + 1;
  ELSE
    IF v_reason_code IS NOT NULL THEN
      RAISE EXCEPTION 'A reason code is only permitted for a replacement pickup schedule';
    END IF;
    v_event_type := 'schedule_proposed';
    v_event_sequence := 1;
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_task_id,
    p_event_type                       := 'pickup.' || v_event_type,
    p_event_category                   := 'vendor',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'vendor_scheduler',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'schedule_state', v_event_type,
                                             'pickup_window_start', p_pickup_window_start,
                                             'pickup_window_end', p_pickup_window_end,
                                             'reason_code', v_reason_code
                                           ),
    p_reason                           := v_notes,
    p_source                           := 'vendor_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_acknowledgment.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'off_rent_request_id', v_request.id,
                                             'off_rent_acknowledgment_id', v_acknowledgment.id,
                                             'non_financial', true,
                                             'billing_authority', false
                                           )
  );

  IF v_task.id IS NULL THEN
    INSERT INTO public.rental_pickup_tasks (
      id, rfq_id, off_rent_request_id, off_rent_acknowledgment_id,
      customer_organization_id, vendor_organization_id, object_scope,
      created_by, correlation_id, created_audit_event_id, is_simulated
    ) VALUES (
      v_task_id, p_rfq_id, v_request.id, v_acknowledgment.id,
      v_rfq.customer_organization_id, v_acknowledgment.vendor_organization_id,
      'rfq', p_actor_id, v_correlation_id, v_audit_event_id,
      v_rfq.is_simulated
    );
  END IF;

  INSERT INTO public.rental_pickup_schedule_events (
    id, pickup_task_id, rfq_id, event_sequence, event_type, actor_id,
    actor_role, pickup_window_start, pickup_window_end, reason_code, notes,
    idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_task_id, p_rfq_id, v_event_sequence, v_event_type,
    p_actor_id, 'vendor_scheduler', p_pickup_window_start,
    p_pickup_window_end, v_reason_code, v_notes, v_idempotency_key, v_correlation_id,
    v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_task_id,
    'schedule_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', v_event_type,
    'idempotent_replay', false
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_rental_pickup_schedule(
  p_rfq_id         uuid,
  p_actor_id       uuid,
  p_decision       text,
  p_reason_code    text,
  p_notes          text,
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
  v_latest_event     record;
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
    RAISE EXCEPTION 'Pickup schedule response actor is required';
  END IF;
  IF p_decision NOT IN ('confirm', 'reject') THEN
    RAISE EXCEPTION 'Pickup schedule decision must be confirm or reject';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup schedule response notes cannot exceed 4000 characters';
  END IF;
  IF v_reason_code IS NOT NULL AND v_reason_code NOT IN (
    'customer_access_conflict', 'vendor_capacity', 'site_restriction',
    'weather_or_safety', 'equipment_not_ready', 'contact_issue', 'other'
  ) THEN
    RAISE EXCEPTION 'Pickup schedule response reason code must be one of the governed values';
  END IF;
  IF p_decision = 'reject' AND (v_reason_code IS NULL OR v_notes IS NULL) THEN
    RAISE EXCEPTION 'A structured reason code and notes are required when rejecting a pickup schedule';
  END IF;
  IF p_decision = 'confirm' AND v_reason_code IS NOT NULL THEN
    RAISE EXCEPTION 'A reason code is only permitted when rejecting a pickup schedule';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup schedule idempotency key must contain 1 to 200 characters';
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
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before a pickup schedule response; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup schedule response actor simulation scope does not match RFQ %', p_rfq_id;
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
    RAISE EXCEPTION 'Actor % lacks customer pickup schedule response authority for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT *
  INTO v_task
  FROM public.rental_pickup_tasks
  WHERE rfq_id = p_rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Governed pickup task not found for RFQ %', p_rfq_id;
  END IF;
  IF v_task.customer_organization_id <> v_rfq.customer_organization_id
     OR v_task.is_simulated <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup task scope does not match RFQ % and fails closed', p_rfq_id;
  END IF;

  SELECT *
  INTO v_existing_event
  FROM public.rental_pickup_schedule_events
  WHERE pickup_task_id = v_task.id
    AND idempotency_key = v_idempotency_key;

  v_event_type := CASE p_decision
    WHEN 'confirm' THEN 'schedule_confirmed'
    ELSE 'schedule_rejected'
  END;

  IF FOUND THEN
    IF v_existing_event.actor_id = p_actor_id
       AND v_existing_event.event_type = v_event_type
       AND v_existing_event.reason_code IS NOT DISTINCT FROM v_reason_code
       AND v_existing_event.notes IS NOT DISTINCT FROM v_notes THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_task.id,
        'schedule_event_id', v_existing_event.id,
        'correlation_id', v_existing_event.correlation_id,
        'event_type', v_existing_event.event_type,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup schedule response idempotency key conflicts with an existing command';
  END IF;

  SELECT *
  INTO v_latest_event
  FROM public.rental_pickup_schedule_events
  WHERE pickup_task_id = v_task.id
  ORDER BY event_sequence DESC
  LIMIT 1;

  IF NOT FOUND OR v_latest_event.event_type NOT IN (
    'schedule_proposed', 'schedule_reschedule_proposed'
  ) THEN
    RAISE EXCEPTION 'Pickup task has no pending schedule proposal for RFQ %', p_rfq_id;
  END IF;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_task.id,
    p_event_type                       := 'pickup.' || v_event_type,
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer',
    p_actor_type                       := 'user',
    p_old_value                        := jsonb_build_object(
                                             'schedule_state', v_latest_event.event_type,
                                             'pickup_window_start', v_latest_event.pickup_window_start,
                                             'pickup_window_end', v_latest_event.pickup_window_end
                                           ),
    p_new_value                        := jsonb_build_object(
                                             'schedule_state', v_event_type,
                                             'pickup_window_start', v_latest_event.pickup_window_start,
                                             'pickup_window_end', v_latest_event.pickup_window_end,
                                             'reason_code', v_reason_code
                                           ),
    p_reason                           := v_notes,
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_task.customer_organization_id,
    p_related_vendor_organization_id   := v_task.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'pickup_task_id', v_task.id,
                                             'responding_to_event_id', v_latest_event.id,
                                             'non_financial', true,
                                             'billing_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_schedule_events (
    id, pickup_task_id, rfq_id, event_sequence, event_type, actor_id,
    actor_role, pickup_window_start, pickup_window_end, reason_code, notes,
    idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_task.id, p_rfq_id, v_latest_event.event_sequence + 1,
    v_event_type, p_actor_id, 'customer',
    v_latest_event.pickup_window_start, v_latest_event.pickup_window_end,
    v_reason_code, v_notes, v_idempotency_key, v_correlation_id, v_audit_event_id,
    v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_task.id,
    'schedule_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', v_event_type,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.propose_rental_pickup_schedule(
  uuid, uuid, timestamptz, timestamptz, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.propose_rental_pickup_schedule(
  uuid, uuid, timestamptz, timestamptz, text, text, text
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.respond_rental_pickup_schedule(
  uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.respond_rental_pickup_schedule(
  uuid, uuid, text, text, text, text
) TO service_role;

-- Deliberate authority boundary: no rental_requests update, no billing field,
-- no stop-rent rule, no override, no custody assertion, and no line/item/unit/
-- quantity/kit/component/partial-return scope is introduced by this migration.
