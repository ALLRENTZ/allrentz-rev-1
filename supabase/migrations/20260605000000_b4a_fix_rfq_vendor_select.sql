-- B4a fix: Replace circular rfq_vendor_select with SECURITY DEFINER helper
--
-- Problem found during verification of 20260604000000:
--   rfq_vendor_select USING clause read vendor_quote_responses directly.
--   This created a circular RLS dependency at query time:
--     vendor_quote_responses SELECT
--       → vqr_select_customer evaluates → reads rental_requests
--       → rfq_vendor_select evaluates  → reads vendor_quote_responses
--       → vqr_select_customer evaluates → ...
--   PostgreSQL/PostgREST threw HTTP 500 on any authenticated vendor SELECT
--   against vendor_quote_responses.
--
-- Fix:
--   Replace the inline subquery with a SECURITY DEFINER function
--   rfq_vendor_has_accepted_quote(). SECURITY DEFINER runs as the function
--   owner (postgres superuser), bypassing vendor_quote_responses RLS when
--   checking for accepted quotes. This breaks the circular reference.
--
-- No changes to vqr_insert_vendor, vqr_update_vendor, or any other policy.
-- Depends on: 20260604000000_b4a_vqr_authority_vendor_visibility.sql

-- ── 1. Drop the circular policy applied by 20260604000000 ─────────────────────

DROP POLICY IF EXISTS rfq_vendor_select ON public.rental_requests;

-- ── 2. Create SECURITY DEFINER helper ─────────────────────────────────────────
-- Reads vendor_quote_responses without triggering its RLS policies,
-- breaking the circular dependency with vqr_select_customer.
-- GRANT TO authenticated so the RLS USING clause can call it.

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

-- ── 3. Recreate rfq_vendor_select using the helper ────────────────────────────

CREATE POLICY rfq_vendor_select
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (public.rfq_vendor_has_accepted_quote(id));

-- ── Rollback (emergency) ──────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS rfq_vendor_select ON public.rental_requests;
-- DROP FUNCTION IF EXISTS public.rfq_vendor_has_accepted_quote(uuid);
