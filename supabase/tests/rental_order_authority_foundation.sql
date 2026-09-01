BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(64);

SELECT has_table('public', 'rental_orders', 'Rental Order identity table exists');
SELECT has_table('public', 'rental_order_versions', 'Rental Order version table exists');
SELECT has_table('public', 'vendor_quote_rate_terms', 'governed quote rate terms exist');
SELECT has_table('public', 'vendor_quote_charge_lines', 'governed quote charge lines exist');

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

INSERT INTO public.audit_events (
  id, correlation_id, entity_type, entity_id, event_type, event_category,
  actor_id, actor_role, actor_type, source, is_simulated, related_rfq_id,
  related_vendor_organization_id
) VALUES (
  '00000000-0000-4000-8000-000000008501',
  '00000000-0000-4000-8000-000000008502',
  'vendor_quote_response', '00000000-0000-4000-8000-000000008401',
  'vendor_quote.submitted', 'rfq',
  '00000000-0000-4000-8000-000000008102', 'owner', 'user',
  'vendor_action', false, '00000000-0000-4000-8000-000000008301',
  '00000000-0000-4000-8000-000000008202'
);

INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, version, status,
  daily_rate, delivery_fee, mobilization_fee, minimum_rental_days,
  available_start_date, equipment_substitution, compliance_confirmed,
  submitted_at, is_simulated, monetary_contract_version, currency_code,
  pricing_state, total_calculation_method, calculation_policy_version,
  tax_status, tax_exemption_claimed, tax_determination_status,
  calculated_total, pricing_payload, idempotency_key,
  submission_correlation_id, submission_audit_event_id
) VALUES (
  '00000000-0000-4000-8000-000000008401',
  '00000000-0000-4000-8000-000000008301',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008102',
  2, 'submitted', 275.50, 150, 85, 7,
  current_date + 1, false, true, now(), false,
  'usd-v1', 'USD', 'acceptance_ready', 'deterministic', 'allrentz-usd-1',
  'not_calculated', false, 'not_determined', 4277.00,
  '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_day","equipment_quantity":"2","rental_period_quantity":"7","period_quantity_source":"vendor_stated","unit_rate":"288.7143","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[{"line_key":"delivery","charge_type":"delivery","description":"Delivery fee","amount_status":"priced","calculation_method":"fixed","amount":"150.00"},{"line_key":"mobilization","charge_type":"mobilization","description":"Mobilization fee","amount_status":"priced","calculation_method":"fixed","amount":"85.00"}]}'::jsonb,
  '00000000-0000-4000-8000-000000008503',
  '00000000-0000-4000-8000-000000008502',
  '00000000-0000-4000-8000-000000008501'
);

INSERT INTO public.vendor_quote_rate_terms (
  quote_id, line_key, rate_basis, equipment_quantity, rental_period_quantity,
  period_quantity_source,
  unit_rate, amount_status, calculation_method, line_amount
) VALUES (
  '00000000-0000-4000-8000-000000008401', 'equipment_rental', 'per_day',
  2, 7, 'vendor_stated', 288.7143, 'priced', 'deterministic', 4042.00
);

INSERT INTO public.vendor_quote_charge_lines (
  quote_id, line_key, charge_type, description, amount_status,
  calculation_method, amount
) VALUES
  ('00000000-0000-4000-8000-000000008401', 'delivery', 'delivery',
   'Delivery fee', 'priced', 'fixed', 150.00),
  ('00000000-0000-4000-8000-000000008401', 'mobilization', 'mobilization',
   'Mobilization fee', 'priced', 'fixed', 85.00);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008101',
  '00000000-0000-4000-8000-000000008201',
  'pending_vendor_review', false, now(), now()
);
INSERT INTO public.rfq_vendor_invitations (
  rfq_id, vendor_organization_id, invited_by, invitation_status, is_simulated
) VALUES (
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008101', 'invited', false
);

CREATE TEMP TABLE quote_command_results (
  attempt integer NOT NULL,
  quote_id uuid NOT NULL,
  quote_version integer NOT NULL,
  pricing_state text NOT NULL,
  currency_code text NOT NULL,
  correlation_id uuid NOT NULL,
  replayed boolean NOT NULL
);
GRANT INSERT, SELECT ON TABLE quote_command_results TO authenticated;

SELECT set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000008102', true);
SET LOCAL ROLE authenticated;
INSERT INTO quote_command_results
SELECT 1, outcome.*
FROM public.submit_vendor_quote(
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008504',
  '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_hour","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"vendor_stated","minimum_billable_quantity":"2","unit_rate":"1.0050","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
) AS outcome;
INSERT INTO quote_command_results
SELECT 2, outcome.*
FROM public.submit_vendor_quote(
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008504',
  '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_hour","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"vendor_stated","minimum_billable_quantity":"2","unit_rate":"1.0050","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
) AS outcome;
RESET ROLE;

