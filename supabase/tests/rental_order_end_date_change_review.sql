BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(34);

SELECT has_table(
  'public',
  'rental_order_change_review_requests',
  'Rental Order change-review request table exists'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_order_change_review_requests'::regclass),
  'change-review requests have RLS enabled'
);
SELECT ok(
  has_table_privilege('service_role', 'public.rental_order_change_review_requests', 'SELECT'),
  'service role can assemble sanitized projections'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_order_change_review_requests', 'SELECT'),
  'authenticated clients cannot read private request rows directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_order_change_review_requests', privilege_name),
  format('service role lacks direct %s on change-review requests', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_order_change_review_requests', privilege_name),
  format('authenticated lacks direct %s on change-review requests', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.request_rental_order_end_date_change_review(uuid,uuid,text,date,text,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass Edge authorization'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.request_rental_order_end_date_change_review(uuid,uuid,text,date,text,text)',
    'EXECUTE'
  ),
  'service role may invoke the canonical command after Edge authorization'
);
SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname = 'request_rental_order_end_date_change_review'
      AND proc.prosecdef
      AND proc.proconfig = ARRAY['search_path=""']
  ),
  'canonical command is SECURITY DEFINER with an empty search path'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.rental_order_change_review_requests'::regclass
      AND tgname = 'rental_order_change_review_requests_immutable'
      AND NOT tgisinternal
  ),
  'change-review requests are immutable'
);

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000009501', 'authenticated', 'authenticated',
   'change-customer@example.test', '{}'::jsonb,
   '{"full_name":"Change Customer","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009502', 'authenticated', 'authenticated',
   'change-vendor@example.test', '{}'::jsonb,
   '{"full_name":"Change Vendor","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009503', 'authenticated', 'authenticated',
   'change-outsider@example.test', '{}'::jsonb,
   '{"full_name":"Change Outsider","role":"customer"}'::jsonb, now(), now());

INSERT INTO public.organizations (
  id, name, org_type, slug, verified, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000009601', 'Change Customer', 'customer',
   'change-customer-test', true, false),
  ('00000000-0000-4000-8000-000000009602', 'Change Vendor', 'vendor',
   'change-vendor-test', true, false);

INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000009601',
   '00000000-0000-4000-8000-000000009501', 'owner', false),
  ('00000000-0000-4000-8000-000000009602',
   '00000000-0000-4000-8000-000000009502', 'owner', false);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000009701',
  '00000000-0000-4000-8000-000000009501',
  '00000000-0000-4000-8000-000000009601',
  'vendor_quote_received', false, now(), now()
);

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, version, status,
  daily_rate, delivery_fee, mobilization_fee, minimum_rental_days,
  available_start_date, equipment_substitution, compliance_confirmed,
  submitted_at, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000009801',
  '00000000-0000-4000-8000-000000009701',
  '00000000-0000-4000-8000-000000009602',
  '00000000-0000-4000-8000-000000009502',
  1, 'submitted', 300, 100, 50, 7,
  current_date + 1, false, true, now(), false
);

SELECT lives_ok(
  $$SELECT public.transition_rfq_status(
    '00000000-0000-4000-8000-000000009701',
    'quote_accepted'::public.app_rfq_status,
    '00000000-0000-4000-8000-000000009501',
    'customer',
    'Accepted governed quote for change-review test',
    'customer_action',
    false,
    '00000000-0000-4000-8000-000000009801'
  )$$,
  'canonical quote acceptance creates the Rental Order prerequisite'
);

