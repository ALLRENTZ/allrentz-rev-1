BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(144);

SELECT has_table('public', 'rental_pickup_tasks', 'PickupTask table exists');
SELECT has_table('public', 'rental_pickup_schedule_events', 'pickup schedule event table exists');
SELECT has_table('public', 'rental_pickup_dispatch_events', 'pickup dispatch event table exists');
SELECT has_table('public', 'rental_pickup_attempt_events', 'pickup attempt event table exists');
SELECT has_table(
  'public', 'rental_pickup_exception_triage_events',
  'pickup exception triage event table exists'
);
SELECT has_table(
  'public', 'rental_pickup_access_instruction_events',
  'pickup access-instruction event table exists'
);
SELECT has_table(
  'public', 'rental_pickup_customer_exception_report_events',
  'customer pickup exception-report event table exists'
);

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
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_dispatch_events'::regclass),
  'pickup dispatch event RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_attempt_events'::regclass),
  'pickup attempt event RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_exception_triage_events'::regclass),
  'pickup exception triage RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_access_instruction_events'::regclass),
  'pickup access-instruction RLS is enabled'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_pickup_customer_exception_report_events'::regclass),
  'customer pickup exception-report RLS is enabled'
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
  NOT has_table_privilege('authenticated', 'public.rental_pickup_dispatch_events', 'SELECT'),
  'authenticated clients cannot read pickup dispatch events directly'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_pickup_attempt_events', 'SELECT'),
  'authenticated clients cannot read pickup attempt events directly'
);
SELECT ok(
  NOT has_table_privilege(
    'authenticated', 'public.rental_pickup_exception_triage_events', 'SELECT'
  ),
  'authenticated clients cannot read internal pickup exception triage directly'
);
SELECT ok(
  NOT has_table_privilege(
    'authenticated', 'public.rental_pickup_access_instruction_events', 'SELECT'
  ),
  'authenticated clients cannot read pickup access instructions directly'
);
SELECT ok(
  NOT has_table_privilege(
    'authenticated', 'public.rental_pickup_customer_exception_report_events', 'SELECT'
  ),
  'authenticated clients cannot read customer pickup exception reports directly'
);
SELECT ok(
  has_table_privilege(
    'service_role', 'public.rental_pickup_customer_exception_report_events', 'SELECT'
  ),
  'service role can assemble sanitized customer exception-report projections'
);
SELECT ok(
  NOT has_table_privilege(
    'service_role', 'public.rental_pickup_customer_exception_report_events', privilege_name
  ),
  format('service_role lacks direct %s on customer pickup exception reports', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_pickup_customer_exception_report(uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed customer exception-report command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_pickup_customer_exception_report(uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the customer exception-report command directly'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.get_rental_pickup_customer_exception_report_queue(uuid)',
    'EXECUTE'
  ),
  'service_role can transport the authorized customer exception-report queue'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.get_rental_pickup_customer_exception_report_queue(uuid)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the customer exception-report queue directly'
);
SELECT ok(
  has_table_privilege(
    'service_role', 'public.rental_pickup_access_instruction_events', 'SELECT'
  ),
  'service role can assemble sanitized pickup access-instruction projections'
);
SELECT ok(
  NOT has_table_privilege(
    'service_role', 'public.rental_pickup_access_instruction_events', privilege_name
  ),
  format('service_role lacks direct %s on pickup access instructions', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_pickup_access_instructions(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed access-instruction command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_pickup_access_instructions(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call access-instruction command directly'
);
SELECT ok(
  NOT has_table_privilege(
    'service_role', 'public.rental_pickup_exception_triage_events', 'INSERT'
  ),
  'service_role cannot insert triage events outside the canonical command'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_pickup_attempt_events', privilege_name),
  format('service_role lacks direct %s on pickup attempt events', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_table_privilege('service_role', table_name, privilege_name),
  format('service_role lacks direct %s on %s', privilege_name, table_name)
)
FROM unnest(ARRAY[
  'public.rental_pickup_tasks',
  'public.rental_pickup_schedule_events',
  'public.rental_pickup_dispatch_events'
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
  has_table_privilege('service_role', 'public.rental_pickup_dispatch_events', 'SELECT'),
  'service_role can assemble the sanitized dispatch projection'
);
SELECT ok(
  has_table_privilege('service_role', 'public.rental_pickup_attempt_events', 'SELECT'),
  'service_role can assemble the sanitized attempt projection'
);
SELECT ok(
  has_table_privilege(
    'service_role', 'public.rental_pickup_exception_triage_events', 'SELECT'
  ),
  'service_role can assemble the authorized operations triage projection'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_pickup_exception_triage(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the canonical triage command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_pickup_exception_triage(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the triage command directly'
);
SELECT ok(
  has_function_privilege(
    'service_role', 'public.get_rental_pickup_exception_triage_queue(uuid)', 'EXECUTE'
  ),
  'service_role can transport the authorized operations triage queue'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated', 'public.get_rental_pickup_exception_triage_queue(uuid)', 'EXECUTE'
  ),
  'authenticated clients cannot call the operations triage queue directly'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_pickup_attempt_outcome(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed pickup attempt command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_pickup_attempt_outcome(uuid,uuid,text,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the pickup attempt command directly'
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
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.assign_rental_pickup_field_actor(uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'service_role can transport the governed field-assignment command'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.assign_rental_pickup_field_actor(uuid,uuid,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call field assignment directly'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_pickup_dispatch_progress(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'service_role can transport governed dispatch progress'
);
SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_pickup_dispatch_progress(uuid,uuid,text,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call dispatch progress directly'
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
   '{"full_name":"Pickup Vendor Member","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000007105', 'authenticated', 'authenticated',
   'pickup-operations@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Operations","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000007106', 'authenticated', 'authenticated',
   'pickup-manager@example.test', '{}'::jsonb,
   '{"full_name":"Pickup Manager","role":"customer"}'::jsonb, now(), now());

UPDATE public.user_roles
SET role = 'admin'::public.app_role
WHERE user_id = '00000000-0000-4000-8000-000000007105';
UPDATE public.user_roles
SET role = 'manager'::public.app_role
WHERE user_id = '00000000-0000-4000-8000-000000007106';

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

SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_access_instructions(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'site_access', 'Use the east service gate', 'vendor-access-1'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007102 lacks customer pickup access-instruction authority for RFQ 00000000-0000-4000-8000-000000007301',
  'the accepted vendor cannot create customer pickup access instructions'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_access_instructions(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'site_access', 'Use the east service gate', 'customer-access-1'
  ) $$,
  'the owning customer can append RFQ-wide pickup access instructions'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.rental_pickup_access_instruction_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'the governed command appends exactly one access-instruction event'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_access_instructions(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'site_access', 'Use the east service gate', 'customer-access-1'
  ) $$,
  'an identical idempotent replay succeeds'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.rental_pickup_access_instruction_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'an idempotent replay does not append a duplicate event'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000007301'
     AND event_type = 'pickup.access_instructions_added'),
  1,
  'the accepted access instruction appends one atomic audit event'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_access_instructions(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'pickup_location', 'Use the west loading area', 'customer-access-1'
  ) $$,
  'P0001',
  'Pickup access-instruction idempotency key conflicts with an existing command',
  'an idempotency-key conflict fails closed'
);
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_access_instruction_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_access_instruction_events rows are immutable; append a governed pickup event instead',
  'pickup access-instruction history is immutable'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_customer_exception_report(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'The site gate is unavailable', 'vendor-customer-report-1'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007102 lacks customer pickup exception-report authority for RFQ 00000000-0000-4000-8000-000000007301',
  'the accepted vendor cannot create a customer exception report'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_customer_exception_report(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'The site gate is unavailable', 'customer-report-1'
  ) $$,
  'the owning customer can append an RFQ-wide exception report'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.rental_pickup_customer_exception_report_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'the governed command appends exactly one customer exception-report event'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_customer_exception_report(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'The site gate is unavailable', 'customer-report-1'
  ) $$,
  'an identical customer exception-report replay succeeds'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.rental_pickup_customer_exception_report_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'an idempotent customer exception-report replay creates no duplicate event'
);
SELECT is(
  (SELECT count(*)::integer
   FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000007301'
     AND event_type = 'pickup.customer_exception_reported'),
  1,
  'the accepted customer exception report appends one atomic audit event'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_customer_exception_report(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'A different report', 'customer-report-1'
  ) $$,
  'P0001',
  'Pickup customer exception idempotency key conflicts with an existing command',
  'a customer exception-report idempotency conflict fails closed'
);
SELECT is(
  (SELECT review_state
   FROM public.get_rental_pickup_customer_exception_report_queue(
     '00000000-0000-4000-8000-000000007105'
   )),
  'review_required',
  'the operations queue keeps the customer report review-required'
);
SELECT is(
  (SELECT resolution_state
   FROM public.get_rental_pickup_customer_exception_report_queue(
     '00000000-0000-4000-8000-000000007105'
   )),
  'blocked',
  'the operations queue keeps customer exception resolution blocked'
);
SELECT throws_ok(
  $$ SELECT * FROM public.get_rental_pickup_customer_exception_report_queue(
    '00000000-0000-4000-8000-000000007101'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007101 lacks pickup exception triage authority',
  'a customer cannot access the internal operations report queue'
);
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_customer_exception_report_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_customer_exception_report_events rows are immutable; append a governed pickup event instead',
  'customer exception-report history is immutable'
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
  $$ SELECT public.assign_rental_pickup_field_actor(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007104',
    'Generic member cannot dispatch', 'member-assignment'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007104 lacks accepted-vendor field assignment authority for RFQ 00000000-0000-4000-8000-000000007301',
  'a generic vendor member cannot exercise dispatcher assignment authority'
);
SELECT lives_ok(
  $$ SELECT public.assign_rental_pickup_field_actor(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'Assigned for confirmed window', 'vendor-assignment-1'
  ) $$,
  'the accepted-vendor owner can assign themselves as field actor'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_pickup_dispatch_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'field assignment appends exactly one dispatch event'
);
SELECT lives_ok(
  $$ SELECT public.assign_rental_pickup_field_actor(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'Assigned for confirmed window', 'vendor-assignment-1'
  ) $$,
  'an exact field-assignment replay succeeds'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_pickup_dispatch_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  1,
  'an idempotent field-assignment replay creates no duplicate event'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_dispatch_progress(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007104',
    'en_route', 'Unassigned member', 'member-en-route'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007104 is not the assigned pickup field actor for RFQ 00000000-0000-4000-8000-000000007301',
  'an unassigned vendor member cannot report dispatch progress'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_dispatch_progress(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'arrived', 'Skipped en route', 'vendor-arrival-early'
  ) $$,
  'P0001',
  'Pickup dispatch transition arrived requires prior state en_route_recorded; current state is field_actor_assigned',
  'arrival fails closed until en-route progress exists'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_dispatch_progress(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'en_route', 'Departed vendor yard', 'vendor-en-route-1'
  ) $$,
  'the assigned field actor can report en-route progress'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_dispatch_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'
   ORDER BY event_sequence DESC LIMIT 1),
  'en_route_recorded',
  'dispatch projection advances to en-route reported'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_dispatch_progress(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'arrived', 'At customer site', 'vendor-arrival-1'
  ) $$,
  'the assigned field actor can report arrival after en route'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_dispatch_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'
   ORDER BY event_sequence DESC LIMIT 1),
  'arrival_recorded',
  'dispatch projection advances to arrival reported'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007104',
    'failed', 'equipment_not_ready', 'Equipment still in use', 'wrong-actor-attempt'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007104 is not the assigned pickup field actor for RFQ 00000000-0000-4000-8000-000000007301',
  'an unassigned accepted-vendor member cannot record a pickup attempt'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'failed', NULL, 'Equipment still in use', 'missing-attempt-reason'
  ) $$,
  'P0001',
  'Failed pickup attempt requires a governed reason code',
  'a failed pickup attempt requires a structured reason'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'collection_asserted', 'equipment_not_ready', NULL, 'collection-with-reason'
  ) $$,
  'P0001',
  'Pickup attempt reason is only permitted for a failed attempt',
  'a collection assertion cannot carry a failure reason'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'failed', 'equipment_not_ready', 'Equipment still in use', 'failed-attempt-1'
  ) $$,
  'the assigned field actor can append a structured failed-attempt outcome'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_attempt_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  'attempt_failed',
  'the attempt ledger records the failed outcome'
);
SELECT is(
  (SELECT reason_code FROM public.rental_pickup_attempt_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'),
  'equipment_not_ready',
  'the attempt ledger records the governed exception reason'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'failed', 'equipment_not_ready', 'Equipment still in use', 'failed-attempt-1'
  ) $$,
  'an exact pickup attempt replay is idempotent'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_attempt_outcome(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007102',
    'collection_asserted', NULL, 'Loaded by driver', 'second-attempt'
  ) $$,
  'P0001',
  'Pickup task already has an attempt outcome; retry authority is not included',
  'a second pickup attempt fails closed without approved retry authority'
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
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_dispatch_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_dispatch_events rows are immutable; append a governed pickup event instead',
  'pickup dispatch events are immutable'
);
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_attempt_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_attempt_events rows are immutable; append a governed pickup event instead',
  'pickup attempt events are immutable'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name IN (
        'rental_pickup_tasks',
        'rental_pickup_schedule_events',
        'rental_pickup_dispatch_events',
        'rental_pickup_attempt_events',
        'rental_pickup_access_instruction_events'
      )
      AND column_name ~ '(line|item|quantity|serial|kit|component|partial|custody|billing)'
  ),
  'the first slice exposes no granular, custody, or billing columns'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000007301'
     AND event_type LIKE 'pickup.%'),
  9,
  'each accepted PickupTask command produces one atomic audit event'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007101',
    'claim', NULL, NULL, 'customer-triage-claim'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007101 lacks pickup exception triage authority',
  'a customer cannot claim operations triage'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'claim', NULL, NULL, 'operations-triage-claim'
  ) $$,
  'an active protected operations actor can claim triage for self'
);
SELECT is(
  (SELECT event_type FROM public.rental_pickup_exception_triage_events
   WHERE rfq_id = '00000000-0000-4000-8000-000000007301'
   ORDER BY event_sequence DESC LIMIT 1),
  'triage_claimed',
  'claiming appends a triage event'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'claim', NULL, NULL, 'operations-triage-claim'
  ) $$,
  'an exact triage claim replay is idempotent'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007106',
    'note', NULL, 'Manager note', 'manager-triage-note'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000007106 is not the assigned pickup exception triage actor',
  'another operations actor cannot append to the claimed triage'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'note', NULL, 'Customer coordination requested', 'operations-triage-note'
  ) $$,
  'the assigned operations actor can append an internal note'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'escalate', 'billing_adjustment', 'Not a governed reason', 'invalid-escalation'
  ) $$,
  'P0001',
  'Pickup exception escalation reason must be governed',
  'triage cannot escalate using a financial or ungoverned reason'
);
SELECT lives_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'escalate', 'site_access_review', 'Gate remains inaccessible', 'valid-escalation'
  ) $$,
  'the assigned operations actor can append a governed escalation'
);
SELECT throws_ok(
  $$ SELECT public.record_rental_pickup_exception_triage(
    '00000000-0000-4000-8000-000000007301',
    '00000000-0000-4000-8000-000000007105',
    'note', NULL, 'Post-escalation mutation', 'post-escalation-note'
  ) $$,
  'P0001',
  'Pickup exception triage is already escalated; further mutation is not authorized',
  'an escalation is terminal for the bounded triage workflow'
);
SELECT is(
  (SELECT triage_state FROM public.get_rental_pickup_exception_triage_queue(
    '00000000-0000-4000-8000-000000007105'
  )),
  'escalated',
  'the operations projection shows the latest triage state'
);
SELECT is(
  (SELECT resolution_state FROM public.get_rental_pickup_exception_triage_queue(
    '00000000-0000-4000-8000-000000007105'
  )),
  'blocked',
  'the operations projection keeps resolution blocked'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000007301'
     AND event_type LIKE 'pickup.exception.triage_%'),
  3,
  'each accepted triage command appends one atomic audit event'
);
SELECT throws_ok(
  $$ DELETE FROM public.rental_pickup_exception_triage_events
     WHERE rfq_id = '00000000-0000-4000-8000-000000007301' $$,
  'P0001',
  'rental_pickup_exception_triage_events rows are immutable; append a governed pickup event instead',
  'triage history is immutable'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname ILIKE '%pickup%exception%resolve%'
  ),
  'no pickup exception resolution command exists'
);

SELECT * FROM finish();
ROLLBACK;