SELECT is(
  (SELECT count(*)::integer FROM public.vendor_quote_responses
   WHERE rfq_id = '00000000-0000-4000-8000-000000008302'),
  1,
  'exact idempotency replay creates one immutable quote revision'
);
SELECT is(
  (SELECT line_amount FROM public.vendor_quote_rate_terms AS term
   JOIN public.vendor_quote_responses AS quote ON quote.id = term.quote_id
   WHERE quote.rfq_id = '00000000-0000-4000-8000-000000008302'),
  2.01::numeric,
  'minimum usage is applied before midpoint-away-from-zero line rounding'
);
SELECT is(
  (SELECT replayed FROM quote_command_results WHERE attempt = 1),
  false,
  'first command outcome is not a replay'
);
SELECT is(
  (SELECT replayed FROM quote_command_results WHERE attempt = 2),
  true,
  'matching command intent replays the original outcome'
);
SELECT is(
  (SELECT count(DISTINCT correlation_id)::integer FROM quote_command_results),
  1,
  'matching replay returns the original correlation identity'
);
SELECT throws_ok(
  $$SELECT * FROM public.submit_vendor_quote(
    '00000000-0000-4000-8000-000000008302',
    '00000000-0000-4000-8000-000000008202',
    '00000000-0000-4000-8000-000000008504',
    '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_hour","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"vendor_stated","unit_rate":"2.0000","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
  )$$,
  '23505',
  'idempotency_key was already used for a different pricing payload',
  'an idempotency key cannot be reused for changed commercial terms'
);
SELECT throws_ok(
  $$SELECT * FROM public.submit_vendor_quote(
    '00000000-0000-4000-8000-000000008302',
    '00000000-0000-4000-8000-000000008202',
    '00000000-0000-4000-8000-000000008508',
    '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_day","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"contract_schedule","unit_rate":"2.0000","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
  )$$,
  '22023',
  'invalid rate term contract',
  'quote callers cannot claim a server-derived contract-schedule quantity'
);
SELECT throws_ok(
  $$SELECT * FROM public.submit_vendor_quote(
    '00000000-0000-4000-8000-000000008302',
    '00000000-0000-4000-8000-000000008202',
    '00000000-0000-4000-8000-000000008509',
    '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"flat_rental_term","equipment_quantity":"1","rental_period_quantity":"2","period_quantity_source":"vendor_stated","unit_rate":"2.0000","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
  )$$,
  '22023',
  'flat-rental-term rates require rental_period_quantity=1',
  'flat-term rates cannot multiply an ambiguous time quantity'
);

UPDATE public.rental_requests
SET operational_status = 'quote_accepted'
WHERE id = '00000000-0000-4000-8000-000000008302';
SET LOCAL ROLE authenticated;
INSERT INTO quote_command_results
SELECT 3, outcome.*
FROM public.submit_vendor_quote(
  '00000000-0000-4000-8000-000000008302',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008504',
  '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_hour","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"vendor_stated","minimum_billable_quantity":"2","unit_rate":"1.0050","amount_status":"priced","calculation_method":"deterministic"}],"charge_lines":[]}'::jsonb
) AS outcome;
RESET ROLE;
SELECT is(
  (SELECT replayed FROM quote_command_results WHERE attempt = 3),
  true,
  'exact-key replay remains available after the RFQ lifecycle advances'
);

