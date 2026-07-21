-- B6-4 corrective: Fix 42P17 infinite recursion between rental_requests and
-- rfq_vendor_invitations RLS policies
--
-- Problem (confirmed 2026-07-08, B6-4 runtime verification, Cases A/B/C all
-- failed with SQLSTATE 42P17):
--   Migration 20260708000000_b6_4_rfq_vendor_invitations.sql introduced a
--   two-table RLS cycle:
--
--     policy rfq_vendor_select_invited on rental_requests
--       references rfq_vendor_invitations
--         (EXISTS (SELECT 1 FROM rfq_vendor_invitations rvi
--                  WHERE rvi.rfq_id = rental_requests.id ...))
--       -> policy rfq_vendor_invitations_select_customer on rfq_vendor_invitations
--            references rental_requests
--              (rfq_id IN (SELECT id FROM rental_requests
--                          WHERE customer_id = auth.uid()))
--            -> recursion on rental_requests
--
--   Any SELECT on rental_requests as an authenticated vendor forces
--   evaluation of rfq_vendor_select_invited, which forces RLS evaluation on
--   rfq_vendor_invitations, whose select_customer policy forces RLS
--   evaluation on rental_requests again. Postgres detects this as
--   SQLSTATE 42P17 and aborts the query. This also broke Case B and Case C
--   (rfq operational_status checks never completed) and vqr_insert_vendor's
--   own EXISTS check against rfq_vendor_invitations, since that check also
--   evaluates rfq_vendor_invitations RLS under the caller's authenticated
--   role.
--
--   rfq_vendor_invitations_insert_customer has the same rental_requests
--   reference in its WITH CHECK, but is not part of the proven recursive
--   cycle for SELECT (INSERT-only clause) -- it is replaced here for
--   consistency and to prevent it from becoming a future recursion source
--   if it is ever evaluated together with a SELECT-triggering policy.
--
-- Root cause proof (read from live pg_policies, 2026-07-08):
--   rental_requests.rfq_vendor_select_invited.qual references
--   rfq_vendor_invitations directly. rfq_vendor_invitations
--   .rfq_vendor_invitations_select_customer.qual references rental_requests
--   directly. This is a literal two-edge cycle between the two tables.
--
-- Fix:
--   Break both edges of the cycle using STABLE SECURITY DEFINER helper
--   functions, following the existing pattern already in use for
--   rfq_vendor_has_accepted_quote() (20260628000000_b6_1... /
--   pg_proc: SECURITY DEFINER, SET search_path TO 'public'). A SECURITY
--   DEFINER function owned by a role with BYPASSRLS (the migration role)
--   evaluates its internal query without re-triggering RLS on the
--   referenced table, so the recursive edge is removed without widening
--   any caller's actual authority -- the SQL inside each helper performs
--   the exact same check the replaced policy clause performed inline.
--
--   public.is_rfq_customer(p_rfq_id uuid)
--     Used by rfq_vendor_invitations_select_customer and
--     rfq_vendor_invitations_insert_customer in place of the inline
--     rental_requests subquery. Same predicate: caller is customer_id on
--     that rental_requests row.
--
--   public.current_user_has_any_active_rfq_invitation(p_rfq_id uuid)
--     Used by rental_requests.rfq_vendor_select_invited in place of the
--     inline rfq_vendor_invitations EXISTS. Same predicate: an 'invited'
--     rfq_vendor_invitations row exists for that RFQ, scoped to a vendor
--     organization the caller actively belongs to.
--
--   vqr_insert_vendor's own direct EXISTS against rfq_vendor_invitations is
--   NOT changed: it is not part of the proven cycle (rfq_vendor_invitations
--   policies no longer reference rental_requests at all after this
--   migration, so evaluating rfq_vendor_invitations RLS during that EXISTS
--   check cannot loop back). All B6-3 vqr_insert_vendor clauses
--   (submitted_by, non-terminal status, membership role, pending_vendor_review
--   EXISTS, invitation EXISTS) remain exactly as authored in
--   20260701000000_b6_3_vqr_insert_pending_review_check.sql and
--   20260708000000_b6_4_rfq_vendor_invitations.sql -- this migration does
--   not touch vendor_quote_responses or its policies.
--
-- No new tables. No new triggers. No authenticated UPDATE/DELETE policies.
-- No change to invitation authority semantics, customer isolation, or
-- vendor organization membership requirements -- only the mechanism by
-- which each check avoids RLS self-reference changes.
--
-- Rollback (emergency only -- restores the recursive policies; DO NOT
-- apply without re-confirming the recursion is otherwise mitigated):
--   DROP POLICY IF EXISTS "rfq_vendor_invitations_select_customer" ON public.rfq_vendor_invitations;
--   CREATE POLICY rfq_vendor_invitations_select_customer
--     ON public.rfq_vendor_invitations
--     FOR SELECT TO authenticated
--     USING (
--       rfq_id IN (
--         SELECT id FROM public.rental_requests
--         WHERE customer_id = auth.uid()
--       )
--     );
--   DROP POLICY IF EXISTS "rfq_vendor_invitations_insert_customer" ON public.rfq_vendor_invitations;
--   CREATE POLICY rfq_vendor_invitations_insert_customer
--     ON public.rfq_vendor_invitations
--     FOR INSERT TO authenticated
--     WITH CHECK (
--       invited_by = auth.uid()
--       AND invitation_status = 'invited'
--       AND rfq_id IN (
--         SELECT id FROM public.rental_requests
--         WHERE customer_id = auth.uid()
--       )
--     );
--   DROP POLICY IF EXISTS "rfq_vendor_select_invited" ON public.rental_requests;
--   CREATE POLICY rfq_vendor_select_invited
--     ON public.rental_requests
--     FOR SELECT TO authenticated
--     USING (
--       operational_status = 'pending_vendor_review'
--       AND EXISTS (
--         SELECT 1
--         FROM public.rfq_vendor_invitations rvi
--         WHERE rvi.rfq_id = rental_requests.id
--           AND rvi.invitation_status = 'invited'
--           AND rvi.vendor_organization_id IN (
--             SELECT organization_id FROM public.organization_memberships
--             WHERE user_id = auth.uid()
--               AND archived_at IS NULL
--           )
--       )
--     );
--   DROP FUNCTION IF EXISTS public.current_user_has_any_active_rfq_invitation(uuid);
--   DROP FUNCTION IF EXISTS public.is_rfq_customer(uuid);

