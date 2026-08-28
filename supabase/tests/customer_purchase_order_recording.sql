BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(29);

SELECT has_table(
  'public',
  'rental_customer_purchase_order_records',
  'customer purchase-order assertion table exists'
);
SELECT ok(
  (SELECT relrowsecurity FROM pg_catalog.pg_class
   WHERE oid = 'public.rental_customer_purchase_order_records'::regclass),
  'customer purchase-order table has RLS enabled'
);
SELECT ok(
  has_table_privilege('service_role', 'public.rental_customer_purchase_order_records', 'SELECT'),
  'service role can assemble the sanitized projection'
);
SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_customer_purchase_order_records', 'SELECT'),
  'authenticated clients cannot read the private assertion row directly'
);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_customer_purchase_order_records', privilege_name),
  format('service role lacks direct %s on the assertion table', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_table_privilege('authenticated', 'public.rental_customer_purchase_order_records', privilege_name),
  format('authenticated lacks direct %s on the assertion table', privilege_name)
)
FROM unnest(ARRAY['INSERT', 'UPDATE', 'DELETE']) AS privileges(privilege_name);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.record_rental_customer_purchase_order(uuid,uuid,text,date,text)',
    'EXECUTE'
  ),
  'authenticated clients cannot bypass the Edge authority boundary'
);
SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_customer_purchase_order(uuid,uuid,text,date,text)',
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
      AND proc.proname = 'record_rental_customer_purchase_order'
      AND proc.prosecdef
      AND proc.proconfig = ARRAY['search_path=""']
  ),
  'canonical command is SECURITY DEFINER with an empty search path'
);
SELECT ok(
  EXISTS (
    SELECT 1 FROM pg_catalog.pg_trigger
    WHERE tgrelid = 'public.rental_customer_purchase_order_records'::regclass
      AND tgname = 'rental_customer_purchase_order_records_immutable'
      AND NOT tgisinternal
  ),
  'customer purchase-order assertions are immutable'
);

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) VALUES
  ('00000000-0000-4000-8000-000000009101', 'authenticated', 'authenticated',
   'po-customer@example.test', '{}'::jsonb,
   '{"full_name":"PO Customer","role":"customer"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009102', 'authenticated', 'authenticated',
   'po-vendor@example.test', '{}'::jsonb,
   '{"full_name":"PO Vendor","role":"vendor"}'::jsonb, now(), now()),
  ('00000000-0000-4000-8000-000000009103', 'authenticated', 'authenticated',
   'po-outsider@example.test', '{}'::jsonb,
   '{"full_name":"PO Outsider","role":"customer"}'::jsonb, now(), now());

INSERT INTO public.organizations (
  id, name, org_type, slug, verified, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000009201', 'PO Customer', 'customer',
   'po-customer-test', true, false),
  ('00000000-0000-4000-8000-000000009202', 'PO Vendor', 'vendor',
   'po-vendor-test', true, false);

INSERT INTO public.organization_memberships (
  organization_id, user_id, role, is_simulated
) VALUES
  ('00000000-0000-4000-8000-000000009201',
   '00000000-0000-4000-8000-000000009101', 'owner', false),
  ('00000000-0000-4000-8000-000000009202',
   '00000000-0000-4000-8000-000000009102', 'owner', false);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000009301',
  '00000000-0000-4000-8000-000000009101',
  '00000000-0000-4000-8000-000000009201',
  'vendor_quote_received', false, now(), now()
);

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, version, status,
  daily_rate, delivery_fee, mobilization_fee, minimum_rental_days,
  available_start_date, equipment_substitution, compliance_confirmed,
  submitted_at, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000009401',
  '00000000-0000-4000-8000-000000009301',
  '00000000-0000-4000-8000-000000009202',
  '00000000-0000-4000-8000-000000009102',
  1, 'submitted', 300, 100, 50, 7,
  current_date + 1, false, true, now(), false
);

SELECT lives_ok(
  $$SELECT public.transition_rfq_status(
    '00000000-0000-4000-8000-000000009301',
    'quote_accepted'::public.app_rfq_status,
    '00000000-0000-4000-8000-000000009101',
    'customer',
    'Accepted governed quote for PO test',
    'customer_action',
    false,
    '00000000-0000-4000-8000-000000009401'
  )$$,
  'canonical quote acceptance creates the Rental Order prerequisite'
);

