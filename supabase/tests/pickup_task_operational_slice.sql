BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(41);

SELECT has_table('public', 'rental_pickup_tasks', 'PickupTask table exists');
SELECT has_table('public', 'rental_pickup_schedule_events', 'pickup schedule event table exists');

SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_tasks'::regclass),
  'PickupTask RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_schedule_events'::regclass),
  'pickup schedule event RLS is enabled'
);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_pickup_tasks', 'SELECT'),
  'authenticated clients cannot read PickupTask rows directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_pickup_schedule_events', 'SELECT'),
  'authenticated clients cannot read pickup schedule events directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', table_name, privilege_name),
  format('service_role lacks direct %s on %s', privilege_name, table_name)
)
FROM unnest(ARRAY[
  'public.rental_pickup_tasks',
  'public.rental_pickup_schedule_events'
]) AS tables(table_name)
CROSS JOIN unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  has_table_privilege('service_role', 'public.rental_pickup_tasks', 'SELECT'),
  'service_role can assemble the sanitized PickupTask projection'
);
SELECT ok(
  has_table_privilege('service_role', 'public.rental_pickup_schedule_events', 'SELECT'),
  'service_role can assemble the sanitized pickup event projection'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.propose_rental_pickup_schedule(uuid,uuid,timestamptz,timestamptz,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed vendor scheduling command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.propose_rental_pickup_schedule(uuid,uuid,timestamptz,timestamptz,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the vendor scheduling command directly'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.respond_rental_pickup_schedule(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed customer response command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.respond_rental_pickup_schedule(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the customer response command directly'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_stop_rule_versions),
  0,
  'PickupTask publishes no contractual stop-rent rule'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname ILIKE '%pickup%override%'
  ),
  'PickupTask creates no override pathway'
);

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000007101', 'authenticated', 'authenticated',
   'pickup-customer@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Customer","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000007102', 'authenticated', 'authenticated',
   'pickup-vendor@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Vendor","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000007103', 'authenticated', 'authenticated',
   'pickup-outsider@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Outsider","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000007104', 'authenticated', 'authenticated',
   'pickup-vendor-member@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Vendor Member","role":"vendor"}'::jsonb, now(), now());

INSERT INTO public.organizations (
  id, name, org_type, slug, verified, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000007201', 'Pickup Customer', 'customer',
   'pickup-customer-test', true, false),
  ('00000000-0000-4000-8000-000000007202', 'Pickup Vendor', 'vendor',
   'pickup-vendor-test', true, false);

INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000007201',
   '00000000-0000-4000-8000-000000007101', 'owner', false),
  ('00000000-0000-4000-8000-000000007202',
   '00000000-0000-4000-8000-000000007102', 'owner', false),
  ('00000000-0000-4000-8000-000000007202',
   '00000000-0000-4000-8000-000000007104', 'member', false);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000007301',
  '00000000-0000-4000-8000-000000007101',
  '00000000-0000-4000-8000-000000007201',
  'demobilizing', false, now(), now()
);

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, accepted_by, status,
  daily_rate, submitted_at, accepted_at, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000007401',
  '00000000-0000-4000-8000-000000007301',
  '00000000-0000-4000-8000-000000007202',
  '00000000-0000-4000-8000-000000007102',
  '00000000-0000-4000-8000-000000007101',
  'accepted', 100, now() - interval '3 hours', now() - interval '2 hours', false
);

INSERT INTO public.audit_events (
  id, correlation_id, entity_type, entity_id, event_type, event_category,
  actor_id, actor_role, actor_type, source, is_simulated, related_rfq_id,
  related_customer_organization_id, related_vendor_organization_id
) VALUES
  ('00000000-0000-4000-8000-000000007501',
   '00000000-0000-4000-8000-000000007511',
   'rental_off_rent_request', '00000000-0000-4000-8000-000000007601',
   'off_rent_requested', 'rfq', '00000000-0000-4000-8000-000000007101',
   'customer', 'user', 'customer_action', false,
   '00000000-0000-4000-8000-000000007301',
   '00000000-0000-4000-8000-000000007201',
   '00000000-0000-4000-8000-000000007202'),
  ('00000000-0000-4000-8000-000000007502',
   '00000000-0000-4000-8000-000000007512',
   'rental_off_rent_acknowledgment', '00000000-0000-4000-8000-000000007602',
   'off_rent_acknowledged', 'rfq', '00000000-0000-4000-8000-000000007102',
   'vendor_dispatch', 'user', 'vendor_action', false,
   '00000000-0000-4000-8000-000000007301',
   '00000000-0000-4000-8000-000000007201',
   '00000000-0000-4000-8000-000000007202');

INSERT INTO public.rental_off_rent_requests (
  id, rfq_id, requested_by, requested_at, requested_stop_at,
  pickup_available_from, pickup_available_until, correlation_id,
  audit_event_id, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000007601',
  '00000000-0000-4000-8000-000000007301',
  '00000000-0000-4000-8000-000000007101',
  now() - interval '3 hours', now() - interval '2 hours',
  '2030-08-18T14:00:00Z', '2030-08-18T20:00:00Z',
  '00000000-0000-4000-8000-000000007511',
  '00000000-0000-4000-8000-000000007501', false
);