-- ---- Helper functions -------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_rfq_customer(p_rfq_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.rental_requests rr
    WHERE rr.id = p_rfq_id
      AND rr.customer_id = auth.uid()
  )
$function$;

CREATE OR REPLACE FUNCTION public.current_user_has_any_active_rfq_invitation(p_rfq_id uuid)
  RETURNS boolean
  LANGUAGE sql
  STABLE SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.rfq_vendor_invitations rvi
    JOIN public.organization_memberships om
      ON om.organization_id = rvi.vendor_organization_id
    WHERE rvi.rfq_id = p_rfq_id
      AND rvi.invitation_status = 'invited'
      AND om.user_id = auth.uid()
      AND om.archived_at IS NULL
  )
$function$;

-- ---- A: rfq_vendor_invitations_select_customer -------------------------------

DROP POLICY IF EXISTS "rfq_vendor_invitations_select_customer" ON public.rfq_vendor_invitations;

CREATE POLICY rfq_vendor_invitations_select_customer
  ON public.rfq_vendor_invitations
  FOR SELECT TO authenticated
  USING (
    public.is_rfq_customer(rfq_id)
  );

-- ---- B: rfq_vendor_invitations_insert_customer -------------------------------

DROP POLICY IF EXISTS "rfq_vendor_invitations_insert_customer" ON public.rfq_vendor_invitations;

CREATE POLICY rfq_vendor_invitations_insert_customer
  ON public.rfq_vendor_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND invitation_status = 'invited'
    AND public.is_rfq_customer(rfq_id)
  );

-- ---- C: rental_requests rfq_vendor_select_invited -------------------------------

DROP POLICY IF EXISTS "rfq_vendor_select_invited" ON public.rental_requests;

CREATE POLICY rfq_vendor_select_invited
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (
    operational_status = 'pending_vendor_review'
    AND public.current_user_has_any_active_rfq_invitation(rental_requests.id)
  );
