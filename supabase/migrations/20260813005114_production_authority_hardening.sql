-- Production rental authority hardening
--
-- This forward-only correction narrows Data API exposure and removes
-- redundant permissive policies without changing the controlled command
-- contract. It deliberately publishes no contractual stop-rent rule and
-- creates no override or granular/partial-return authority.

-- Foreign-key indexes required by actor and audit relationships.
CREATE INDEX IF NOT EXISTS idx_field_acceptances_accepted_by
  ON public.rental_field_acceptances (accepted_by);
CREATE INDEX IF NOT EXISTS idx_field_acceptances_audit_event
  ON public.rental_field_acceptances (audit_event_id);
CREATE INDEX IF NOT EXISTS idx_off_rent_requests_requested_by
  ON public.rental_off_rent_requests (requested_by);
CREATE INDEX IF NOT EXISTS idx_off_rent_requests_audit_event
  ON public.rental_off_rent_requests (audit_event_id);
CREATE INDEX IF NOT EXISTS idx_off_rent_acknowledgments_acknowledged_by
  ON public.rental_off_rent_acknowledgments (acknowledged_by);
CREATE INDEX IF NOT EXISTS idx_off_rent_acknowledgments_audit_event
  ON public.rental_off_rent_acknowledgments (audit_event_id);

-- Cache the authenticated actor once per statement for the surviving profile
-- read policy. Stage 1 already removed direct authenticated INSERT and UPDATE.
ALTER POLICY "Users view own profile"
  ON public.profiles
  USING ((SELECT auth.uid()) = id);

-- Field acceptance is written and read through its controlled SECURITY
-- DEFINER command. No current authenticated client consumes the table.
REVOKE SELECT ON TABLE public.rental_field_acceptances FROM authenticated;
REVOKE ALL PRIVILEGES ON TABLE public.rental_field_acceptances FROM service_role;
DROP POLICY IF EXISTS "field_acceptances_service"
  ON public.rental_field_acceptances;

ALTER POLICY "field_acceptances_select_customer"
  ON public.rental_field_acceptances
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND rfq_id IN (
      SELECT rr.id
      FROM public.rental_requests AS rr
      WHERE rr.customer_id = (SELECT auth.uid())
         OR rr.customer_organization_id IN (
           SELECT om.organization_id
           FROM public.organization_memberships AS om
           WHERE om.user_id = (SELECT auth.uid())
             AND om.archived_at IS NULL
         )
    )
  );

-- The vendor dashboard has a verified direct read of off-rent requests, so
-- that SELECT grant remains. Consolidation preserves both original access
-- paths while adding the repository simulation boundary.
DROP POLICY IF EXISTS "off_rent_requests_select_customer"
  ON public.rental_off_rent_requests;
DROP POLICY IF EXISTS "off_rent_requests_select_accepted_vendor"
  ON public.rental_off_rent_requests;
DROP POLICY IF EXISTS "off_rent_requests_service"
  ON public.rental_off_rent_requests;

CREATE POLICY "off_rent_requests_select_authorized"
  ON public.rental_off_rent_requests FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR public.rfq_vendor_has_accepted_quote(rfq_id)
    )
  );

-- Acknowledgments are consumed only through controlled backend commands.
REVOKE SELECT ON TABLE public.rental_off_rent_acknowledgments FROM authenticated;
DROP POLICY IF EXISTS "off_rent_acknowledgments_select_customer"
  ON public.rental_off_rent_acknowledgments;
DROP POLICY IF EXISTS "off_rent_acknowledgments_select_vendor"
  ON public.rental_off_rent_acknowledgments;
DROP POLICY IF EXISTS "off_rent_acknowledgments_service"
  ON public.rental_off_rent_acknowledgments;

CREATE POLICY "off_rent_acknowledgments_select_authorized"
  ON public.rental_off_rent_acknowledgments FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR vendor_organization_id IN (
        SELECT om.organization_id
        FROM public.organization_memberships AS om
        JOIN public.organizations AS org
          ON org.id = om.organization_id
        WHERE om.user_id = (SELECT auth.uid())
          AND om.archived_at IS NULL
          AND om.role IN ('owner', 'admin', 'member')
          AND org.org_type IN ('vendor', 'both')
          AND org.archived_at IS NULL
      )
    )
  );

-- No current authenticated application consumer reads these six controlled
-- stop-rent tables. Service-role read access and all controlled RPC EXECUTE
-- grants are intentionally unchanged.
REVOKE SELECT ON TABLE public.rental_stop_evaluator_versions FROM authenticated;
REVOKE SELECT ON TABLE public.rental_stop_rule_versions FROM authenticated;
REVOKE SELECT ON TABLE public.rental_stop_term_snapshots FROM authenticated;
REVOKE SELECT ON TABLE public.rental_stop_readiness_declarations FROM authenticated;
REVOKE SELECT ON TABLE public.rental_stop_evaluation_attempts FROM authenticated;
REVOKE SELECT ON TABLE public.rental_stop_determinations FROM authenticated;

-- Consolidate customer/vendor SELECT policies. These policies remain as a
-- fail-closed contract for any future explicitly granted read surface.
DROP POLICY IF EXISTS "stop_term_snapshots_select_customer"
  ON public.rental_stop_term_snapshots;
DROP POLICY IF EXISTS "stop_term_snapshots_select_accepted_vendor"
  ON public.rental_stop_term_snapshots;
CREATE POLICY "stop_term_snapshots_select_authorized"
  ON public.rental_stop_term_snapshots FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR public.rfq_vendor_has_accepted_quote(rfq_id)
    )
  );

DROP POLICY IF EXISTS "stop_readiness_select_customer"
  ON public.rental_stop_readiness_declarations;
DROP POLICY IF EXISTS "stop_readiness_select_accepted_vendor"
  ON public.rental_stop_readiness_declarations;
CREATE POLICY "stop_readiness_select_authorized"
  ON public.rental_stop_readiness_declarations FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR public.rfq_vendor_has_accepted_quote(rfq_id)
    )
  );

DROP POLICY IF EXISTS "stop_attempts_select_customer"
  ON public.rental_stop_evaluation_attempts;
DROP POLICY IF EXISTS "stop_attempts_select_accepted_vendor"
  ON public.rental_stop_evaluation_attempts;
CREATE POLICY "stop_attempts_select_authorized"
  ON public.rental_stop_evaluation_attempts FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR public.rfq_vendor_has_accepted_quote(rfq_id)
    )
  );

DROP POLICY IF EXISTS "stop_determinations_select_customer"
  ON public.rental_stop_determinations;
DROP POLICY IF EXISTS "stop_determinations_select_accepted_vendor"
  ON public.rental_stop_determinations;
CREATE POLICY "stop_determinations_select_authorized"
  ON public.rental_stop_determinations FOR SELECT TO authenticated
  USING (
    (
      NOT (SELECT public.is_demo_actor((SELECT auth.uid())))
      OR is_simulated = true
    )
    AND (
      rfq_id IN (
        SELECT rr.id
        FROM public.rental_requests AS rr
        WHERE rr.customer_id = (SELECT auth.uid())
           OR rr.customer_organization_id IN (
             SELECT om.organization_id
             FROM public.organization_memberships AS om
             WHERE om.user_id = (SELECT auth.uid())
               AND om.archived_at IS NULL
           )
      )
      OR public.rfq_vendor_has_accepted_quote(rfq_id)
    )
  );

-- The evaluator/rule policies are already singular and fail closed. They are
-- retained unchanged even though authenticated table SELECT is now revoked.