INSERT INTO public.rental_off_rent_acknowledgments (
  id, rfq_id, off_rent_request_id, vendor_organization_id,
  acknowledged_by, acknowledged_at, pickup_window_start, pickup_window_end,
  correlation_id, audit_event_id, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000007602',
  '00000000-0000-4000-8000-000000007301',
  '00000000-0000-4000-8000-000000007601',
  '00000000-0000-4000-8000-000000007202',
  '00000000-0000-4000-8000-000000007102', now() - interval '1 hour',
  '2030-08-18T14:00:00Z', '2030-08-18T20:00:00Z',
  '00000000-0000-4000-8000-000000007512',
  '00000000-0000-4000-8000-000000007502', false
);

SELECT throws_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007103',
    '2030-08-19T14:00:00Z', '2030-08-19T17:00:00Z',
    NULL, NULL, 'outsider-proposal'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007103 lacks accepted-vendor pickup scheduling authority for RFQ 00000000-0000-4000-8000-000000007301',
  'an unrelated actor cannot create a PickupTask'
);

SELECT lives_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    '2030-08-19T14:00:00Z', '2030-08-19T17:00:00Z',
    NULL, 'Gate 3', 'vendor-proposal-1'
  ) $$,
  'the accepted vendor can create the RFQ-wide task and propose a schedule'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_pickup_tasks
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'the command creates exactly one RFQ-wide PickupTask'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_schedule_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  'schedule_proposed',
  'the initial append-only event is schedule_proposed'
);

SELECT lives_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    '2030-08-19T14:00:00Z', '2030-08-19T17:00:00Z',
    NULL, 'Gate 3', 'vendor-proposal-1'
  ) $$,
  'an exact idempotent replay succeeds'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_pickup_schedule_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'an idempotent replay creates no duplicate event'
);

SELECT lives_ok(
  $$ SELECT public.respond_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'confirm', NULL, NULL, 'customer-response-1'
  ) $$,
  'the owning customer can confirm the pending schedule'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_schedule_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'
   ORDER BY event_sequence DESC LIMIT 1),
  'schedule_confirmed',
  'the append-only projection now reports a confirmed schedule'
);

SELECT throws_ok(
  $$ SELECT public.respond_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'confirm', NULL, NULL, 'vendor-response'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007102 lacks customer pickup schedule response authority for RFQ 00000000-0000-4000-8000-000000007301',
  'the vendor cannot exercise customer schedule-response authority'
);
SELECT throws_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    '2030-08-20T14:00:00Z', '2030-08-20T17:00:00Z',
    NULL, 'customer cannot schedule', 'customer-proposal'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007101 lacks accepted-vendor pickup scheduling authority for RFQ 00000000-0000-4000-8000-000000007301',
  'the customer cannot exercise accepted-vendor scheduling authority'
);
SELECT throws_ok(
  $$ SELECT public.respond_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'confirm', NULL, NULL, 'customer-response-2'
  ) $$,
  'P0001',
  'Pickup task has no pending schedule proposal for RFQ 00000000-0000-4000-8000-000000007301',
  'a second customer response fails closed without a pending proposal'
);

SELECT throws_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007104',
    '2030-08-20T14:00:00Z', '2030-08-20T17:00:00Z',
    'vendor_capacity', 'Generic member lacks scheduling authority', 'member-reschedule'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007104 lacks accepted-vendor pickup scheduling authority for RFQ 00000000-0000-4000-8000-000000007301',
  'a generic accepted-vendor member cannot exercise scheduling authority'
);

SELECT throws_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    '2030-08-20T14:00:00Z', '2030-08-20T17:00:00Z',
    NULL, 'Truck capacity changed', 'missing-reason-code'
  ) $$,
  'P0001',
  'A structured reason code is required when proposing a replacement pickup schedule',
  'a replacement proposal fails closed without a structured reason code'
);

SELECT lives_ok(
  $$ SELECT public.propose_rental_pickup_schedule(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    '2030-08-20T14:00:00Z', '2030-08-20T17:00:00Z',
    'vendor_capacity', 'Truck capacity changed', 'vendor-reschedule-1'
  ) $$,
  'an accepted-vendor owner can propose a governed replacement schedule'
);
SELECT is(
  (SELECT reason_code FROM public.rental_pickup_schedule_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'
   ORDER BY event_sequence DESC LIMIT 1),
  'vendor_capacity',
  'the replacement proposal records its governed reason code'
);

SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000007301'),
  'demobilizing',
  'pickup scheduling does not change rental lifecycle state'
);
SELECT ok(
  (SELECT off_rent_at IS NULL FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000007301'),
  'pickup scheduling does not create a stop-rent timestamp'
);

SELECT throws_ok(
  $$ UPDATE public.rental_pickup_tasks SET object_scope = 'rfq'
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_tasks rows are immutable; append a governed pickup event instead',
  'PickupTask records are immutable'
);
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_schedule_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_schedule_events rows are immutable; append a governed pickup event instead',
  'pickup schedule events are immutable'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN ('rental_pickup_tasks', 'rental_pickup_schedule_events')
      AND column_name ~ '(line|item|quantity|serial|kit|component|partial|custody|billing)'
  ),
  'the first slice exposes no granular, custody, or billing columns'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000007301'
     AND event_type LIKE 'pickup.%'),
  3,
  'each accepted PickupTask command produces one atomic audit event'
);

SELECT * FROM finish();
ROLLBACK;
