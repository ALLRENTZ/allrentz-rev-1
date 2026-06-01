-- B1a: Remove authenticated UPDATE/DELETE authority from rental_requests
--
-- PRE-B1a STATE CAPTURE confirmed (2026-06-01):
--   Active policies on rental_requests:
--     "Customers manage own requests"           cmd=ALL    roles={public}
--     "Vendors view requests for own equipment" cmd=SELECT roles={public}
--   No FOR UPDATE policy exists. No overlapping policies exist.
--   transition_rfq_status() EXECUTE: postgres + service_role only.
--   Migration chain complete through 20260528000000.
--
-- Problem:
--   "Customers manage own requests" is FOR ALL with roles={public} (all roles).
--   No TO clause was specified at creation, so PostgreSQL defaulted to PUBLIC.
--   In practice, only authenticated users can satisfy auth.uid() = customer_id,
--   but the policy grants UPDATE and DELETE authority with no audit trail,
--   no allowlist check, and no Edge Function gate -- a direct bypass of the
--   operational authority layer.
--
-- Remediation:
--   Drop the FOR ALL policy. Replace with two narrowly-scoped policies
--   explicitly limited to the authenticated role:
--     rfq_customer_select -- read access for the owning customer
--     rfq_customer_insert -- insert access for the owning customer
--   UPDATE and DELETE authority are removed from all roles on rental_requests.
--
-- Authorized UPDATE path after B1a:
--   POST /functions/v1/rfq-transition
--     -> validates JWT and derives actor authority server-side
--     -> calls transition_rfq_status() via service_role RPC
--     -> SECURITY DEFINER function updates rental_requests (bypasses RLS)
--
-- Not changed by this migration:
--   "Vendors view requests for own equipment" FOR SELECT (untouched)
--   Table-level GRANTs (authenticated retains GRANT UPDATE at table level;
--     RLS default-deny blocks execution when no matching policy exists)
--   transition_rfq_status() function and its EXECUTE grants
--   Any other table, policy, function, index, or schema object
--
-- Rollback (emergency only -- re-opens UPDATE/DELETE bypass for all roles):
--   DROP POLICY IF EXISTS rfq_customer_select ON public.rental_requests;
--   DROP POLICY IF EXISTS rfq_customer_insert ON public.rental_requests;
--   CREATE POLICY "Customers manage own requests"
--     ON public.rental_requests FOR ALL
--     USING (auth.uid() = customer_id);
--
-- Depends on: 20260528000000_p1_rfq_transition_admin_override.sql

DROP POLICY IF EXISTS "Customers manage own requests" ON public.rental_requests;

CREATE POLICY rfq_customer_select
  ON public.rental_requests
  FOR SELECT
  TO authenticated
  USING (auth.uid() = customer_id);

CREATE POLICY rfq_customer_insert
  ON public.rental_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = customer_id);
