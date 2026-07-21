-- B6-4: Minimum RFQ-to-vendor pre-quote authority object
--
-- Problem (confirmed 2026-07-07, B6-3 controlled verification):
--   vqr_insert_vendor requires the target rental_requests row to be
--   operational_status = 'pending_vendor_review', but no rental_requests
--   SELECT policy grants a vendor organization visibility into a
--   customer-owned RFQ before a vendor_quote_responses row exists for it.
--   The EXISTS check inside vqr_insert_vendor runs under the vendor's own
--   RLS context, so it silently evaluates false and blocks the insert with
--   42501, even when the RFQ exists and is pending_vendor_review. No
--   existing table (smart_match_requests, smart_draft_quotes) is FK-backed
--   to rental_requests, so no safe linkage exists to scope vendor
--   visibility without granting blanket access to every pending RFQ.
--
-- Fix (minimum scope only — not the full RFQ enhancement phase):
--   Introduce rfq_vendor_invitations as the pre-quote authority link
--   between a rental_requests row and a vendor organization. A vendor
--   organization member may SELECT a pending_vendor_review RFQ, and may
--   INSERT a vendor_quote_responses row against it, only when an active
--   ('invited') invitation row exists for that RFQ and vendor organization.
--
--   Deferred to a later phase (not built here): vendor accept/decline
--   workflow, invitation expiry, authenticated revoke UI, SmartMatch
--   integration, audit_events writes (service-role/application
--   responsibility — audit_events has no authenticated INSERT policy).
--
-- No changes to vqr_update_vendor, rfq_vendor_select, rfq_status_select,
-- or any other existing policy. vqr_insert_vendor's existing clauses
-- (submitted_by, non-terminal status, membership, pending_vendor_review)
-- are preserved unchanged; one additional invitation clause is added.
--
-- Rollback (emergency only):
--   DROP POLICY IF EXISTS "vqr_insert_vendor" ON public.vendor_quote_responses;
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
--       AND EXISTS (
--         SELECT 1
--         FROM public.rental_requests rr
--         WHERE rr.id = rfq_id
--           AND rr.operational_status = 'pending_vendor_review'
--       )
--     );
--   DROP POLICY IF EXISTS "rfq_vendor_select_invited" ON public.rental_requests;
--   DROP TABLE IF EXISTS public.rfq_vendor_invitations;

-- ---- Table -------------------------------------------------------------

CREATE TABLE public.rfq_vendor_invitations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                  uuid NOT NULL REFERENCES public.rental_requests(id) ON DELETE CASCADE,
  vendor_organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE RESTRICT,
  invited_by              uuid NOT NULL,
  invitation_status       text NOT NULL DEFAULT 'invited'
                            CHECK (invitation_status IN ('invited', 'revoked')),
  invited_at              timestamptz NOT NULL DEFAULT now(),
  revoked_at              timestamptz NULL,
  is_simulated            boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now()
);

-- ---- Indexes -------------------------------------------------------------

CREATE INDEX idx_rfq_vendor_invitations_rfq_id
  ON public.rfq_vendor_invitations (rfq_id);

CREATE INDEX idx_rfq_vendor_invitations_vendor_org
  ON public.rfq_vendor_invitations (vendor_organization_id);

CREATE UNIQUE INDEX idx_rfq_vendor_invitations_active_unique
  ON public.rfq_vendor_invitations (rfq_id, vendor_organization_id)
  WHERE invitation_status = 'invited';

-- ---- RLS -------------------------------------------------------------

ALTER TABLE public.rfq_vendor_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY rfq_vendor_invitations_service
  ON public.rfq_vendor_invitations
  FOR ALL TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY rfq_vendor_invitations_select_customer
  ON public.rfq_vendor_invitations
  FOR SELECT TO authenticated
  USING (
    rfq_id IN (
      SELECT id FROM public.rental_requests
      WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY rfq_vendor_invitations_select_vendor
  ON public.rfq_vendor_invitations
  FOR SELECT TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid()
        AND archived_at IS NULL
    )
  );

CREATE POLICY rfq_vendor_invitations_insert_customer
  ON public.rfq_vendor_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    invited_by = auth.uid()
    AND invitation_status = 'invited'
    AND rfq_id IN (
      SELECT id FROM public.rental_requests
      WHERE customer_id = auth.uid()
    )
  );

-- ---- Additive rental_requests SELECT policy -------------------------------

CREATE POLICY rfq_vendor_select_invited
  ON public.rental_requests
  FOR SELECT TO authenticated
  USING (
    operational_status = 'pending_vendor_review'
    AND EXISTS (
      SELECT 1
      FROM public.rfq_vendor_invitations rvi
      WHERE rvi.rfq_id = rental_requests.id
        AND rvi.invitation_status = 'invited'
        AND rvi.vendor_organization_id IN (
          SELECT organization_id FROM public.organization_memberships
          WHERE user_id = auth.uid()
            AND archived_at IS NULL
        )
    )
  );

-- ---- vqr_insert_vendor: add invitation requirement -------------------------------

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
    AND EXISTS (
      SELECT 1
      FROM public.rfq_vendor_invitations rvi
      WHERE rvi.rfq_id = vendor_quote_responses.rfq_id
        AND rvi.vendor_organization_id = vendor_quote_responses.vendor_organization_id
        AND rvi.invitation_status = 'invited'
    )
  );
