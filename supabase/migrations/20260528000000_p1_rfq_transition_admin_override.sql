-- P1-3A Gate 2: Add admin_override flag to audit event metadata
--
-- Adds 'admin_override' boolean to the metadata jsonb_build_object inside
-- transition_rfq_status(). True when p_source = 'admin_action'.
-- No signature change. No new tables. No new columns. No policy changes.
-- Depends on: 20260527000000_p1_rfq_transition_allowlist.sql

CREATE OR REPLACE FUNCTION public.transition_rfq_status(
  p_rfq_id       uuid,
  p_new_status   public.app_rfq_status,
  p_actor_id     uuid,
  p_actor_role   text    DEFAULT NULL,
  p_reason       text    DEFAULT NULL,
  p_source       text    DEFAULT 'system',
  p_is_simulated boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status public.app_rfq_status;
  v_correlation_id uuid;
  v_audit_event_id uuid;
  v_rfq            record;
  v_transition_key text;
BEGIN
  SELECT id, operational_status, customer_id, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  v_current_status := v_rfq.operational_status;

  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'RFQ % is already in status %', p_rfq_id, p_new_status;
  END IF;

  IF v_current_status IN (
    'completed'::public.app_rfq_status,
    'cancelled'::public.app_rfq_status,
    'rejected'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ % is in terminal status % — cannot transition', p_rfq_id, v_current_status;
  END IF;

  v_transition_key := v_current_status::text || ':' || p_new_status::text;

  IF NOT (v_transition_key = ANY(ARRAY[
    'draft:submitted',
    'draft:cancelled',
    'submitted:pending_vendor_review',
    'submitted:cancelled',
    'pending_vendor_review:vendor_quote_received',
    'pending_vendor_review:cancelled',
    'vendor_quote_received:quote_accepted',
    'vendor_quote_received:cancelled',
    'vendor_quote_received:rejected',
    'quote_accepted:vendor_confirmed',
    'quote_accepted:cancelled',
    'quote_accepted:rejected',
    'vendor_confirmed:mobilizing',
    'vendor_confirmed:cancelled',
    'mobilizing:in_transit',
    'mobilizing:cancelled',
    'in_transit:on_rent',
    'on_rent:off_rent_requested',
    'off_rent_requested:demobilizing',
    'demobilizing:off_rent',
    'off_rent:completed'
  ])) THEN
    RAISE EXCEPTION 'Invalid transition for RFQ %: % → % is not an allowed status transition',
      p_rfq_id, v_current_status, p_new_status;
  END IF;

  v_correlation_id := gen_random_uuid();

  v_audit_event_id := public.log_audit_event(
    p_correlation_id                  := v_correlation_id,
    p_entity_type                     := 'rental_request',
    p_entity_id                       := p_rfq_id,
    p_event_type                      := 'status_transition',
    p_event_category                  := 'rfq',
    p_actor_id                        := p_actor_id,
    p_actor_role                      := p_actor_role,
    p_actor_type                      := CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'user' END,
    p_old_value                       := jsonb_build_object('operational_status', v_current_status::text),
    p_new_value                       := jsonb_build_object('operational_status', p_new_status::text),
    p_reason                          := p_reason,
    p_source                          := p_source,
    p_severity                        := 'info',
    p_is_simulated                    := p_is_simulated,
    p_related_rfq_id                  := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                        := jsonb_build_object(
                                           'previous_status', v_current_status::text,
                                           'new_status',      p_new_status::text,
                                           'admin_override',  (p_source = 'admin_action')
                                         )
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, v_current_status, p_new_status, p_actor_id, p_actor_role,
    p_reason, v_correlation_id, v_audit_event_id, p_is_simulated
  );

  UPDATE public.rental_requests SET
    operational_status = p_new_status,
    submitted_at = CASE WHEN p_new_status = 'submitted'::public.app_rfq_status THEN now() ELSE submitted_at END,
    confirmed_at = CASE WHEN p_new_status = 'vendor_confirmed'::public.app_rfq_status THEN now() ELSE confirmed_at END,
    on_rent_at   = CASE WHEN p_new_status = 'on_rent'::public.app_rfq_status THEN now() ELSE on_rent_at END,
    off_rent_at  = CASE WHEN p_new_status = 'off_rent'::public.app_rfq_status THEN now() ELSE off_rent_at END,
    closed_at    = CASE WHEN p_new_status IN (
                          'completed'::public.app_rfq_status,
                          'cancelled'::public.app_rfq_status,
                          'rejected'::public.app_rfq_status
                        ) THEN now() ELSE closed_at END
  WHERE id = p_rfq_id;

  RETURN v_correlation_id;
END;
$$;

-- Re-apply EXECUTE gate to preserve SECURITY DEFINER protections.
-- CREATE OR REPLACE resets privileges on some Supabase local stack versions.
REVOKE EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean
) TO service_role;
