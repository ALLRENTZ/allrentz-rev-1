-- B4a: Close VQR self-acceptance vulnerability and introduce vendor RFQ visibility
--
-- Problem (confirmed empirically 2026-06-04):
--   vqr_insert_vendor has no status restriction — vendor can INSERT with status='accepted'
--   vqr_update_vendor has no status restriction — vendor can PATCH status to 'accepted'
--   Both paths allow a vendor to unilaterally create the accepted-quote gate condition,
--   which rfq_vendor_select (added below) would then unlock for rental_requests visibility.
--
-- Remediation:
--   Replace vqr_insert_vendor: add status NOT IN ('accepted','rejected','expired') to WITH CHECK.
--     Vendor-controlled states remain fully accessible: pending, submitted, revised, withdrawn.
--   Replace vqr_update_vendor: same restriction on both USING and WITH CHECK.
--     USING: vendor cannot approach a finalized row for UPDATE.
--     WITH CHECK: vendor cannot transition any row to a finalized state.
--   Add rfq_vendor_select: vendor may SELECT rental_requests rows where their org holds
--     an accepted vendor_quote_response. Safe only after the above restrictions are in place.
--
-- Authority model after this migration:
--   Vendor-controlled states:    pending, submitted, revised, withdrawn
--   Authority-controlled states: accepted (customer), rejected (customer), expired (system)
--
-- No schema changes. No new tables, columns, enums, indexes, or functions.
-- Depends on: 20260601120000_b3b_drop_rental_requests_status.sql
--
-- Rollback (emergency only — removes vendor visibility, restores original policies):
--   DROP POLICY IF EXISTS rfq_vendor_select ON public.rental_requests;
--   DROP POLICY IF EXISTS vqr_insert_vendor ON public.vendor_quote_responses;
--   DROP POLICY IF EXISTS vqr_update_vendor ON public.vendor_quote_responses;
--   CREATE POLICY "vqr_insert_vendor" ON public.vendor_quote_responses FOR INSERT TO authenticated
--     WITH CHECK (submitted_by = auth.uid() AND vendor_organization_id IN (
--       SELECT organization_id FROM public.organization_memberships
--       WHERE user_id = auth.uid() AND archived_at IS NULL
--         AND role IN ('owner','admin','member')));
--   CREATE POLICY "vqr_update_vendor" ON public.vendor_quote_responses FOR UPDATE TO authenticated
--     USING (vendor_organization_id IN (
--       SELECT organization_id FROM public.organization_memberships
--       WHERE user_id = auth.uid() AND archived_at IS NULL
--         AND role IN ('owner','admin','member')))
--     WITH CHECK (vendor_organization_id IN (
--       SELECT organization_id FROM public.organization_memberships
--       WHERE user_id = auth.uid() AND archived_at IS NULL
--         AND role IN ('owner','admin','member')));

-- ── 1. Replace vqr_insert_vendor ──────────────────────────────────────────────

DROP POLICY IF EXISTS "vqr_insert_vendor" ON public.vendor_quote_responses;

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
  );

-- ── 2. Replace vqr_update_vendor ──────────────────────────────────────────────

DROP POLICY IF EXISTS "vqr_update_vendor" ON public.vendor_quote_responses;

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
  )
  WITH CHECK (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
    AND status NOT IN ('accepted', 'rejected', 'expired')
  );

-- ── 3. Add rfq_vendor_select ──────────────────────────────────────────────────
-- Vendor may SELECT rental_requests rows where their org holds an accepted quote.
-- rfq_status_select (rfq_operational_status) transitively unlocks for the same
-- vendor once rental_requests is accessible — no change to rfq_status_select needed.
--
-- CIRCULAR DEPENDENCY NOTE:
--   A direct subquery on vendor_quote_responses inside a rental_requests RLS policy
--   creates a loop: vqr SELECT → vqr_select_customer → rental_requests →
--   rfq_vendor_select → vqr → ... → 500.
--   Resolved by rfq_vendor_has_accepted_quote(), a SECURITY DEFINER function that
--   reads vendor_quote_responses bypassing its own RLS, breaking the cycle.
--   See migration 20260605000000 which applied this fix to the already-pushed remote.

CREATE OR REPLACE FUNCTION public.rfq_vendor_has_accepted_quote(p_rfq_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.vendor_quote_responses vqr
    JOIN public.organization_memberships om
      ON om.organization_id = vqr.vendor_organization_id
    WHERE vqr.rfq_id = p_rfq_id
      AND om.user_id = auth.uid()
      AND om.archived_at IS NULL
      AND vqr.status = 'accepted'
  )
$$;

REVOKE EXECUTE ON FUNCTION public.rfq_vendor_has_accepted_quote(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rfq_vendor_has_accepted_quote(uuid) TO authenticated;

CREATE POLICY rfq_vendor_select
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (public.rfq_vendor_has_accepted_quote(id));
