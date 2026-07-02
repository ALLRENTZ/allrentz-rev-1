-- B6-3: Require target RFQ to be pending_vendor_review at VQR insert time
--
-- Problem (confirmed 2026-07-01):
--   vqr_insert_vendor checks submitted_by, non-finalized status, and vendor
--   organization membership, but never checks that rfq_id refers to an RFQ
--   actually open for vendor quotes. A vendor could INSERT a
--   vendor_quote_responses row against any rfq_id regardless of its
--   operational_status.
--
-- Fix:
--   Add an EXISTS check requiring the referenced rental_requests row to be
--   in operational_status = 'pending_vendor_review', matching the already
--   verified vendor SELECT broadcast model (rfq_vendor_pending_select,
--   20260628000000_b6_1_fix_rfq_vendor_pending_select.sql).
--
-- No schema changes. No new tables, columns, enums, indexes, or functions.
-- Does not modify vqr_update_vendor, rfq_vendor_select, or
-- transition_rfq_status().
--
-- Rollback (emergency only — restores the unchecked policy):
--   DROP POLICY IF EXISTS vqr_insert_vendor ON public.vendor_quote_responses;
--   CREATE POLICY vqr_insert_vendor
--     ON public.vendor_quote_responses
--     FOR INSERT TO authenticated
--     WITH CHECK (
--       submitted_by = auth.uid()
--       AND status NOT IN ('accepted', 'rejected', 'expired')
--       AND vendor_organization_id IN (
--         SELECT organization_id FROM public.organization_memberships
--         WHERE user_id = auth.uid() AND archived_at IS NULL
--           AND role IN ('owner', 'admin', 'member')
--       )
--     );

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
    AND EXISTS (
      SELECT 1
      FROM public.rental_requests rr
      WHERE rr.id = rfq_id
        AND rr.operational_status = 'pending_vendor_review'
    )
  );
