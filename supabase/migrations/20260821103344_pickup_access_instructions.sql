-- Governed RFQ-wide customer pickup access instructions.
--
-- Instructions are append-only operational coordination evidence. They do not
-- establish assignment, collection, custody, condition, return completion,
-- stop-rent, billing, invoice, exception-resolution, or granular authority.

CREATE TABLE public.rental_pickup_access_instruction_events (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id     uuid NOT NULL,
  rfq_id             uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  event_sequence     integer NOT NULL CHECK (event_sequence > 0),
  event_type         text NOT NULL DEFAULT 'access_instructions_added'
                     CHECK (event_type = 'access_instructions_added'),
  actor_id           uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role         text NOT NULL DEFAULT 'customer'
                     CHECK (actor_role = 'customer'),
  instruction_type   text NOT NULL CHECK (instruction_type IN (
                       'site_access', 'site_contact', 'pickup_location',
                       'safety_requirement', 'entry_restriction', 'other'
                     )),
  instructions       text NOT NULL CHECK (
                       length(btrim(instructions)) BETWEEN 1 AND 4000
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

ALTER TABLE public.rental_pickup_access_instruction_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_access_instruction_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rental_pickup_access_instruction_events TO service_role;

CREATE POLICY "pickup_access_instruction_events_service_read"
  ON public.rental_pickup_access_instruction_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_access_instruction_events_rfq
  ON public.rental_pickup_access_instruction_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_access_instruction_events_actor
  ON public.rental_pickup_access_instruction_events (actor_id);

CREATE TRIGGER rental_pickup_access_instruction_events_immutable
BEFORE UPDATE OR DELETE ON public.rental_pickup_access_instruction_events
FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.record_rental_pickup_access_instructions(
  p_rfq_id          uuid,
  p_actor_id        uuid,
  p_instruction_type text,
  p_instructions    text,
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
  v_instruction_type text := lower(NULLIF(btrim(p_instruction_type), ''));
  v_instructions     text := NULLIF(btrim(p_instructions), '');
  v_idempotency_key  text := NULLIF(btrim(p_idempotency_key), '');
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'Pickup access-instruction actor is required';
  END IF;
  IF v_instruction_type IS NULL OR v_instruction_type NOT IN (
    'site_access', 'site_contact', 'pickup_location',
    'safety_requirement', 'entry_restriction', 'other'
  ) THEN
    RAISE EXCEPTION 'Pickup access-instruction type must be one of the governed values';
  END IF;
  IF v_instructions IS NULL OR length(v_instructions) > 4000 THEN
    RAISE EXCEPTION 'Pickup access instructions must contain 1 to 4000 characters';
  END IF;
  IF v_idempotency_key IS NULL OR length(v_idempotency_key) > 200 THEN
    RAISE EXCEPTION 'Pickup access-instruction idempotency key must contain 1 to 200 characters';
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
    RAISE EXCEPTION 'RFQ % must be demobilizing or off_rent before pickup access instructions; current status is %',
      p_rfq_id, v_rfq.operational_status;
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup access-instruction actor simulation scope does not match RFQ %', p_rfq_id;
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
    RAISE EXCEPTION 'Actor % lacks customer pickup access-instruction authority for RFQ %',
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
  FROM public.rental_pickup_access_instruction_events
  WHERE pickup_task_id = v_task.id
    AND idempotency_key = v_idempotency_key;

  IF FOUND THEN
    IF v_existing.actor_id = p_actor_id
       AND v_existing.instruction_type = v_instruction_type
       AND v_existing.instructions = v_instructions THEN
      RETURN jsonb_build_object(
        'pickup_task_id', v_task.id,
        'access_instruction_event_id', v_existing.id,
        'correlation_id', v_existing.correlation_id,
        'event_type', v_existing.event_type,
        'idempotent_replay', true
      );
    END IF;
    RAISE EXCEPTION 'Pickup access-instruction idempotency key conflicts with an existing command';
  END IF;

  SELECT COALESCE(max(event_sequence), 0) + 1 INTO v_sequence
  FROM public.rental_pickup_access_instruction_events
  WHERE pickup_task_id = v_task.id;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_task.id,
    p_event_type                       := 'pickup.access_instructions_added',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'customer',
    p_actor_type                       := 'user',
    p_new_value                        := jsonb_build_object(
                                             'rfq_id', p_rfq_id,
                                             'object_scope', 'rfq',
                                             'instruction_type', v_instruction_type
                                           ),
    p_reason                           := v_instructions,
    p_source                           := 'customer_action',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_task.customer_organization_id,
    p_related_vendor_organization_id   := v_task.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'non_financial', true,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_access_instruction_events (
    id, pickup_task_id, rfq_id, event_sequence, actor_id, instruction_type,
    instructions, idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_task.id, p_rfq_id, v_sequence, p_actor_id,
    v_instruction_type, v_instructions, v_idempotency_key, v_correlation_id,
    v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'pickup_task_id', v_task.id,
    'access_instruction_event_id', v_event_id,
    'correlation_id', v_correlation_id,
    'event_type', 'access_instructions_added',
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_pickup_access_instructions(
  uuid, uuid, text, text, text
) FROM PUBLIC, anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.record_rental_pickup_access_instructions(
  uuid, uuid, text, text, text
) TO service_role;
