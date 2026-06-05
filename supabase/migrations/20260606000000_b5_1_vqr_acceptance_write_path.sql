-- B5-1: VQR acceptance write path
--
-- Problem:
--   No code path sets vendor_quote_responses.status to 'accepted' through any
--   real user operation. rfq_vendor_has_accepted_quote() checks this condition
--   and can never return true. Every vendor transition after quote_accepted is
--   permanently deadlocked.
--
-- Fix:
--   Add p_vqr_id uuid (DEFAULT NULL) to transition_rfq_status().
--   When p_new_status = 'quote_accepted':
--     - p_vqr_id is required; raise exception if NULL (Edge Function enforces
--       this before the RPC call, but the DB also guards it).
--     - UPDATE vendor_quote_responses SET status='accepted', accepted_by,
--       accepted_at, updated_at atomically inside this transaction.
--     - Validate VQR belongs to this RFQ and is not already finalized.
--     - If NOT FOUND, raise exception — rolls back all prior writes.
--
-- Event Integrity Rule compliance:
--   log_audit_event() remains the first write. If it fails the entire
--   transaction (including the VQR update) rolls back with no state change.
--   If the VQR update fails, the exception rolls back the audit event,
--   rfq_operational_status insert, and rental_requests update — no split state.
--
-- SECURITY DEFINER note:
--   transition_rfq_status() runs as postgres (function owner), bypassing all
--   RLS including vqr_update_vendor. The VQR UPDATE inside the function is the
--   only authorized path that can set status='accepted'. vqr_update_vendor
--   already prohibits authenticated users from setting finalized statuses.
--
-- No new tables, columns, enums, indexes, or RLS policies.
-- Depends on: 20260605000000_b4a_fix_rfq_vendor_select.sql

-- Drop the previous 7-parameter overload before replacing.
-- CREATE OR REPLACE with a new signature creates an overload in PostgreSQL
-- rather than replacing the existing function. Dropping first ensures only
-- one overload exists and prevents ambiguous RPC routing.
DROP FUNCTION IF EXISTS public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean
);

CREATE OR REPLACE FUNCTION public.transition_rfq_status(
  p_rfq_id       uuid,
  p_new_status   public.app_rfq_status,
  p_actor_id     uuid,
  p_actor_role   text    DEFAULT NULL,
  p_reason       text    DEFAULT NULL,
  p_source       text    DEFAULT 'system',
  p_is_simulated boolean DEFAULT false,
  p_vqr_id       uuid    DEFAULT NULL
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

  IF p_new_status = 'quote_accepted'::public.app_rfq_status AND p_vqr_id IS NULL THEN
    RAISE EXCEPTION 'vqr_id is required for quote_accepted transition on RFQ %', p_rfq_id;
  END IF;

  v_correlation_id := gen_random_uuid();

  -- Event Integrity Rule: audit event written first.
  -- Any failure here rolls back the entire transaction with no state change.
  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := p_actor_role,
    p_actor_type                       := CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'user' END,
    p_old_value                        := jsonb_build_object('operational_status', v_current_status::text),
    p_new_value                        := jsonb_build_object('operational_status', p_new_status::text),
    p_reason                           := p_reason,
    p_source                           := p_source,
    p_severity                         := 'info',
    p_is_simulated                     := p_is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                         := jsonb_build_object(
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

  -- Atomically update the accepted VQR when the customer accepts a quote.
  -- This is the only authorized path that sets vendor_quote_responses.status = 'accepted'.
  -- Failure here raises an exception, rolling back all prior writes in this transaction.
  IF p_new_status = 'quote_accepted'::public.app_rfq_status THEN
    UPDATE public.vendor_quote_responses SET
      status      = 'accepted',
      accepted_by = p_actor_id,
      accepted_at = now(),
      updated_at  = now()
    WHERE id     = p_vqr_id
      AND rfq_id = p_rfq_id
      AND status NOT IN ('accepted', 'rejected', 'expired', 'withdrawn');

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'VQR % not found on RFQ %, or is already in a finalized status',
        p_vqr_id, p_rfq_id;
    END IF;
  END IF;

  RETURN v_correlation_id;
END;
$$;

-- Re-apply EXECUTE gate. Updated to reflect the new 8-parameter signature.
-- CREATE OR REPLACE resets privileges on some Supabase local stack versions.
REVOKE EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean, uuid
) TO service_role;
