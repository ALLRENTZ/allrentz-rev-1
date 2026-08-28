BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(44);

SELECT has_table('public', 'rental_orders', 'Rental Order identity table exists');
SELECT has_table('public', 'rental_order_versions', 'Rental Order version table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_orders'::regclass),
  'Rental Order RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_order_versions'::regclass),
  'Rental Order version RLS is enabled'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.rental_orders', 'SELECT'),
  'authenticated parties may use the RLS-governed Rental Order projection'
);
SELECT ok(
  has_table_privilege('authenticated', 'public.rental_order_versions', 'SELECT'),
  'authenticated parties may use the RLS-governed version projection'
);

SELECT ok(
  NOT has_table_privilege('authenticated', table_name, privilege_name),
  format('authenticated lacks direct %s on %s', privilege_name, table_name)
)
FROM unnest(ARRAY[
  'public.rental_orders',
  'public.rental_order_versions'
]) AS tables(table_name)
CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  has_table_privilege('service_role', 'public.rental_orders', 'SELECT'),
  'service role may assemble a sanitized Rental Order projection'
);
SELECT ok(
  has_table_privilege('service_role', 'public.rental_order_versions', 'SELECT'),
  'service role may assemble a sanitized Rental Order version projection'
);

SELECT ok(
  NOT has_table_privilege('service_role', table_name, privilege_name),
  format('service_role lacks direct %s on %s', privilege_name, table_name)
)
FROM unnest(ARRAY[
  'public.rental_orders',
  'public.rental_order_versions'
]) AS tables(table_name)
CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'private.materialize_rental_order_from_accepted_quote(uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot materialize Rental Orders directly'
);
SELECT ok(
  NOT has_function_privilege(
    'service_role',
    'private.materialize_rental_order_from_accepted_quote(uuid)',
    'EXECUTE'
  ),
  'service role cannot bypass quote acceptance to materialize Rental Orders'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'private.capture_rental_order_quote_acceptance()',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the acceptance trigger function'
);

SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.rental_orders'::regclass
      AND tgname = 'rental_orders_immutable'
      AND NOT tgisinternal
  ),
  'Rental Order identities are protected by an immutability trigger'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.rental_order_versions'::regclass
      AND tgname = 'rental_order_versions_immutable'
      AND NOT tgisinternal
  ),
  'Rental Order versions are protected by an immutability trigger'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.vendor_quote_responses'::regclass
      AND tgname = 'vendor_quote_acceptance_creates_rental_order'
      AND NOT tgisinternal
  ),
  'accepted quotes atomically create the Rental Order boundary'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'private'
      AND proc.proname = 'materialize_rental_order_from_accepted_quote'
      AND proc.prosecdef
      AND proc.proconfig = ARRAY['search_path=""']
  ),
  'internal materializer is SECURITY DEFINER with an empty search path'
);

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000008101', 'authenticated', 'authenticated',
   'order-customer@example.test', '{}'::jsonb,
   '{"full_name":"Order Customer","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000008102', 'authenticated', 'authenticated',
   'order-vendor@example.test', '{}'::jsonb,
   '{"full_name":"Order Vendor","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000008103', 'authenticated', 'authenticated',
   'order-outsider@example.test', '{}'::jsonb,
   '{"full_name":"Order Outsider","role":"customer"}'::jsonb, now(), now());

INSERT INTO public.organizations (
  id, name, org_type, slug, verified, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000008201', 'Order Customer', 'customer',
   'order-customer-test', true, false),
  ('00000000-0000-4000-8000-000000008202', 'Order Vendor', 'vendor',
   'order-vendor-test', true, false);

INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000008201',
   '00000000-0000-4000-8000-000000008101', 'owner', false),
  ('00000000-0000-4000-8000-000000008202',
   '00000000-0000-4000-8000-000000008102', 'owner', false);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000008301',
  '00000000-0000-4000-8000-000000008101',
  '00000000-0000-4000-8000-000000008201',
  'vendor_quote_received', false, now(), now()
);

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, version, status,
  daily_rate, delivery_fee, mobilization_fee, minimum_rental_days,
  available_start_date, equipment_substitution, compliance_confirmed,
  submitted_at, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000008401',
  '00000000-0000-4000-8000-000000008301',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008102',
  2, 'submitted', 275.50, 150, 85, 7,
  current_date + 1, false, true, now(), false
);

