BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(56);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_stop_rule_versions),
  0,
  'the migration publishes no contractual stop-rent rule'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.determine_rental_stop_and_transition(uuid,uuid,text)',
    'EXECUTE'
  ),
  'service_role may transport the governed determination command'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.determine_rental_stop_and_transition(uuid,uuid,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot call the privileged command directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_stop_determinations', 'INSERT'),
  'service_role cannot insert determinations directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_off_rent_requests', 'INSERT'),
  'service_role cannot bypass the off-rent request command with a direct insert'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_off_rent_acknowledgments', 'UPDATE'),
  'service_role cannot mutate acknowledgments directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_stop_rule_versions', 'INSERT'),
  'service_role cannot publish a rule with a direct insert'
);

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000101', 'authenticated', 'authenticated',
   'clock-customer@example.test', '{}'::jsonb,
   '{"full_name":"Clock Customer","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000102', 'authenticated', 'authenticated',
   'clock-vendor@example.test', '{}'::jsonb,
   '{"full_name":"Clock Vendor","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000103', 'authenticated', 'authenticated',
   'clock-admin@example.test', '{}'::jsonb,
   '{"full_name":"Clock Admin","role":"admin"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000104', 'authenticated', 'authenticated',
   'clock-outsider@example.test', '{}'::jsonb,
   '{"full_name":"Clock Outsider","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000105', 'authenticated', 'authenticated',
   'clock-demo@example.test', '{}'::jsonb,
   '{"full_name":"Clock Demo","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000000106', 'authenticated', 'authenticated',
   'clock-demo-admin@example.test', '{}'::jsonb,
   '{"full_name":"Clock Demo Admin","role":"admin"}'::jsonb, now(), now());

-- Elevated roles cannot be self-assigned through signup metadata. The local
-- harness provisions its technical publishers through the backend-only table
-- surface to model the trusted administrative path.
DELETE FROM public.user_roles
WHERE user_id IN (
  '00000000-0000-4000-8000-000000000103',
  '00000000-0000-4000-8000-000000000106'
)
AND role = 'customer';

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('00000000-0000-4000-8000-000000000103', 'admin'),
  ('00000000-0000-4000-8000-000000000106', 'admin');

UPDATE public.profiles
SET is_demo = true
WHERE id IN (
  '00000000-0000-4000-8000-000000000105',
  '00000000-0000-4000-8000-000000000106'
);

INSERT INTO public.organizations (
  id, name, org_type, slug, verified, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000000201', 'Clock Customer', 'customer',
   'clock-customer', true, false),
  ('00000000-0000-4000-8000-000000000202', 'Clock Vendor', 'vendor',
   'clock-vendor', true, false);

INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000000201',
   '00000000-0000-4000-8000-000000000101', 'owner', false),
  ('00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102', 'owner', false);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201', 'demobilizing', false, now(), now()),
  ('00000000-0000-4000-8000-000000000302',
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201', 'demobilizing', false, now(), now()),
  ('00000000-0000-4000-8000-000000000303',
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201', 'demobilizing', false, now(), now()),
  ('00000000-0000-4000-8000-000000000304',
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201', 'demobilizing', false, now(), now()),
  ('00000000-0000-4000-8000-000000000305',
   '00000000-0000-4000-8000-000000000101',
   '00000000-0000-4000-8000-000000000201', 'on_rent', false, now(), now());

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, accepted_by, status,
  daily_rate, submitted_at, accepted_at, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000000401',
   '00000000-0000-4000-8000-000000000301',
   '00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000101', 'accepted', 100,
   now() - interval '1 hour', now() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000402',
   '00000000-0000-4000-8000-000000000302',
   '00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000101', 'accepted', 100,
   now() - interval '1 hour', now() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000403',
   '00000000-0000-4000-8000-000000000303',
   '00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000101', 'accepted', 100,
   now() - interval '1 hour', now() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000404',
   '00000000-0000-4000-8000-000000000304',
   '00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000101', 'accepted', 100,
   now() - interval '1 hour', now() + interval '1 hour', false),
  ('00000000-0000-4000-8000-000000000405',
   '00000000-0000-4000-8000-000000000305',
   '00000000-0000-4000-8000-000000000202',
   '00000000-0000-4000-8000-000000000102',
   '00000000-0000-4000-8000-000000000101', 'accepted', 100,
   now() - interval '1 hour', now() + interval '1 hour', false);

INSERT INTO public.audit_events (
  id, correlation_id, entity_type, entity_id, event_type, event_category,
  actor_id, actor_role, actor_type, source, is_simulated, related_rfq_id,
  related_customer_organization_id, related_vendor_organization_id
) SELECT
  ('00000000-0000-4000-8000-' || lpad((900 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((910 + n)::text, 12, '0'))::uuid,
  CASE WHEN n <= 4 THEN 'rental_off_rent_request' ELSE 'rental_off_rent_acknowledgment' END,
  CASE WHEN n <= 4
    THEN ('00000000-0000-4000-8000-' || lpad((500 + n)::text, 12, '0'))::uuid
    ELSE ('00000000-0000-4000-8000-' || lpad((596 + n)::text, 12, '0'))::uuid
  END,
  CASE WHEN n <= 4 THEN 'off_rent_requested' ELSE 'off_rent_acknowledged' END,
  'rfq',
  CASE WHEN n <= 4
    THEN '00000000-0000-4000-8000-000000000101'::uuid
    ELSE '00000000-0000-4000-8000-000000000102'::uuid
  END,
  CASE WHEN n <= 4 THEN 'customer' ELSE 'vendor_dispatch' END,
  'user',
  CASE WHEN n <= 4 THEN 'customer_action' ELSE 'vendor_action' END,
  false,
  ('00000000-0000-4000-8000-' || lpad((300 + CASE WHEN n <= 4 THEN n ELSE n - 4 END)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000201'::uuid,
  '00000000-0000-4000-8000-000000000202'::uuid
FROM generate_series(1, 8) AS n;

INSERT INTO public.rental_off_rent_requests (
  id, rfq_id, requested_by, requested_at, requested_stop_at,
  pickup_available_from, pickup_available_until, correlation_id,
  audit_event_id, is_simulated
) SELECT
  ('00000000-0000-4000-8000-' || lpad((500 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((300 + n)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000101'::uuid,
  now() - interval '2 hours', now() - interval '90 minutes',
  now() - interval '1 hour', now() + interval '2 hours',
  ('00000000-0000-4000-8000-' || lpad((910 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((900 + n)::text, 12, '0'))::uuid,
  false
FROM generate_series(1, 4) AS n;

INSERT INTO public.rental_off_rent_acknowledgments (
  id, rfq_id, off_rent_request_id, vendor_organization_id,
  acknowledged_by, acknowledged_at, pickup_window_start, pickup_window_end,
  correlation_id, audit_event_id, is_simulated
) SELECT
  ('00000000-0000-4000-8000-' || lpad((600 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((300 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((500 + n)::text, 12, '0'))::uuid,
  '00000000-0000-4000-8000-000000000202'::uuid,
  '00000000-0000-4000-8000-000000000102'::uuid,
  now() - interval '100 minutes', now() - interval '1 hour', now() + interval '2 hours',
  ('00000000-0000-4000-8000-' || lpad((914 + n)::text, 12, '0'))::uuid,
  ('00000000-0000-4000-8000-' || lpad((904 + n)::text, 12, '0'))::uuid,
  false
FROM generate_series(1, 4) AS n;

CREATE TEMP TABLE rental_clock_results (
  result_key text PRIMARY KEY,
  result jsonb NOT NULL
);

SELECT throws_ok(
  $$ SELECT public.record_rental_off_rent_request(
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000106',
    now(), now() + interval '1 hour', now() + interval '2 hours', NULL
  ) $$,
  'P0001',
  'Demo actor 00000000-0000-4000-8000-000000000106 cannot request off-rent for non-simulated RFQ 00000000-0000-4000-8000-000000000305',
  'a demo technical administrator cannot request off-rent in production scope'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_off_rent_request(
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000104',
    now(), now() + interval '1 hour', now() + interval '2 hours', NULL
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000000104 lacks customer off-rent authority for RFQ 00000000-0000-4000-8000-000000000305',
  'an unrelated customer cannot request off-rent'
);

SELECT lives_ok(
  $$ SELECT public.record_rental_off_rent_request(
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000101',
    now(), now() + interval '1 hour', now() + interval '2 hours', 'runtime authority test'
  ) $$,
  'the owning customer can submit the governed off-rent request'
);

SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000305'),
  'off_rent_requested',
  'the governed request atomically advances the RFQ to off_rent_requested'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_off_rent_acknowledgment(
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000101',
    now() + interval '1 hour', now() + interval '2 hours', NULL
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000000101 lacks accepted-vendor acknowledgment authority for RFQ 00000000-0000-4000-8000-000000000305',
  'the customer cannot exercise accepted-vendor acknowledgment authority'
);

SELECT lives_ok(
  $$ SELECT public.record_rental_off_rent_acknowledgment(
    '00000000-0000-4000-8000-000000000305',
    '00000000-0000-4000-8000-000000000102',
    now() + interval '1 hour', now() + interval '2 hours', 'runtime authority test'
  ) $$,
  'an active member of the accepted vendor can acknowledge pickup coordination'
);

SELECT is(
  (SELECT jsonb_build_object(
     'status', operational_status::text,
     'audit_count', (
       SELECT count(*)
       FROM public.audit_events
       WHERE related_rfq_id = '00000000-0000-4000-8000-000000000305'
     )
   )
   FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000305'),
  jsonb_build_object('status', 'demobilizing', 'audit_count', 4),
  'the vendor acknowledgment atomically advances demobilization with four request/transition audit events'
);

SELECT throws_ok(
  $$ SELECT public.publish_rental_stop_rule_version(
    '00000000-0000-4000-8000-000000000104', 'test.denied', 'Denied rule',
    'platform', NULL, NULL, 'request_received', 'exact_timestamp',
    'postgres.exact_timestamp', 1,
    '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
    '{}'::jsonb, 'accepted_contract', 'contract-1', repeat('a', 64), now(), NULL,
    false, 'denied-rule-0001', NULL
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000000104 lacks technical rental-stop rule publication authority',
  'an unrelated customer cannot publish a stop-rent rule'
);

SELECT throws_ok(
  $$ SELECT public.publish_rental_stop_rule_version(
    '00000000-0000-4000-8000-000000000103', 'test.platform', 'Platform rule',
    'platform', NULL, NULL, 'request_received', 'exact_timestamp',
    'postgres.exact_timestamp', 1,
    '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
    '{}'::jsonb, 'platform_policy', 'policy-1', repeat('b', 64), now(), NULL,
    false, 'platform-rule-0001', NULL
  ) $$,
  'P0001',
  'Platform stop-rent policy authority is UNKNOWN and fails closed',
  'undefined platform billing-policy authority fails closed'
);

SELECT throws_ok(
  $$ SELECT public.publish_rental_stop_rule_version(
    '00000000-0000-4000-8000-000000000106', 'test.demo-prod', 'Demo prod rule',
    'platform', NULL, NULL, 'request_received', 'exact_timestamp',
    'postgres.exact_timestamp', 1,
    '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
    '{}'::jsonb, 'accepted_contract', 'contract-demo', repeat('c', 64), now(), NULL,
    false, 'demo-prod-rule-0001', NULL
  ) $$,
  'P0001',
  'Demo actor 00000000-0000-4000-8000-000000000106 cannot publish a non-simulated rule',
  'demo operations authority cannot publish a production rule'
);

SELECT throws_ok(
  $$ SELECT public.publish_rental_stop_evaluator_version(
    '00000000-0000-4000-8000-000000000104',
    'test.backend.evaluator', repeat('1', 64), 'backend_artifact',
    'backend/rental-stop/test-evaluator', repeat('2', 64),
    ARRAY['request_received'], 'exact_timestamp', '{"fixture":"rolled back"}'::jsonb,
    'active', now(), NULL, false, 'denied-evaluator-0001', NULL
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000000104 lacks technical rental-stop evaluator publication authority',
  'an unrelated customer cannot publish an evaluator version'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'test_evaluator', public.publish_rental_stop_evaluator_version(
  '00000000-0000-4000-8000-000000000103',
  'test.backend.evaluator', repeat('1', 64), 'backend_artifact',
  'backend/rental-stop/test-evaluator', repeat('2', 64),
  ARRAY['request_received'], 'exact_timestamp', '{"fixture":"rolled back"}'::jsonb,
  'active', now(), NULL, false, 'test-evaluator-0001', NULL
);

SELECT is(
  (SELECT jsonb_build_object(
     'status', r.result->>'status',
     'source_kind', e.source_kind,
     'source_reference', e.source_reference,
     'source_sha256', e.source_sha256
   )
   FROM rental_clock_results AS r
   JOIN public.rental_stop_evaluator_versions AS e
     ON e.id = (r.result->>'evaluator_version_id')::uuid
   WHERE r.result_key = 'test_evaluator'),
  jsonb_build_object(
    'status', 'published',
    'source_kind', 'backend_artifact',
    'source_reference', 'backend/rental-stop/test-evaluator',
    'source_sha256', repeat('2', 64)
  ),
  'operations can publish an evaluator with immutable artifact and source provenance'
);

SELECT is(
  (public.publish_rental_stop_evaluator_version(
    '00000000-0000-4000-8000-000000000103',
    'test.backend.evaluator', repeat('1', 64), 'backend_artifact',
    'backend/rental-stop/test-evaluator', repeat('2', 64),
    ARRAY['request_received'], 'exact_timestamp', '{"fixture":"rolled back"}'::jsonb,
    'active', now(), NULL, false, 'test-evaluator-0001', NULL
  )->>'idempotent_replay')::boolean,
  true,
  'evaluator publication is idempotent'
);

SELECT throws_ok(
  $$ SELECT public.publish_rental_stop_evaluator_version(
    '00000000-0000-4000-8000-000000000103',
    'test.backend.evaluator', repeat('3', 64), 'backend_artifact',
    'backend/rental-stop/test-evaluator-v2', repeat('4', 64),
    ARRAY['request_received'], 'exact_timestamp', '{"fixture":"rolled back"}'::jsonb,
    'active', now(), NULL, false, 'test-evaluator-0002', NULL
  ) $$,
  'P0001',
  'Evaluator predecessor conflict for test.backend.evaluator',
  'a stale or gapped evaluator version fails closed on predecessor conflict'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'exact_rule', public.publish_rental_stop_rule_version(
  '00000000-0000-4000-8000-000000000103',
  'test.request-received.exact', 'Transaction-only exact timestamp rule',
  'organization_pair',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  'request_received', 'exact_timestamp', 'postgres.exact_timestamp', 1,
  '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
  '{"fixture":"rolled back"}'::jsonb, 'accepted_quote', 'quote-fixture',
  repeat('d', 64), now(), NULL, false, 'exact-rule-0001', NULL
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'exact_rule'),
  'published',
  'platform operations can publish an evidence-backed technical rule representation'
);

SELECT is(
  (public.publish_rental_stop_rule_version(
    '00000000-0000-4000-8000-000000000103',
    'test.request-received.exact', 'Transaction-only exact timestamp rule',
    'organization_pair',
    '00000000-0000-4000-8000-000000000201',
    '00000000-0000-4000-8000-000000000202',
    'request_received', 'exact_timestamp', 'postgres.exact_timestamp', 1,
    '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
    '{"fixture":"rolled back"}'::jsonb, 'accepted_quote', 'quote-fixture',
    repeat('d', 64), now(), NULL, false, 'exact-rule-0001', NULL
  )->>'idempotent_replay')::boolean,
  true,
  'rule publication is idempotent'
);

SELECT throws_ok(
  format(
    $$ SELECT public.publish_rental_stop_rule_version(
      '00000000-0000-4000-8000-000000000103',
      'test.request-received.exact', 'Conflicting version', 'organization_pair',
      '00000000-0000-4000-8000-000000000201',
      '00000000-0000-4000-8000-000000000202',
      'request_received', 'exact_timestamp', 'postgres.exact_timestamp', 1,
      '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
      '{}'::jsonb, 'change_order', 'change-1', repeat('e', 64), now(), NULL,
      false, 'exact-rule-0002', NULL
    ) $$
  ),
  'P0001',
  'Rule predecessor conflict for test.request-received.exact',
  'parallel or gapped rule publication fails on predecessor conflict'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'unknown_rule', public.publish_rental_stop_rule_version(
  '00000000-0000-4000-8000-000000000103',
  'test.unknown', 'Transaction-only unknown rule', 'organization_pair',
  '00000000-0000-4000-8000-000000000201',
  '00000000-0000-4000-8000-000000000202',
  'unknown', 'unknown', NULL, NULL, NULL, '{}'::jsonb,
  'accepted_contract', 'unknown-contract-fixture', repeat('f', 64),
  now(), NULL, false, 'unknown-rule-0001', NULL
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'unknown_rule'),
  'published',
  'an UNKNOWN representation may be recorded without becoming executable authority'
);

SELECT throws_ok(
  format(
    $$ SELECT public.accept_rental_stop_term_snapshot(
      '00000000-0000-4000-8000-000000000104',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000401', %L::uuid,
      'America/Chicago', 'USD', '{"fixture":"rolled back"}'::jsonb,
      repeat('1', 64), 'wrong-actor-terms-0001', NULL
    ) $$,
    (SELECT result->>'rule_version_id' FROM rental_clock_results WHERE result_key = 'exact_rule')
  ),
  'P0001',
  'Only the recorded quote accepter may bind the stop-rent term snapshot',
  'an actor other than the quote accepter cannot bind stop terms'
);

SELECT throws_ok(
  format(
    $$ SELECT public.accept_rental_stop_term_snapshot(
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000402', %L::uuid,
      'America/Chicago', 'USD', '{"fixture":"rolled back"}'::jsonb,
      repeat('2', 64), 'wrong-quote-terms-0001', NULL
    ) $$,
    (SELECT result->>'rule_version_id' FROM rental_clock_results WHERE result_key = 'exact_rule')
  ),
  'P0001',
  'Stop-term snapshot requires the accepted quote for RFQ 00000000-0000-4000-8000-000000000301',
  'term acceptance rejects an RFQ and quote relationship mismatch'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'exact_terms', public.accept_rental_stop_term_snapshot(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000401',
  (SELECT (result->>'rule_version_id')::uuid FROM rental_clock_results WHERE result_key = 'exact_rule'),
  'America/Chicago', 'USD', '{"fixture":"rolled back"}'::jsonb,
  repeat('3', 64), 'exact-terms-0001', NULL
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'exact_terms'),
  'accepted',
  'the recorded quote accepter can bind matching stop terms'
);

SELECT is(
  (public.accept_rental_stop_term_snapshot(
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000401',
    (SELECT (result->>'rule_version_id')::uuid FROM rental_clock_results WHERE result_key = 'exact_rule'),
    'America/Chicago', 'USD', '{"fixture":"rolled back"}'::jsonb,
    repeat('3', 64), 'exact-terms-0001', NULL
  )->>'idempotent_replay')::boolean,
  true,
  'term acceptance is idempotent'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'exact_terms_v2', public.accept_rental_stop_term_snapshot(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000401',
  (SELECT (result->>'rule_version_id')::uuid FROM rental_clock_results WHERE result_key = 'exact_rule'),
  'America/Chicago', 'USD', '{"fixture":"rolled back","revision":2}'::jsonb,
  repeat('8', 64), 'exact-terms-0002',
  (SELECT (result->>'term_snapshot_id')::uuid FROM rental_clock_results WHERE result_key = 'exact_terms')
);

SELECT is(
  (SELECT jsonb_build_object(
     'version', snapshot_version,
     'supersedes', supersedes_term_snapshot_id
   )
   FROM public.rental_stop_term_snapshots
   WHERE id = (SELECT (result->>'term_snapshot_id')::uuid
               FROM rental_clock_results WHERE result_key = 'exact_terms_v2')),
  (SELECT jsonb_build_object(
     'version', 2,
     'supersedes', (result->>'term_snapshot_id')::uuid
   )
   FROM rental_clock_results WHERE result_key = 'exact_terms'),
  'a term correction is append-only and explicitly supersedes version one'
);

SELECT throws_ok(
  format(
    $$ SELECT public.accept_rental_stop_term_snapshot(
      '00000000-0000-4000-8000-000000000101',
      '00000000-0000-4000-8000-000000000301',
      '00000000-0000-4000-8000-000000000401', %L::uuid,
      'America/Chicago', 'USD', '{"fixture":"stale"}'::jsonb,
      repeat('9', 64), 'exact-terms-stale-0003', NULL
    ) $$,
    (SELECT result->>'rule_version_id' FROM rental_clock_results WHERE result_key = 'exact_rule')
  ),
  'P0001',
  'Term snapshot predecessor conflict for RFQ 00000000-0000-4000-8000-000000000301',
  'a stale term correction fails closed instead of creating a parallel version'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'unknown_terms', public.accept_rental_stop_term_snapshot(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000403',
  (SELECT (result->>'rule_version_id')::uuid FROM rental_clock_results WHERE result_key = 'unknown_rule'),
  'America/Chicago', 'USD', '{"fixture":"rolled back"}'::jsonb,
  repeat('4', 64), 'unknown-terms-0001', NULL
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'unknown_terms'),
  'accepted',
  'UNKNOWN accepted terms remain representable and fail closed at determination'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_stop_readiness_declaration(
    '00000000-0000-4000-8000-000000000104',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000501', now(), 'yard',
    'confirmed', 'confirmed', 'confirmed', 'confirmed', '[]'::jsonb,
    '[]'::jsonb, 'ready', repeat('a', 64), 'wrong-readiness-0001', NULL
  ) $$,
  'P0001',
  'Only the recorded customer off-rent requester may declare readiness',
  'only the original customer requester may declare readiness'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'readiness', public.record_rental_stop_readiness_declaration(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000501', now(), 'yard',
  'confirmed', 'confirmed', 'confirmed', 'confirmed', '[]'::jsonb,
  '[{"ref":"photo-1"}]'::jsonb, 'ready', repeat('b', 64), 'readiness-0001', NULL
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'readiness'),
  'recorded',
  'the original requester can record versioned readiness evidence'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'readiness_v2', public.record_rental_stop_readiness_declaration(
  '00000000-0000-4000-8000-000000000101',
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000501', now(), 'yard',
  'confirmed', 'confirmed', 'confirmed', 'confirmed', '[]'::jsonb,
  '[{"ref":"photo-2"}]'::jsonb, 'corrected evidence', repeat('c', 64), 'readiness-0002',
  (SELECT (result->>'readiness_declaration_id')::uuid
   FROM rental_clock_results WHERE result_key = 'readiness')
);

SELECT is(
  (SELECT jsonb_build_object(
     'version', declaration_version,
     'supersedes', supersedes_readiness_declaration_id
   )
   FROM public.rental_stop_readiness_declarations
   WHERE id = (SELECT (result->>'readiness_declaration_id')::uuid
               FROM rental_clock_results WHERE result_key = 'readiness_v2')),
  (SELECT jsonb_build_object(
     'version', 2,
     'supersedes', (result->>'readiness_declaration_id')::uuid
   )
   FROM rental_clock_results WHERE result_key = 'readiness'),
  'a readiness correction is append-only and explicitly supersedes version one'
);

SELECT throws_ok(
  $$ SELECT public.record_rental_stop_readiness_declaration(
    '00000000-0000-4000-8000-000000000101',
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000501', now(), 'yard',
    'confirmed', 'confirmed', 'confirmed', 'confirmed', '[]'::jsonb,
    '[]'::jsonb, 'stale readiness', repeat('d', 64), 'readiness-stale-0003', NULL
  ) $$,
  'P0001',
  'Readiness predecessor conflict for off-rent request 00000000-0000-4000-8000-000000000501',
  'a stale readiness correction fails closed instead of creating a parallel version'
);

SELECT throws_ok(
  $$ SELECT public.determine_rental_stop_and_transition(
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000105', 'demo-determine-0001'
  ) $$,
  'P0001',
  'Demo actor 00000000-0000-4000-8000-000000000105 cannot initiate determination for non-simulated RFQ 00000000-0000-4000-8000-000000000301',
  'demo actors cannot initiate production determinations'
);

SELECT throws_ok(
  $$ SELECT public.determine_rental_stop_and_transition(
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000104', 'outsider-determine-0001'
  ) $$,
  'P0001',
  'Actor 00000000-0000-4000-8000-000000000104 lacks an authorized relationship to initiate stop-rent determination for RFQ 00000000-0000-4000-8000-000000000301',
  'unrelated actors cannot initiate a determination through service transport'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'missing_terms', public.determine_rental_stop_and_transition(
  '00000000-0000-4000-8000-000000000302',
  '00000000-0000-4000-8000-000000000101', 'missing-terms-0001'
);

SELECT is(
  (SELECT result->>'blocker_code' FROM rental_clock_results WHERE result_key = 'missing_terms'),
  'ACCEPTED_TERM_SNAPSHOT_MISSING',
  'determination fails closed when accepted terms are missing'
);

SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000302'),
  'demobilizing',
  'a missing-term blocker leaves the lifecycle unchanged'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'unknown', public.determine_rental_stop_and_transition(
  '00000000-0000-4000-8000-000000000303',
  '00000000-0000-4000-8000-000000000101', 'unknown-determine-0001'
);

SELECT is(
  (SELECT result->>'blocker_code' FROM rental_clock_results WHERE result_key = 'unknown'),
  'STOP_RULE_UNKNOWN',
  'UNKNOWN contractual terms block determination'
);

SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000303'),
  'demobilizing',
  'UNKNOWN rules do not advance the lifecycle'
);

SELECT throws_ok(
  $$ UPDATE public.rental_requests
     SET operational_status = 'off_rent', off_rent_at = now()
     WHERE id = '00000000-0000-4000-8000-000000000304' $$,
  'P0001',
  'demobilizing -> off_rent requires the governed rental-stop command',
  'direct demobilizing to off-rent updates are rejected'
);

INSERT INTO rental_clock_results (result_key, result)
SELECT 'complete', public.determine_rental_stop_and_transition(
  '00000000-0000-4000-8000-000000000301',
  '00000000-0000-4000-8000-000000000101', 'complete-determine-0001'
);

SELECT is(
  (SELECT result->>'status' FROM rental_clock_results WHERE result_key = 'complete'),
  'complete',
  'accepted evidence-backed terms permit a system-owned determination'
);

SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000301'),
  'off_rent',
  'the governed command advances demobilizing to off-rent'
);

SELECT is(
  (SELECT off_rent_at FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000000301'),
  (SELECT requested_at FROM public.rental_off_rent_requests
   WHERE id = '00000000-0000-4000-8000-000000000501'),
  'off_rent_at equals the evidence timestamp selected by the accepted rule'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_stop_determinations
   WHERE rfq_id = '00000000-0000-4000-8000-000000000301'),
  1,
  'the successful command records exactly one immutable determination'
);

SELECT is(
  (public.determine_rental_stop_and_transition(
    '00000000-0000-4000-8000-000000000301',
    '00000000-0000-4000-8000-000000000101', 'complete-determine-0001'
  )->>'idempotent_replay')::boolean,
  true,
  'determination replay returns the prior result without a second transition'
);

SELECT is(
  (SELECT initiated_by FROM public.rental_stop_evaluation_attempts
   WHERE rfq_id = '00000000-0000-4000-8000-000000000301'),
  '00000000-0000-4000-8000-000000000101'::uuid,
  'the initiating actor is preserved without making the actor the determiner'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rfq_operational_status
   WHERE rfq_id = '00000000-0000-4000-8000-000000000301'
     AND previous_status = 'demobilizing' AND new_status = 'off_rent'),
  1,
  'the successful command writes one atomic lifecycle ledger transition'
);

SELECT is(
  (SELECT determination.correlation_id
   FROM public.rental_stop_determinations AS determination
   WHERE determination.rfq_id = '00000000-0000-4000-8000-000000000301'),
  (SELECT audit.correlation_id
   FROM public.rental_stop_determinations AS determination
   JOIN public.audit_events AS audit ON audit.id = determination.audit_event_id
   WHERE determination.rfq_id = '00000000-0000-4000-8000-000000000301'),
  'determination and audit records share the command correlation identifier'
);

SELECT throws_ok(
  format(
    'UPDATE public.rental_stop_rule_versions SET display_name = %L WHERE id = %L::uuid',
    'mutated',
    (SELECT result->>'rule_version_id' FROM rental_clock_results WHERE result_key = 'exact_rule')
  ),
  'P0001',
  'rental_stop_rule_versions rows are immutable; create a new version or superseding determination',
  'published rules are immutable'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'idx_stop_evaluator_versions_predecessor'),
  'evaluator predecessor foreign keys have an index'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'idx_stop_attempts_initiated_by'),
  'evaluation initiating-actor foreign keys have an index'
);

SELECT ok(
  EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
    AND indexname = 'idx_stop_rule_versions_evaluator'
    AND indexdef LIKE '%(evaluator_key, evaluator_version, evaluator_sha256)%'),
  'rule evaluator provenance foreign keys have a complete ordered index'
);

SELECT ok(
  EXISTS (SELECT 1 FROM public.audit_events AS audit
    JOIN public.rental_stop_evaluation_attempts AS attempt
      ON attempt.audit_event_id = audit.id
    WHERE attempt.rfq_id = '00000000-0000-4000-8000-000000000302'
      AND attempt.outcome = 'blocked'
      AND audit.event_type = 'stoprent.determination_blocked'),
  'blocked determinations are atomically audited'
);

SELECT * FROM finish();

ROLLBACK;
