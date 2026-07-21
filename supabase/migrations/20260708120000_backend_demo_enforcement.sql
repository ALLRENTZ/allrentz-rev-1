-- Backend/RLS Demo Enforcement
--
-- Root cause (confirmed by read-only audit, 2026-07-08):
--   profiles.is_demo and is_simulated (rental_requests, vendor_quote_responses,
--   rfq_vendor_invitations) are not connected by any backend enforcement.
--   A demo-flagged account has identical write authority to a real account at
--   the database layer. Frontend guards are the only control in place, and
--   frontend guards are not authoritative.
--
-- Fix: a single centralized helper (public.is_demo_actor) is added to existing
-- INSERT/UPDATE policies and to the RFQ status-transition RPC. Demo actors may
-- only mutate records where the operational record is explicitly simulated.
-- No existing ownership, membership, invitation, or status authority is
-- removed or weakened -- the demo clause is appended alongside it.
--
-- Not touched (explicit scope boundaries):
--   rental_requests UPDATE -- no UPDATE policy exists for any role (confirmed
--     via pg_policies on local db); RLS default-deny already blocks it for
--     demo and real customers alike. Adding a policy here would expand
--     authority, not restrict it -- out of scope.
--   smart_draft_quotes -- has no foreign key or column linkage to
--     smart_match_requests (confirmed by schema inspection); the demo
--     enforcement task explicitly scoped this table to the coupled case only.
--   rfq_vendor_invitations UPDATE/DELETE (revoke) -- no service_role or
--     authenticated mutation path exists in this repository for revoking an
--     invitation; only rfq_vendor_invitations_service (service_role, ALL) and
--     rfq_vendor_invitations_insert_customer (authenticated, INSERT) exist.
--     The INSERT path is hardened below; revoke has no code path to harden.
--
-- Depends on: 20260708001000_b6_4_fix_rfq_vendor_invitation_rls_recursion.sql

-- ============================================================
-- SECTION 1: DEMO ACTOR HELPER
-- ============================================================

CREATE OR REPLACE FUNCTION public.is_demo_actor(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_demo FROM public.profiles WHERE id = p_user_id),
    false
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_demo_actor(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_demo_actor(uuid) TO authenticated, service_role;

-- ============================================================
-- SECTION 2: LOCK profiles.is_demo AGAINST SELF-SERVICE CHANGE
--
-- Without this, a demo account could defeat every check below with a single
-- client-side UPDATE profiles SET is_demo = false WHERE id = auth.uid() --
-- "Users update own profile" has no WITH CHECK restricting which columns
-- change. This trigger silently preserves is_demo across authenticated-role
-- updates so the rest of a legitimate profile edit still succeeds; only
-- service_role (used by trusted backend/admin paths) may change is_demo.
-- ============================================================

CREATE OR REPLACE FUNCTION public.lock_profile_is_demo()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_demo IS DISTINCT FROM OLD.is_demo AND auth.role() = 'authenticated' THEN
    NEW.is_demo := OLD.is_demo;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS lock_profile_is_demo_trigger ON public.profiles;
CREATE TRIGGER lock_profile_is_demo_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_profile_is_demo();

-- ============================================================
-- SECTION 3: rental_requests -- demo INSERT boundary
-- Existing ownership check (auth.uid() = customer_id) is preserved unchanged.
-- ============================================================

DROP POLICY IF EXISTS rfq_customer_insert ON public.rental_requests;

CREATE POLICY rfq_customer_insert
  ON public.rental_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND (NOT public.is_demo_actor(auth.uid()) OR is_simulated = true)
  );

-- ============================================================
-- SECTION 4: vendor_quote_responses -- demo INSERT/UPDATE boundary
-- Existing membership, status, pending-review, and invitation checks are
-- preserved unchanged. is_simulated alignment with the parent RFQ is added
-- since vendor_quote_responses carries its own is_simulated column.
-- ============================================================

DROP POLICY IF EXISTS vqr_insert_vendor ON public.vendor_quote_responses;

CREATE POLICY vqr_insert_vendor
  ON public.vendor_quote_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
    AND EXISTS (
      SELECT 1
      FROM public.rental_requests rr
      WHERE rr.id = rfq_id
        AND rr.operational_status = 'pending_vendor_review'
        AND rr.is_simulated = vendor_quote_responses.is_simulated
        AND (NOT public.is_demo_actor(auth.uid()) OR rr.is_simulated = true)
    )
    AND EXISTS (
      SELECT 1
      FROM public.rfq_vendor_invitations rvi
      WHERE rvi.rfq_id = vendor_quote_responses.rfq_id
        AND rvi.vendor_organization_id = vendor_quote_responses.vendor_organization_id
        AND rvi.invitation_status = 'invited'
    )
  );

