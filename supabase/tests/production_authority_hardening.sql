BEGIN;

CREATE EXTENSION IF NOT EXISTS pgtap WITH SCHEMA extensions;
SET LOCAL search_path = public, extensions;

SELECT plan(34);

SELECT ok(
  has_table_privilege('authenticated', 'public.profiles', 'SELECT'),
  'authenticated users retain direct profile reads'
);

SELECT ok(
  has_table_privilege('authenticated', 'public.rental_off_rent_requests', 'SELECT'),
  'authenticated users retain the verified off-rent request read'
);

SELECT ok(
  NOT has_table_privilege('authenticated', table_name, 'SELECT'),
  format('authenticated direct SELECT is revoked from %s', table_name)
)
FROM unnest(ARRAY[
  'public.rental_field_acceptances',
  'public.rental_off_rent_acknowledgments',
  'public.rental_stop_evaluator_versions',
  'public.rental_stop_rule_versions',
  'public.rental_stop_term_snapshots',
  'public.rental_stop_readiness_declarations',
  'public.rental_stop_evaluation_attempts',
  'public.rental_stop_determinations'
]) AS tables(table_name);

SELECT ok(
  NOT has_table_privilege('service_role', 'public.rental_field_acceptances', privilege_name),
  format('service_role lacks direct field-acceptance %s', privilege_name)
)
FROM unnest(ARRAY[
  'SELECT', 'INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER'
]) AS privileges(privilege_name);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.record_rental_field_acceptance(uuid,uuid,text,text[],boolean,boolean,boolean,boolean)',
    'EXECUTE'
  ),
  'service_role retains the controlled field-acceptance command'
);

SELECT ok(
  to_regclass(index_name) IS NOT NULL,
  format('%s exists', index_name)
)
FROM unnest(ARRAY[
  'public.idx_field_acceptances_accepted_by',
  'public.idx_field_acceptances_audit_event',
  'public.idx_off_rent_requests_requested_by',
  'public.idx_off_rent_requests_audit_event',
  'public.idx_off_rent_acknowledgments_acknowledged_by',
  'public.idx_off_rent_acknowledgments_audit_event'
]) AS indexes(index_name);

SELECT is(
  (SELECT count(*)::integer
   FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'rental_off_rent_requests'
     AND cmd = 'SELECT'
     AND 'authenticated' = ANY (roles)),
  1,
  'off-rent request authenticated SELECT policies are consolidated'
);

SELECT is(
  (SELECT count(*)::integer
   FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'rental_off_rent_acknowledgments'
     AND cmd = 'SELECT'
     AND 'authenticated' = ANY (roles)),
  1,
  'off-rent acknowledgment authenticated SELECT policies are consolidated'
);

SELECT is(
  (SELECT count(*)::integer
   FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = table_name
     AND cmd = 'SELECT'
     AND 'authenticated' = ANY (roles)),
  1,
  format('%s authenticated SELECT policies are consolidated', table_name)
)
FROM unnest(ARRAY[
  'rental_stop_term_snapshots',
  'rental_stop_readiness_declarations',
  'rental_stop_evaluation_attempts',
  'rental_stop_determinations'
]) AS tables(table_name);

SELECT ok(
  (SELECT qual
   FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'rental_off_rent_requests'
     AND policyname = 'off_rent_requests_select_authorized')
    LIKE '%is_demo_actor%is_simulated%',
  'off-rent request reads preserve simulation isolation'
);

SELECT ok(
  (SELECT qual
   FROM pg_catalog.pg_policies
   WHERE schemaname = 'public'
     AND tablename = 'rental_off_rent_acknowledgments'
     AND policyname = 'off_rent_acknowledgments_select_authorized')
    LIKE '%is_demo_actor%is_simulated%',
  'off-rent acknowledgment reads preserve simulation isolation'
);

SELECT is(
  (SELECT count(*)::integer FROM public.rental_stop_rule_versions),
  0,
  'hardening publishes no contractual stop-rent rule'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_proc AS proc
    JOIN pg_catalog.pg_namespace AS namespace
      ON namespace.oid = proc.pronamespace
    WHERE namespace.nspname = 'public'
      AND proc.proname ILIKE '%override%'
      AND proc.proname ILIKE '%rental%stop%'
  ),
  'hardening creates no governed stop-rent override pathway'
);

SELECT * FROM finish();
ROLLBACK;
