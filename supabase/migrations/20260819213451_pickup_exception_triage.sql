-- Non-authoritative RFQ-wide pickup-exception triage.
--
-- Resolution authority is deliberately absent. Operations actors may claim an
-- exception for themselves, append internal notes, and escalate it. These
-- events cannot resolve the exception or establish custody, return completion,
-- stop-rent, billing, invoice, override, or granular rental authority.

CREATE TABLE public.rental_pickup_exception_triage_events (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pickup_task_id       uuid NOT NULL,
  rfq_id               uuid NOT NULL,
  attempt_event_id     uuid NOT NULL
                       REFERENCES public.rental_pickup_attempt_events ON DELETE RESTRICT,
  event_sequence       integer NOT NULL CHECK (event_sequence > 0),
  event_type           text NOT NULL CHECK (event_type IN (
                         'triage_claimed',
                         'triage_note_added',
                         'triage_escalated'
                       )),
  actor_id             uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  actor_role           text NOT NULL CHECK (actor_role = 'platform_operations'),
  assigned_actor_id    uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  escalation_reason    text CHECK (escalation_reason IS NULL OR escalation_reason IN (
                         'additional_information_required',
                         'customer_coordination_review',
                         'vendor_coordination_review',
                         'site_access_review',
                         'safety_review',
                         'operations_review'
                       )),
  notes                text CHECK (notes IS NULL OR length(notes) <= 4000),
  idempotency_key      text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 200),
  correlation_id       uuid NOT NULL UNIQUE,
  audit_event_id       uuid NOT NULL UNIQUE
                       REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated         boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (pickup_task_id, event_sequence),
  UNIQUE (pickup_task_id, idempotency_key),
  FOREIGN KEY (pickup_task_id, rfq_id, is_simulated)
    REFERENCES public.rental_pickup_tasks (id, rfq_id, is_simulated)
    ON DELETE RESTRICT,
  CHECK (
    (event_type = 'triage_claimed' AND escalation_reason IS NULL)
    OR (event_type = 'triage_note_added' AND escalation_reason IS NULL AND notes IS NOT NULL)
    OR (event_type = 'triage_escalated' AND escalation_reason IS NOT NULL AND notes IS NOT NULL)
  )
);

ALTER TABLE public.rental_pickup_exception_triage_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON TABLE public.rental_pickup_exception_triage_events
  FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT ON TABLE public.rental_pickup_exception_triage_events TO service_role;

CREATE POLICY "pickup_exception_triage_service_read"
  ON public.rental_pickup_exception_triage_events FOR SELECT TO service_role
  USING (true);

CREATE INDEX idx_pickup_exception_triage_rfq
  ON public.rental_pickup_exception_triage_events (rfq_id, event_sequence);
CREATE INDEX idx_pickup_exception_triage_attempt
  ON public.rental_pickup_exception_triage_events (attempt_event_id);
CREATE INDEX idx_pickup_exception_triage_actor
  ON public.rental_pickup_exception_triage_events (actor_id);
CREATE INDEX idx_pickup_exception_triage_assignee
  ON public.rental_pickup_exception_triage_events (assigned_actor_id);

CREATE TRIGGER rental_pickup_exception_triage_events_immutable
  BEFORE UPDATE OR DELETE ON public.rental_pickup_exception_triage_events
  FOR EACH ROW EXECUTE FUNCTION public.prevent_rental_pickup_record_mutation();

