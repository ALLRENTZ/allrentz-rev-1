-- B6-1 fix: replace rfq_vendor_pending_select with broadcast model
--
-- Problem:
--   The original rfq_vendor_pending_select policy (20260607000000) required a
--   VQR in pending/submitted/revised status to already exist before the vendor
--   could SELECT the RFQ. No mechanism creates that VQR when the RFQ enters
--   pending_vendor_review - transition_rfq_status() and the Edge Function do not
--   insert a VQR at that step. The policy could never fire.
--
-- Fix:
--   Drop the VQR prerequisite. Replace with an org_type check: any active member
--   of a vendor (or both) organization may SELECT rental_requests rows where
--   operational_status = 'pending_vendor_review'. No circular dependency.
--   No SECURITY DEFINER function needed.
--
-- Authority model:
--   Vendor discovery: broadcast - all vendor org members see open PVR RFQs.
--   Vendor assignment: indicated by the VQR the vendor submits (B6-2).
--   Non-vendor users (customers, admins without a vendor org membership) are
--   not covered by this policy and see no rows through it.
--   No other policy is changed.
--
-- No schema changes. No new tables, columns, enums, or indexes.

-- 1. Drop the original policy and its SECURITY DEFINER helper ------------------

DROP POLICY IF EXISTS rfq_vendor_pending_select ON public.rental_requests;
DROP FUNCTION IF EXISTS public.rfq_vendor_has_pending_vqr(uuid);

-- 2. Broadcast policy - org_type-based, no VQR prerequisite -------------------

CREATE POLICY rfq_vendor_pending_select
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (
    operational_status = 'pending_vendor_review'
    AND EXISTS (
      SELECT 1
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id  = auth.uid()
        AND om.archived_at IS NULL
        AND om.role    IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
  );

-- Rollback (emergency) --------------------------------------------------------
-- DROP POLICY IF EXISTS rfq_vendor_pending_select ON public.rental_requests;
--
-- To restore the original (non-functional) version:
-- See 20260607000000_b6_1_rfq_vendor_pending_select.sql
