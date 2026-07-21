-- B6-4 authority hardening: make vendor invitation scope exclusive and
-- require every vendor-owned path to use an active vendor/both organization.
--
-- Root causes:
--   1. rfq_vendor_pending_select remained active after invitation-based RFQ
--      visibility was added. PostgreSQL permissive SELECT policies combine
--      with OR semantics, so the older broadcast policy bypassed invitations.
--   2. Invitation and VQR policies accepted membership in any organization,
--      including customer-only organizations.
--
-- This is a forward-only correction. It preserves customer ownership,
-- membership roles, pending-review state, invitation status, demo boundaries,
-- accepted-quote visibility, and the backend-owned transition path.

-- ---------------------------------------------------------------------------
-- 1. Remove the superseded broadcast visibility path. The existing
--    rfq_vendor_select_invited policy remains the only pre-quote vendor path.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rfq_vendor_pending_select ON public.rental_requests;

-- ---------------------------------------------------------------------------
-- 2. Harden the SECURITY DEFINER helpers used by rental_requests SELECT RLS.
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.current_user_has_any_active_rfq_invitation(p_rfq_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rfq_vendor_invitations rvi
    JOIN public.organization_memberships om
      ON om.organization_id = rvi.vendor_organization_id
    JOIN public.organizations org
      ON org.id = rvi.vendor_organization_id
    WHERE rvi.rfq_id = p_rfq_id
      AND rvi.invitation_status = 'invited'
      AND om.user_id = auth.uid()
      AND om.archived_at IS NULL
      AND om.role IN ('owner', 'admin', 'member')
      AND org.org_type IN ('vendor', 'both')
      AND org.archived_at IS NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.current_user_has_any_active_rfq_invitation(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_has_any_active_rfq_invitation(uuid)
  TO authenticated;

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
    JOIN public.organizations org
      ON org.id = vqr.vendor_organization_id
    WHERE vqr.rfq_id = p_rfq_id
      AND vqr.status = 'accepted'
      AND om.user_id = auth.uid()
      AND om.archived_at IS NULL
      AND om.role IN ('owner', 'admin', 'member')
      AND org.org_type IN ('vendor', 'both')
      AND org.archived_at IS NULL
  )
$$;

REVOKE EXECUTE ON FUNCTION public.rfq_vendor_has_accepted_quote(uuid)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.rfq_vendor_has_accepted_quote(uuid)
  TO authenticated;

-- ---------------------------------------------------------------------------
-- 3. Restrict invitation visibility and creation to active vendor/both orgs.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS rfq_vendor_invitations_select_vendor
  ON public.rfq_vendor_invitations;

CREATE POLICY rfq_vendor_invitations_select_vendor
  ON public.rfq_vendor_invitations
  FOR SELECT TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
  );

DROP POLICY IF EXISTS rfq_vendor_invitations_insert_customer
  ON public.rfq_vendor_invitations;

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
    AND EXISTS (
      SELECT 1
      FROM public.organizations org
      WHERE org.id = vendor_organization_id
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
  );

-- ---------------------------------------------------------------------------
-- 4. Restrict every authenticated vendor VQR path to active vendor/both orgs.
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS vqr_select_vendor ON public.vendor_quote_responses;

CREATE POLICY vqr_select_vendor
  ON public.vendor_quote_responses
  FOR SELECT TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
  );

DROP POLICY IF EXISTS vqr_insert_vendor ON public.vendor_quote_responses;

CREATE POLICY vqr_insert_vendor
  ON public.vendor_quote_responses
  FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND vendor_organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
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
      SELECT om.organization_id
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND (
      NOT public.is_demo_actor(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.rental_requests rr
        WHERE rr.id = vendor_quote_responses.rfq_id
          AND rr.is_simulated = true
      )
    )
  )
  WITH CHECK (
    vendor_organization_id IN (
      SELECT om.organization_id
      FROM public.organization_memberships om
      JOIN public.organizations org ON org.id = om.organization_id
      WHERE om.user_id = auth.uid()
        AND om.archived_at IS NULL
        AND om.role IN ('owner', 'admin', 'member')
        AND org.org_type IN ('vendor', 'both')
        AND org.archived_at IS NULL
    )
    AND status NOT IN ('accepted', 'rejected', 'expired')
    AND is_simulated = (
      SELECT rr.is_simulated
      FROM public.rental_requests rr
      WHERE rr.id = vendor_quote_responses.rfq_id
    )
    AND (
      NOT public.is_demo_actor(auth.uid())
      OR EXISTS (
        SELECT 1
        FROM public.rental_requests rr
        WHERE rr.id = vendor_quote_responses.rfq_id
          AND rr.is_simulated = true
      )
    )
  );