CREATE OR REPLACE FUNCTION public.pickup_exception_triage_actor(p_actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    JOIN public.profiles AS p ON p.id = ur.user_id
    WHERE ur.user_id = p_actor_id
      AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
      AND p.status = 'active'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.pickup_exception_triage_actor(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pickup_exception_triage_actor(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.record_rental_pickup_exception_triage(
  p_rfq_id uuid,
  p_actor_id uuid,
  p_action text,
  p_escalation_reason text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_idempotency_key text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_action              text := lower(trim(COALESCE(p_action, '')));
  v_reason              text := NULLIF(lower(trim(COALESCE(p_escalation_reason, ''))), '');
  v_notes               text := NULLIF(trim(COALESCE(p_notes, '')), '');
  v_idempotency_key     text := trim(COALESCE(p_idempotency_key, ''));
  v_event_type          text;
  v_event_id            uuid := gen_random_uuid();
  v_correlation_id      uuid := gen_random_uuid();
  v_audit_event_id      uuid;
  v_sequence            integer;
  v_assigned_actor_id   uuid;
  v_latest_event_type   text;
  v_existing            record;
  v_rfq                 record;
BEGIN
  IF NOT public.pickup_exception_triage_actor(p_actor_id) THEN
    RAISE EXCEPTION 'Actor % lacks pickup exception triage authority', p_actor_id;
  END IF;
  IF v_action NOT IN ('claim', 'note', 'escalate') THEN
    RAISE EXCEPTION 'Pickup exception triage action must be claim, note, or escalate';
  END IF;
  IF length(v_idempotency_key) NOT BETWEEN 1 AND 200 THEN
    RAISE EXCEPTION 'Pickup exception triage idempotency key must contain 1 to 200 characters';
  END IF;
  IF v_notes IS NOT NULL AND length(v_notes) > 4000 THEN
    RAISE EXCEPTION 'Pickup exception triage notes cannot exceed 4000 characters';
  END IF;
  IF v_action IN ('note', 'escalate') AND v_notes IS NULL THEN
    RAISE EXCEPTION 'Pickup exception triage notes are required for note and escalate actions';
  END IF;
  IF v_action = 'escalate' AND v_reason NOT IN (
    'additional_information_required',
    'customer_coordination_review',
    'vendor_coordination_review',
    'site_access_review',
    'safety_review',
    'operations_review'
  ) THEN
    RAISE EXCEPTION 'Pickup exception escalation reason must be governed';
  END IF;
  IF v_action <> 'escalate' AND v_reason IS NOT NULL THEN
    RAISE EXCEPTION 'Pickup exception escalation reason is permitted only for escalation';
  END IF;
  v_event_type := CASE v_action
    WHEN 'claim' THEN 'triage_claimed'
    WHEN 'note' THEN 'triage_note_added'
    ELSE 'triage_escalated'
  END;

  SELECT
    rr.id AS rfq_id,
    rr.customer_organization_id,
    rpt.vendor_organization_id,
    rr.is_simulated,
    rpt.id AS pickup_task_id,
    rpt.object_scope,
    rae.id AS attempt_event_id,
    rae.event_type AS attempt_event_type
  INTO v_rfq
  FROM public.rental_requests AS rr
  JOIN public.rental_pickup_tasks AS rpt ON rpt.rfq_id = rr.id
  JOIN public.rental_pickup_attempt_events AS rae ON rae.pickup_task_id = rpt.id
  WHERE rr.id = p_rfq_id
  FOR UPDATE OF rr;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Required failed pickup exception record not found for RFQ %', p_rfq_id;
  END IF;
  IF v_rfq.object_scope <> 'rfq' THEN
    RAISE EXCEPTION 'Pickup exception triage scope must remain RFQ-wide';
  END IF;
  IF v_rfq.attempt_event_type <> 'attempt_failed' THEN
    RAISE EXCEPTION 'Pickup exception triage requires a failed pickup attempt';
  END IF;
  IF public.is_demo_actor(p_actor_id) <> v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Pickup exception triage actor simulation scope does not match RFQ';
  END IF;

  SELECT * INTO v_existing
  FROM public.rental_pickup_exception_triage_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
    AND idempotency_key = v_idempotency_key;
  IF FOUND THEN
    IF v_existing.event_type = v_event_type
      AND v_existing.actor_id = p_actor_id
      AND v_existing.escalation_reason IS NOT DISTINCT FROM v_reason
      AND v_existing.notes IS NOT DISTINCT FROM v_notes THEN
      RETURN jsonb_build_object(
        'triage_event_id', v_existing.id,
        'pickup_task_id', v_existing.pickup_task_id,
        'correlation_id', v_existing.correlation_id,
        'event_type', v_existing.event_type,
        'idempotent_replay', true,
        'resolution_authority', false
      );
    END IF;
    RAISE EXCEPTION 'Pickup exception triage idempotency key conflicts with an existing event';
  END IF;

  SELECT assigned_actor_id, event_type
    INTO v_assigned_actor_id, v_latest_event_type
  FROM public.rental_pickup_exception_triage_events
  WHERE pickup_task_id = v_rfq.pickup_task_id
  ORDER BY event_sequence DESC
  LIMIT 1;

  IF v_latest_event_type = 'triage_escalated' THEN
    RAISE EXCEPTION 'Pickup exception triage is already escalated; further mutation is not authorized';
  END IF;

  IF v_action = 'claim' THEN
    IF v_assigned_actor_id IS NOT NULL THEN
      RAISE EXCEPTION 'Pickup exception triage is already claimed; reassignment is not authorized';
    END IF;
    v_assigned_actor_id := p_actor_id;
  ELSE
    IF v_assigned_actor_id IS NULL THEN
      RAISE EXCEPTION 'Pickup exception triage must be claimed before notes or escalation';
    END IF;
    IF v_assigned_actor_id <> p_actor_id THEN
      RAISE EXCEPTION 'Actor % is not the assigned pickup exception triage actor', p_actor_id;
    END IF;
  END IF;

  SELECT COALESCE(max(event_sequence), 0) + 1 INTO v_sequence
  FROM public.rental_pickup_exception_triage_events
  WHERE pickup_task_id = v_rfq.pickup_task_id;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_pickup_task',
    p_entity_id                        := v_rfq.pickup_task_id,
    p_event_type                       := 'pickup.exception.' || v_event_type,
    p_event_category                   := 'exception',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := 'platform_operations',
    p_actor_type                       := 'user',
    p_old_value                        := jsonb_build_object('exception_state', 'review_required'),
    p_new_value                        := jsonb_build_object(
                                             'exception_state', 'review_required',
                                             'triage_event_type', v_event_type,
                                             'resolution_state', 'blocked'
                                           ),
    p_reason                           := COALESCE(v_reason, v_notes),
    p_source                           := 'admin_action',
    p_severity                         := CASE WHEN v_event_type = 'triage_escalated'
                                             THEN 'warning' ELSE 'info' END,
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_rfq.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'pickup_task_id', v_rfq.pickup_task_id,
                                             'attempt_event_id', v_rfq.attempt_event_id,
                                             'non_authoritative_triage', true,
                                             'resolution_authority', false,
                                             'billing_authority', false,
                                             'custody_authority', false,
                                             'return_completion_authority', false,
                                             'invoice_authority', false,
                                             'granular_scope_authority', false
                                           )
  );

  INSERT INTO public.rental_pickup_exception_triage_events (
    id, pickup_task_id, rfq_id, attempt_event_id, event_sequence, event_type,
    actor_id, actor_role, assigned_actor_id, escalation_reason, notes,
    idempotency_key, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_event_id, v_rfq.pickup_task_id, p_rfq_id, v_rfq.attempt_event_id,
    v_sequence, v_event_type, p_actor_id, 'platform_operations',
    v_assigned_actor_id, v_reason, v_notes, v_idempotency_key,
    v_correlation_id, v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'triage_event_id', v_event_id,
    'pickup_task_id', v_rfq.pickup_task_id,
    'correlation_id', v_correlation_id,
    'event_type', v_event_type,
    'idempotent_replay', false,
    'resolution_authority', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_pickup_exception_triage(
  uuid, uuid, text, text, text, text
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_pickup_exception_triage(
  uuid, uuid, text, text, text, text
) TO service_role;

CREATE OR REPLACE FUNCTION public.get_rental_pickup_exception_triage_queue(
  p_actor_id uuid
)
RETURNS TABLE (
  rfq_id uuid,
  pickup_task_id uuid,
  attempt_event_id uuid,
  attempt_reason_code text,
  attempt_notes text,
  attempt_created_at timestamptz,
  triage_state text,
  assigned_to_caller boolean,
  escalation_reason text,
  latest_triage_at timestamptz,
  note_count bigint,
  internal_timeline jsonb,
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
  WITH latest AS (
    SELECT DISTINCT ON (te.pickup_task_id)
      te.pickup_task_id,
      te.assigned_actor_id,
      te.event_type,
      te.escalation_reason,
      te.created_at
    FROM public.rental_pickup_exception_triage_events AS te
    ORDER BY te.pickup_task_id, te.event_sequence DESC
  ), timeline AS (
    SELECT
      te.pickup_task_id,
      count(*) FILTER (WHERE te.event_type = 'triage_note_added') AS note_count,
      jsonb_agg(jsonb_build_object(
        'id', te.id,
        'event_sequence', te.event_sequence,
        'event_type', te.event_type,
        'escalation_reason', te.escalation_reason,
        'notes', te.notes,
        'created_at', te.created_at,
        'performed_by_caller', te.actor_id = p_actor_id
      ) ORDER BY te.event_sequence) AS events
    FROM public.rental_pickup_exception_triage_events AS te
    GROUP BY te.pickup_task_id
  )
  SELECT
    ae.rfq_id,
    ae.pickup_task_id,
    ae.id,
    ae.reason_code,
    ae.notes,
    ae.created_at,
    CASE
      WHEN l.pickup_task_id IS NULL THEN 'unassigned'
      WHEN l.event_type = 'triage_escalated' THEN 'escalated'
      ELSE 'claimed'
    END,
    COALESCE(l.assigned_actor_id = p_actor_id, false),
    l.escalation_reason,
    l.created_at,
    COALESCE(t.note_count, 0),
    COALESCE(t.events, '[]'::jsonb),
    'blocked'::text
  FROM public.rental_pickup_attempt_events AS ae
  JOIN public.rental_pickup_tasks AS pt ON pt.id = ae.pickup_task_id
  LEFT JOIN latest AS l ON l.pickup_task_id = ae.pickup_task_id
  LEFT JOIN timeline AS t ON t.pickup_task_id = ae.pickup_task_id
  WHERE ae.event_type = 'attempt_failed'
    AND ae.is_simulated = public.is_demo_actor(p_actor_id)
    AND pt.object_scope = 'rfq'
  ORDER BY ae.created_at ASC;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.get_rental_pickup_exception_triage_queue(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_rental_pickup_exception_triage_queue(uuid)
  TO service_role;

-- Deliberate authority boundary: no resolution command or resolved state is
-- present. Customer/vendor information remains available through existing
-- governed pickup events and sanitized projections; only platform operations
-- can append triage events. No billing, custody, return, invoice, stop-rent,
-- override, retry, reassignment, granular, or partial authority is created.