SELECT lives_ok(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009501',
    'customer', current_date + 30,
    'Customer requests a later end-date review',
    'change-customer-2026-01'
  )$$,
  'authorized customer member appends a change-review request'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_order_change_review_requests
   WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
  1,
  'exactly one change-review request exists after customer intake'
);
SELECT is(
  (SELECT requester_party FROM public.rental_order_change_review_requests
   WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
  'customer'::text,
  'customer requester party is recorded'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009701'
     AND event_type = 'rental_order.change_review_requested'),
  1,
  'customer request has one atomic audit event'
);
SELECT ok(
  (SELECT metadata @> '{"base_end_date_state":"unknown","change_order_authority":false,"version_activation_authority":false,"lifecycle_transition_authority":false,"billing_authority":false,"custody_authority":false,"granular_scope_authority":false}'::jsonb
   FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009701'
     AND event_type = 'rental_order.change_review_requested'),
  'audit event records UNKNOWN base and explicitly denies downstream authority'
);
SELECT is(
  (SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009501',
    'customer', current_date + 30,
    'Customer requests a later end-date review',
    'change-customer-2026-01'
  ) ->> 'idempotent_replay')::boolean,
  true,
  'exact customer replay is idempotent'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009701'
     AND event_type = 'rental_order.change_review_requested'),
  1,
  'idempotent replay does not duplicate audit history'
);

SELECT lives_ok(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009502',
    'vendor', current_date + 21,
    'Accepted vendor requests an earlier end-date review',
    'change-vendor-2026-01'
  )$$,
  'accepted vendor organization member may append review information'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_order_change_review_requests
   WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
  2,
  'customer and vendor requests remain separate immutable facts'
);
SELECT is(
  (SELECT requester_party FROM public.rental_order_change_review_requests
   WHERE idempotency_key = 'change-vendor-2026-01'),
  'vendor'::text,
  'vendor requester party is recorded'
);

SELECT throws_matching(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009503',
    'customer', current_date + 10,
    'Outsider should not be able to request review',
    'change-outsider-2026-01'
  )$$,
  '^Actor 00000000-0000-4000-8000-000000009503 lacks customer change-review authority for Rental Order [0-9a-f-]+$',
  'unrelated actor cannot append a request'
);
SELECT throws_matching(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009501',
    'vendor', current_date + 10,
    'Customer cannot assert the vendor requester party',
    'change-wrong-party-2026-01'
  )$$,
  '^Actor 00000000-0000-4000-8000-000000009501 lacks vendor change-review authority for Rental Order [0-9a-f-]+$',
  'customer cannot claim the vendor requester party'
);
SELECT throws_ok(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009501',
    'customer', current_date,
    'Invalid present date is rejected',
    'change-invalid-date-01'
  )$$,
  'P0001',
  'Proposed end date must be a future date',
  'non-future proposed date is rejected'
);
SELECT throws_ok(
  $$SELECT public.request_rental_order_end_date_change_review(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
    '00000000-0000-4000-8000-000000009501',
    'customer', current_date + 31,
    'Conflicting replay must be blocked',
    'change-customer-2026-01'
  )$$,
  'P0001',
  'Change-review idempotency key conflicts with an existing request',
  'conflicting idempotency replay is blocked'
);
SELECT throws_ok(
  $$UPDATE public.rental_order_change_review_requests
    SET request_reason = 'Tampered request reason'
    WHERE idempotency_key = 'change-customer-2026-01'$$,
  'P0001',
  'rental_order_change_review_requests rows are immutable; append a separately authorized review event',
  'request cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.rental_order_change_review_requests
    WHERE idempotency_key = 'change-customer-2026-01'$$,
  'P0001',
  'rental_order_change_review_requests rows are immutable; append a separately authorized review event',
  'request cannot be deleted'
);
SELECT is(
  (SELECT operational_status::text FROM public.rental_requests
   WHERE id = '00000000-0000-4000-8000-000000009701'),
  'quote_accepted'::text,
  'change-review intake does not mutate RFQ lifecycle state'
);
SELECT is(
  (SELECT current_version_number FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000009701'),
  1,
  'change-review intake does not activate a Rental Order version'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rental_order_change_review_requests'
      AND column_name IN (
        'approved_at', 'accepted_at', 'rejected_at', 'effective_at',
        'billing_effective_at', 'custody_transferred_at', 'line_id', 'quantity'
      )
  ),
  'slice creates no decision, billing, custody, or granular authority columns'
);

SELECT * FROM finish();
ROLLBACK;