SELECT lives_ok(
  $$SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009101',
    ' PO-2026-1042 ',
    current_date,
    'po-record-2026-1042'
  )$$,
  'authorized customer member records the external PO assertion'
);
SELECT is(
  (SELECT count(*)::integer FROM public.rental_customer_purchase_order_records
   WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
  1,
  'exactly one RFQ-wide PO assertion exists'
);
SELECT is(
  (SELECT external_reference FROM public.rental_customer_purchase_order_records
   WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
  'PO-2026-1042'::text,
  'external reference is normalized before storage'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009301'
     AND event_type = 'purchase_order.customer_recorded'),
  1,
  'customer PO assertion has one atomic audit event'
);
SELECT ok(
  (SELECT metadata @> '{"platform_issued":false,"release_authority":false,"billing_authority":false,"amendment_authority":false,"granular_scope_authority":false}'::jsonb
   FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009301'
     AND event_type = 'purchase_order.customer_recorded'),
  'audit event explicitly denies downstream authority'
);
SELECT is(
  (SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009101',
    'PO-2026-1042',
    current_date,
    'po-record-2026-1042'
  ) ->> 'idempotent_replay')::boolean,
  true,
  'exact replay is idempotent'
);
SELECT is(
  (SELECT count(*)::integer FROM public.audit_events
   WHERE related_rfq_id = '00000000-0000-4000-8000-000000009301'
     AND event_type = 'purchase_order.customer_recorded'),
  1,
  'idempotent replay does not duplicate audit history'
);

SELECT throws_ok(
  $$SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009101',
    'PO-CHANGED', current_date, 'po-record-changed'
  )$$,
  'P0001',
  'Customer purchase order is already recorded; amendment authority is not implemented',
  'conflicting amendment is blocked'
);
SELECT throws_matching(
  $$SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009102',
    'PO-VENDOR', current_date, 'po-vendor-attempt'
  )$$,
  '^Actor 00000000-0000-4000-8000-000000009102 lacks customer purchase-order authority for Rental Order [0-9a-f-]+$',
  'vendor cannot record the customer-owned PO assertion'
);
SELECT throws_matching(
  $$SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009103',
    'PO-OUTSIDER', current_date, 'po-outsider-attempt'
  )$$,
  '^Actor 00000000-0000-4000-8000-000000009103 lacks customer purchase-order authority for Rental Order [0-9a-f-]+$',
  'unrelated actor cannot record the customer-owned PO assertion'
);
SELECT throws_ok(
  $$SELECT public.record_rental_customer_purchase_order(
    (SELECT id FROM public.rental_orders
     WHERE rfq_id = '00000000-0000-4000-8000-000000009301'),
    '00000000-0000-4000-8000-000000009101',
    'PO-FUTURE', current_date + 1, 'po-future-attempt'
  )$$,
  'P0001',
  'Customer-stated purchase-order issue date is required and cannot be future-dated',
  'future-dated customer assertion is rejected'
);
SELECT throws_ok(
  $$UPDATE public.rental_customer_purchase_order_records
    SET external_reference = 'PO-TAMPERED'
    WHERE rfq_id = '00000000-0000-4000-8000-000000009301'$$,
  'P0001',
  'rental_customer_purchase_order_records rows are immutable; governed PO amendment authority is not implemented',
  'recorded PO assertion cannot be rewritten'
);
SELECT throws_ok(
  $$DELETE FROM public.rental_customer_purchase_order_records
    WHERE rfq_id = '00000000-0000-4000-8000-000000009301'$$,
  'P0001',
  'rental_customer_purchase_order_records rows are immutable; governed PO amendment authority is not implemented',
  'recorded PO assertion cannot be deleted'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'rental_customer_purchase_order_records'
      AND column_name IN (
        'amount', 'currency', 'approved_at', 'released_at', 'billable_at',
        'line_id', 'quantity', 'document_url'
      )
  ),
  'slice creates no financial, release, granular, or document authority columns'
);

SELECT * FROM finish();
ROLLBACK;