SELECT lives_ok(
  $$SELECT public.transition_rfq_status(
    '00000000-0000-4000-8000-000000008301',
    'quote_accepted'::public.app_rfq_status,
    '00000000-0000-4000-8000-000000008101',
    'customer',
    'Accepted governed vendor quote',
    'customer_action',
    false,
    '00000000-0000-4000-8000-000000008401'
  )$$,
  'canonical quote acceptance atomically materializes a Rental Order'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  1,
  'exactly one Rental Order exists for the accepted RFQ'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.rental_order_versions AS version
   JOIN public.rental_orders AS rental_order ON rental_order.id = version.rental_order_id
   WHERE rental_order.rfq_id = '00000000-0000-4000-8000-000000008301'),
  1,
  'exactly one immutable version exists for the new Rental Order'
);
SELECT is(
  (SELECT (version.snapshot_payload #>> '{accepted_quote,daily_rate}')::numeric
   FROM public.rental_order_versions AS version
   JOIN public.rental_orders AS rental_order ON rental_order.id = version.rental_order_id
   WHERE rental_order.rfq_id = '00000000-0000-4000-8000-000000008301'),
  275.50::numeric,
  'version 1 preserves the accepted daily rate'
);
SELECT is(
  (SELECT customer_organization_state FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  'recorded'::text,
  'the established customer organization boundary is recorded'
);
SELECT ok(
  (SELECT order_reference ~ '^ARO-[0-9]{8}-[0-9A-F]{10}$'
   FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  'Rental Order has a stable internal reference distinct from any customer PO'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000008301'
     AND event_type = 'rental_order.created'),
  1,
  'Rental Order creation has one atomic audit event'
);

CREATE TEMP TABLE rental_order_rls_results (
  result_key text PRIMARY KEY,
  visible_count integer NOT NULL
);
GRANT INSERT, SELECT ON TABLE rental_order_rls_results TO authenticated;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000008101',
  true
);
SET LOCAL ROLE authenticated;
INSERT INTO rental_order_rls_results VALUES
  ('customer_orders', (
    SELECT count(*)::integer FROM public.rental_orders
    WHERE rfq_id = '00000000-0000-4000-8000-000000008301'
  )),
  ('customer_versions', (
    SELECT count(*)::integer FROM public.rental_order_versions
    WHERE source_accepted_quote_id = '00000000-0000-4000-8000-000000008401'
  ));
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000008102',
  true
);
SET LOCAL ROLE authenticated;
INSERT INTO rental_order_rls_results VALUES
  ('vendor_orders', (
    SELECT count(*)::integer FROM public.rental_orders
    WHERE rfq_id = '00000000-0000-4000-8000-000000008301'
  )),
  ('vendor_versions', (
    SELECT count(*)::integer FROM public.rental_order_versions
    WHERE source_accepted_quote_id = '00000000-0000-4000-8000-000000008401'
  ));
RESET ROLE;

SELECT set_config(
  'request.jwt.claim.sub',
  '00000000-0000-4000-8000-000000008103',
  true
);
SET LOCAL ROLE authenticated;
INSERT INTO rental_order_rls_results VALUES
  ('outsider_orders', (
    SELECT count(*)::integer FROM public.rental_orders
    WHERE rfq_id = '00000000-0000-4000-8000-000000008301'
  )),
  ('outsider_versions', (
    SELECT count(*)::integer FROM public.rental_order_versions
    WHERE source_accepted_quote_id = '00000000-0000-4000-8000-000000008401'
  ));
RESET ROLE;

SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'customer_orders'),
  1,
  'owning customer can read the Rental Order identity'
);
SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'customer_versions'),
  1,
  'owning customer can read the accepted terms snapshot'
);
SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'vendor_orders'),
  1,
  'accepted vendor organization can read the Rental Order identity'
);
SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'vendor_versions'),
  1,
  'accepted vendor organization can read the accepted terms snapshot'
);
SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'outsider_orders'),
  0,
  'unrelated authenticated user cannot read the Rental Order identity'
);
SELECT is(
  (SELECT visible_count FROM rental_order_rls_results WHERE result_key = 'outsider_versions'),
  0,
  'unrelated authenticated user cannot read the accepted terms snapshot'
);

UPDATE public.vendor_quote_responses
SET updated_at = now()
WHERE id = '00000000-0000-4000-8000-000000008401';

SELECT is(
  (SELECT count(*)::integer FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  1,
  'non-status quote updates cannot duplicate the Rental Order'
);

SELECT throws_ok(
  $$UPDATE public.rental_order_versions
    SET snapshot_payload = snapshot_payload || '{"tampered":true}'::jsonb
    WHERE source_accepted_quote_id = '00000000-0000-4000-8000-000000008401'$$,
  'P0001',
  'rental_order_versions rows are immutable; append a governed Rental Order version instead',
  'accepted-quote snapshots cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.rental_orders
    WHERE rfq_id = '00000000-0000-4000-8000-000000008301'$$,
  'P0001',
  'rental_orders rows are immutable; append a governed Rental Order version instead',
  'Rental Order identities cannot be deleted'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('rental_orders', 'rental_order_versions')
      AND column_name IN (
        'purchase_order_number', 'billable_through_at', 'custody_transferred_at',
        'closeout_approved_at', 'line_id', 'quantity'
      )
  ),
  'foundation creates no PO, billing, custody, closeout, or granular authority column'
);

SELECT * FROM finish();
ROLLBACK;