INSERT INTO public.rental_requests (
  id, customer_id, customer_organization_id, operational_status,
  is_simulated, created_at, updated_at
) VALUES (
  '00000000-0000-4000-8000-000000008303',
  '00000000-0000-4000-8000-000000008101',
  '00000000-0000-4000-8000-000000008201',
  'vendor_quote_received', false, now(), now()
);
INSERT INTO public.audit_events (
  id, correlation_id, entity_type, entity_id, event_type, event_category,
  actor_id, actor_role, actor_type, source, is_simulated, related_rfq_id,
  related_vendor_organization_id
) VALUES (
  '00000000-0000-4000-8000-000000008505',
  '00000000-0000-4000-8000-000000008506',
  'vendor_quote_response', '00000000-0000-4000-8000-000000008403',
  'vendor_quote.submitted', 'rfq',
  '00000000-0000-4000-8000-000000008102', 'owner', 'user',
  'vendor_action', false, '00000000-0000-4000-8000-000000008303',
  '00000000-0000-4000-8000-000000008202'
);
INSERT INTO public.vendor_quote_responses (
  id, rfq_id, vendor_organization_id, submitted_by, version, status,
  equipment_substitution, compliance_confirmed, submitted_at, is_simulated,
  monetary_contract_version, currency_code, pricing_state,
  total_calculation_method, calculation_policy_version, tax_status,
  tax_exemption_claimed, tax_determination_status,
  pricing_payload, idempotency_key, submission_correlation_id,
  submission_audit_event_id
) VALUES (
  '00000000-0000-4000-8000-000000008403',
  '00000000-0000-4000-8000-000000008303',
  '00000000-0000-4000-8000-000000008202',
  '00000000-0000-4000-8000-000000008102',
  1, 'submitted', false, true, now(), false,
  'usd-v1', 'USD', 'incomplete', 'incomplete', 'allrentz-usd-1',
  'not_calculated', false, 'not_determined',
  '{"schema_version":1,"currency_code":"USD","calculation_policy_version":"allrentz-usd-1","tax_status":"not_calculated","tax_exemption_claimed":false,"rate_terms":[{"line_key":"equipment_rental","rate_basis":"per_day","equipment_quantity":"1","rental_period_quantity":"1","period_quantity_source":"vendor_stated","amount_status":"tbd","calculation_method":"incomplete"}],"charge_lines":[]}'::jsonb,
  '00000000-0000-4000-8000-000000008507',
  '00000000-0000-4000-8000-000000008506',
  '00000000-0000-4000-8000-000000008505'
);
INSERT INTO public.vendor_quote_rate_terms (
  quote_id, line_key, rate_basis, equipment_quantity, rental_period_quantity,
  period_quantity_source,
  amount_status, calculation_method
) VALUES (
  '00000000-0000-4000-8000-000000008403', 'equipment_rental', 'per_day',
  1, 1, 'vendor_stated', 'tbd', 'incomplete'
);
SELECT throws_ok(
  $$UPDATE public.vendor_quote_responses
    SET status = 'accepted', accepted_by = '00000000-0000-4000-8000-000000008101',
        accepted_at = now()
    WHERE id = '00000000-0000-4000-8000-000000008403'$$,
  '22023',
  'Quote is not complete under monetary contract usd-v1',
  'a quote with required TBD money cannot be accepted'
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
  (SELECT version.snapshot_payload #>> '{accepted_quote,currency_code}'
   FROM public.rental_order_versions AS version
   JOIN public.rental_orders AS rental_order ON rental_order.id = version.rental_order_id
   WHERE rental_order.rfq_id = '00000000-0000-4000-8000-000000008301'),
  'USD'::text,
  'version 1 preserves explicit currency identity'
);
SELECT is(
  (SELECT (version.snapshot_payload #>> '{accepted_quote,rate_terms,0,line_amount}')::numeric
   FROM public.rental_order_versions AS version
   JOIN public.rental_orders AS rental_order ON rental_order.id = version.rental_order_id
   WHERE rental_order.rfq_id = '00000000-0000-4000-8000-000000008301'),
  4042.00::numeric,
  'version 1 preserves the server-rounded exact rate line amount'
);
SELECT is(
  (SELECT currency_code FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  'USD'::text,
  'Rental Order stores explicit USD identity'
);
SELECT is(
  (SELECT calculation_policy_version FROM public.rental_orders
   WHERE rfq_id = '00000000-0000-4000-8000-000000008301'),
  'allrentz-usd-1'::text,
  'Rental Order binds the calculation policy version'
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
SELECT is(
  (SELECT rental_order.correlation_id
   FROM public.rental_orders AS rental_order
   WHERE rental_order.rfq_id = '00000000-0000-4000-8000-000000008301'),
  (SELECT status.correlation_id
   FROM public.rfq_operational_status AS status
   WHERE status.rfq_id = '00000000-0000-4000-8000-000000008301'
     AND status.new_status = 'quote_accepted'
   ORDER BY status.created_at DESC, status.id DESC
   LIMIT 1),
  'quote acceptance and Rental Order creation share one canonical correlation'
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

SELECT throws_ok(
  $$UPDATE public.vendor_quote_rate_terms
    SET unit_rate = 1
    WHERE quote_id = '00000000-0000-4000-8000-000000008401'$$,
  'P0001',
  'vendor_quote_rate_terms rows are immutable; submit a new quote revision instead',
  'submitted rate terms cannot be rewritten'
);
SELECT throws_ok(
  $$UPDATE public.vendor_quote_responses
    SET pricing_payload = '{}'::jsonb
    WHERE id = '00000000-0000-4000-8000-000000008401'$$,
  '55000',
  'Submitted quote commercial terms are immutable; submit a new revision',
  'submitted quote commercial payload cannot be rewritten'
);
SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname = 'submit_vendor_quote'
      AND pg_get_function_identity_arguments(proc.oid) =
        'p_rfq_id uuid, p_vendor_organization_id uuid, p_daily_rate numeric, p_delivery_fee numeric, p_mobilization_fee numeric, p_minimum_rental_days integer, p_available_start_date date, p_equipment_substitution boolean, p_substitution_notes text, p_compliance_confirmed boolean, p_compliance_notes text[], p_vendor_notes text'
  ),
  'legacy numeric quote submission signature is removed'
);
SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.submit_vendor_quote(uuid,uuid,uuid,jsonb,date,boolean,text,boolean,text[],text)',
    'EXECUTE'
  ),
  'authenticated vendors may call the governed exact-decimal quote command'
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