DROP POLICY IF EXISTS vqr_update_vendor ON public.vendor_quote_responses;

CREATE POLICY vqr_update_vendor
  ON public.vendor_quote_responses
  FOR UPDATE TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND (
      NOT public.is_demo_actor(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.rental_requests rr
        WHERE rr.id = vendor_quote_responses.rfq_id AND rr.is_simulated = true
      )
    )
  )
  WITH CHECK (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND is_simulated = (SELECT rr.is_simulated FROM public.rental_requests rr WHERE rr.id = vendor_quote_responses.rfq_id)
    AND (
      NOT public.is_demo_actor(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.rental_requests rr
        WHERE rr.id = vendor_quote_responses.rfq_id AND rr.is_simulated = true
      )
    )
  );

-- ============================================================
-- SECTION 5: rfq_vendor_invitations -- demo INSERT boundary
-- Existing invited_by/customer-ownership check is preserved unchanged.
-- is_simulated alignment with the parent RFQ is added since
-- rfq_vendor_invitations carries its own is_simulated column.
-- ============================================================

DROP POLICY IF EXISTS rfq_vendor_invitations_insert_customer ON public.rfq_vendor_invitations;

CREATE POLICY rfq_vendor_invitations_insert_customer
  ON public.rfq_vendor_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND invitation_status = 'invited'
    AND EXISTS (
      SELECT 1
      FROM public.rental_requests rr
      WHERE rr.id = rfq_id
        AND rr.customer_id = auth.uid()
        AND rr.is_simulated = rfq_vendor_invitations.is_simulated
        AND (NOT public.is_demo_actor(auth.uid()) OR rr.is_simulated = true)
    )
  );

-- ============================================================
-- SECTION 6: smart_match_requests -- add is_simulated + demo boundary
--
-- Replaces the single unscoped FOR ALL policy (no TO clause, no demo
-- awareness) with per-command policies. Read/delete ownership authority
-- (auth.uid() = customer_id) is preserved unchanged; write authority gains
-- the demo boundary.
-- ============================================================

ALTER TABLE public.smart_match_requests
  ADD COLUMN IF NOT EXISTS is_simulated boolean NOT NULL DEFAULT false;

DROP POLICY IF EXISTS "Customers manage own match requests" ON public.smart_match_requests;

CREATE POLICY smart_match_requests_select
  ON public.smart_match_requests
  FOR SELECT TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY smart_match_requests_insert
  ON public.smart_match_requests
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = customer_id
    AND (NOT public.is_demo_actor(auth.uid()) OR is_simulated = true)
  );

CREATE POLICY smart_match_requests_update
  ON public.smart_match_requests
  FOR UPDATE TO authenticated
  USING (auth.uid() = customer_id)
  WITH CHECK (
    auth.uid() = customer_id
    AND (NOT public.is_demo_actor(auth.uid()) OR is_simulated = true)
  );

CREATE POLICY smart_match_requests_delete
  ON public.smart_match_requests
  FOR DELETE TO authenticated
  USING (
    auth.uid() = customer_id
    AND (NOT public.is_demo_actor(auth.uid()) OR is_simulated = true)
  );

-- ============================================================
-- SECTION 7: transition_rfq_status -- RPC-level demo boundary
--
-- Same 8-parameter signature as 20260606000000_b5_1_vqr_acceptance_write_path.sql
-- (CREATE OR REPLACE, no signature change). p_is_simulated is no longer
-- trusted for authorization or for the audit/status-history record -- the
-- authoritative value is read from the rental_requests row itself
-- (v_rfq.is_simulated) inside this SECURITY DEFINER function, so the check
-- holds even when this function is invoked via service_role and RLS is
-- bypassed entirely.
-- ============================================================

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

  -- Demo boundary: derived from the database row, not from p_is_simulated.
  -- Blocks before any write, regardless of caller (edge function, RPC, or
  -- any future service_role path that reaches this function).
  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot transition non-simulated RFQ %', p_actor_id, p_rfq_id;
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
    p_is_simulated                     := v_rfq.is_simulated,
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
    p_reason, v_correlation_id, v_audit_event_id, v_rfq.is_simulated
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

-- Re-apply EXECUTE gate. CREATE OR REPLACE resets privileges on some
-- Supabase local stack versions (same note as 20260606000000).
REVOKE EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean, uuid
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean, uuid
) TO service_role;
