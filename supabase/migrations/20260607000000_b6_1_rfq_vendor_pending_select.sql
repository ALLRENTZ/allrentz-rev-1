-- B6-1: Add rfq_vendor_pending_select RLS policy
--
-- Problem:
--   In pending_vendor_review, an assigned vendor holds a VQR in a vendor-controlled
--   state (pending, submitted, or revised) but cannot SELECT the parent rental_request.
--   rfq_vendor_select (b4a/b5) only unlocks rows where the vendor holds an accepted
--   VQR -- a condition that is structurally impossible during pending_vendor_review.
--   Vendors are locked out of the RFQ they are assigned to respond to.
--
-- Fix:
--   Add rfq_vendor_pending_select: vendor SELECT on rental_requests rows where
--   operational_status = 'pending_vendor_review' AND their org holds a VQR in
--   an active vendor-controlled state (pending, submitted, revised).
--
-- Authority model:
--   Vendor assignment is indicated by the existence of a VQR record created by
--   the admin or system when the RFQ enters pending_vendor_review. Unrelated
--   vendors (no VQR for this RFQ) cannot satisfy the condition. Withdrawn,
--   rejected, and expired VQRs are excluded by the status filter.
--
-- Circular dependency:
--   An inline subquery on vendor_quote_responses inside a rental_requests RLS
--   USING clause creates the same loop as B4a:
--     vendor_quote_responses SELECT → vqr_select_customer → rental_requests
--     → rfq_vendor_pending_select → vendor_quote_responses → ...
--   Resolved by rfq_vendor_has_pending_vqr(), a SECURITY DEFINER function that
--   reads vendor_quote_responses as the function owner (postgres), bypassing
--   vendor_quote_responses RLS and breaking the cycle.
--
-- No schema changes. No new tables, columns, enums, or indexes.
-- Does not modify rfq_customer_select, rfq_customer_insert, or rfq_vendor_select.
-- Depends on: 20260606000000_b5_1_vqr_acceptance_write_path.sql

-- ── 1. SECURITY DEFINER helper ────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.rfq_vendor_has_pending_vqr(p_rfq_id uuid)
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
      AND vqr.status IN ('pending', 'submitted', 'revised')
  )
$$;

REVOKE EXECUTE ON FUNCTION public.rfq_vendor_has_pending_vqr(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.rfq_vendor_has_pending_vqr(uuid) TO authenticated;

-- ── 2. RLS policy ─────────────────────────────────────────────────────────────

CREATE POLICY rfq_vendor_pending_select
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (
    operational_status = 'pending_vendor_review'
    AND public.rfq_vendor_has_pending_vqr(id)
  );

-- ── Rollback (emergency) ──────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS rfq_vendor_pending_select ON public.rental_requests;
-- DROP FUNCTION IF EXISTS public.rfq_vendor_has_pending_vqr(uuid);
