-- Rental-clock contract authority foundation.
--
-- The database owns the only command that can advance demobilizing -> off_rent.
-- No contractual rule is seeded here. An accepted term snapshot must bind the
-- RFQ to an explicitly published rule version before the command can succeed.

CREATE TABLE public.rental_stop_evaluator_versions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluator_key           text NOT NULL CHECK (
                            evaluator_key ~ '^[a-z0-9][a-z0-9._-]{2,79}$'
                          ),
  evaluator_version       integer NOT NULL CHECK (evaluator_version > 0),
  predecessor_evaluator_version_id uuid
                          REFERENCES public.rental_stop_evaluator_versions ON DELETE RESTRICT,
  artifact_sha256         text NOT NULL CHECK (artifact_sha256 ~ '^[0-9a-f]{64}$'),
  source_kind             text NOT NULL CHECK (source_kind IN (
                            'migration_artifact', 'backend_artifact'
                          )),
  source_reference        text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 3 AND 500),
  source_sha256           text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  supported_trigger_bases text[] NOT NULL CHECK (cardinality(supported_trigger_bases) > 0),
  billing_treatment       text NOT NULL CHECK (billing_treatment IN (
                            'exact_timestamp',
                            'calendar_day',
                            'minimum_period',
                            'fixed_cycle',
                            'cycle_threshold',
                            'possession_based',
                            'usage_based',
                            'contract_specific'
                          )),
  definition              jsonb NOT NULL CHECK (jsonb_typeof(definition) = 'object'),
  lifecycle_state         text NOT NULL CHECK (lifecycle_state IN ('active', 'retired')),
  effective_from          timestamptz NOT NULL,
  effective_until         timestamptz,
  published_by            uuid REFERENCES auth.users ON DELETE RESTRICT,
  correlation_id          uuid NOT NULL,
  idempotency_key         text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  audit_event_id          uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated            boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (evaluator_key, evaluator_version),
  UNIQUE (evaluator_key, evaluator_version, artifact_sha256),
  UNIQUE (evaluator_key, idempotency_key),
  CHECK (effective_until IS NULL OR effective_until > effective_from),
  CHECK (
    (evaluator_version = 1 AND predecessor_evaluator_version_id IS NULL)
    OR
    (evaluator_version > 1 AND predecessor_evaluator_version_id IS NOT NULL)
  )
);

INSERT INTO public.audit_events (
  id, correlation_id, entity_type, entity_id, event_type, event_category,
  actor_id, actor_role, actor_type, source, is_simulated, metadata
) VALUES (
  '10000000-0000-0000-0000-000000000001',
  '10000000-0000-0000-0000-000000000002',
  'rental_stop_evaluator_version',
  '10000000-0000-0000-0000-000000000003',
  'stoprent.evaluator_published',
  'billing',
  NULL,
  'migration',
  'system',
  'migration',
  false,
  jsonb_build_object(
    'evaluator_key', 'postgres.exact_timestamp',
    'evaluator_version', 1,
    'artifact_sha256', '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
    'source_kind', 'migration_artifact',
    'source_reference', '20260807220110_rental_clock_contract_foundation.sql#postgres.exact_timestamp',
    'source_sha256', '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb'
  )
);

INSERT INTO public.rental_stop_evaluator_versions (
  id,
  evaluator_key,
  evaluator_version,
  artifact_sha256,
  source_kind,
  source_reference,
  source_sha256,
  supported_trigger_bases,
  billing_treatment,
  definition,
  lifecycle_state,
  effective_from,
  correlation_id,
  idempotency_key,
  audit_event_id,
  is_simulated
) VALUES (
  '10000000-0000-0000-0000-000000000003',
  'postgres.exact_timestamp',
  1,
  '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
  'migration_artifact',
  '20260807220110_rental_clock_contract_foundation.sql#postgres.exact_timestamp',
  '766f2fabeecc6943901c2c98a49896a3b0b0e35687d786d971a47bd68da85deb',
  ARRAY[
    'request_received',
    'requested_stop',
    'verified_readiness',
    'vendor_acknowledgment',
    'pickup_available'
  ],
  'exact_timestamp',
  jsonb_build_object(
    'contract', 'selected governed evidence is the stop-effective timestamp',
    'billable_through', 'equals stop-effective timestamp',
    'missing_evidence', 'blocked',
    'unsupported_trigger', 'blocked'
  ),
  'active',
  '2026-08-11 00:00:00+00',
  '10000000-0000-0000-0000-000000000002',
  'migration-exact-timestamp-v1',
  '10000000-0000-0000-0000-000000000001',
  false
);

CREATE TABLE public.rental_stop_rule_versions (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_code                text NOT NULL CHECK (rule_code ~ '^[a-z0-9][a-z0-9._-]{2,79}$'),
  version                  integer NOT NULL CHECK (version > 0),
  predecessor_rule_version_id uuid REFERENCES public.rental_stop_rule_versions ON DELETE RESTRICT,
  display_name             text NOT NULL CHECK (length(btrim(display_name)) BETWEEN 3 AND 160),
  visibility               text NOT NULL CHECK (visibility IN ('platform', 'organization_pair')),
  customer_organization_id uuid REFERENCES public.organizations ON DELETE RESTRICT,
  vendor_organization_id   uuid REFERENCES public.organizations ON DELETE RESTRICT,
  trigger_basis            text NOT NULL CHECK (trigger_basis IN (
                             'unknown',
                             'request_received',
                             'requested_stop',
                             'verified_readiness',
                             'vendor_acknowledgment',
                             'pickup_available',
                             'physical_pickup',
                             'contract_specific'
                           )),
  billing_treatment        text NOT NULL CHECK (billing_treatment IN (
                             'unknown',
                             'exact_timestamp',
                             'calendar_day',
                             'minimum_period',
                             'fixed_cycle',
                             'cycle_threshold',
                             'possession_based',
                             'usage_based',
                             'contract_specific'
                           )),
  evaluator_key            text,
  evaluator_version        integer,
  evaluator_sha256         text CHECK (
                             evaluator_sha256 IS NULL OR evaluator_sha256 ~ '^[0-9a-f]{64}$'
                           ),
  rule_parameters          jsonb NOT NULL DEFAULT '{}'::jsonb
                           CHECK (jsonb_typeof(rule_parameters) = 'object'),
  source_kind              text NOT NULL CHECK (source_kind IN (
                             'accepted_contract',
                             'accepted_quote',
                             'change_order',
                             'platform_policy'
                           )),
  source_reference         text NOT NULL CHECK (length(btrim(source_reference)) BETWEEN 1 AND 500),
  source_sha256            text NOT NULL CHECK (source_sha256 ~ '^[0-9a-f]{64}$'),
  published_at             timestamptz NOT NULL,
  effective_from           timestamptz NOT NULL,
  effective_until          timestamptz,
  created_by               uuid REFERENCES auth.users ON DELETE RESTRICT,
  correlation_id           uuid NOT NULL,
  idempotency_key          text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rule_code, version),
  UNIQUE (rule_code, idempotency_key),
  FOREIGN KEY (evaluator_key, evaluator_version, evaluator_sha256)
    REFERENCES public.rental_stop_evaluator_versions (
      evaluator_key, evaluator_version, artifact_sha256
    ) ON DELETE RESTRICT,
  CHECK (
    (evaluator_key IS NULL AND evaluator_version IS NULL AND evaluator_sha256 IS NULL)
    OR
    (evaluator_key IS NOT NULL AND evaluator_version IS NOT NULL AND evaluator_sha256 IS NOT NULL)
  ),
  CHECK (effective_until IS NULL OR effective_until > effective_from),
  CHECK (
    (version = 1 AND predecessor_rule_version_id IS NULL)
    OR
    (version > 1 AND predecessor_rule_version_id IS NOT NULL)
  ),
  CHECK (
    (visibility = 'platform'
      AND customer_organization_id IS NULL
      AND vendor_organization_id IS NULL)
    OR
    (visibility = 'organization_pair'
      AND customer_organization_id IS NOT NULL
      AND vendor_organization_id IS NOT NULL)
  ),
  CHECK (customer_organization_id IS NULL OR customer_organization_id <> vendor_organization_id)
);

CREATE TABLE public.rental_stop_term_snapshots (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  accepted_quote_id        uuid NOT NULL REFERENCES public.vendor_quote_responses ON DELETE RESTRICT,
  rule_version_id          uuid NOT NULL REFERENCES public.rental_stop_rule_versions ON DELETE RESTRICT,
  snapshot_version         integer NOT NULL CHECK (snapshot_version > 0),
  supersedes_term_snapshot_id uuid REFERENCES public.rental_stop_term_snapshots ON DELETE RESTRICT,
  time_zone                text NOT NULL CHECK (length(btrim(time_zone)) BETWEEN 1 AND 100),
  currency_code            text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  terms_payload            jsonb NOT NULL CHECK (jsonb_typeof(terms_payload) = 'object'),
  terms_sha256             text NOT NULL CHECK (terms_sha256 ~ '^[0-9a-f]{64}$'),
  accepted_at              timestamptz NOT NULL,
  accepted_by              uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  correlation_id           uuid NOT NULL,
  idempotency_key          text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, snapshot_version),
  UNIQUE (rfq_id, idempotency_key),
  UNIQUE (rfq_id, accepted_quote_id, rule_version_id, terms_sha256),
  CHECK (
    (snapshot_version = 1 AND supersedes_term_snapshot_id IS NULL)
    OR
    (snapshot_version > 1 AND supersedes_term_snapshot_id IS NOT NULL)
  )
);

CREATE TABLE public.rental_stop_readiness_declarations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  off_rent_request_id      uuid NOT NULL REFERENCES public.rental_off_rent_requests ON DELETE RESTRICT,
  declaration_version      integer NOT NULL CHECK (declaration_version > 0),
  supersedes_readiness_declaration_id uuid
                           REFERENCES public.rental_stop_readiness_declarations ON DELETE RESTRICT,
  declared_by              uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  declared_at              timestamptz NOT NULL DEFAULT now(),
  ready_at                 timestamptz,
  equipment_location       text CHECK (
                             equipment_location IS NULL OR length(equipment_location) <= 1000
                           ),
  isolation_state          text NOT NULL CHECK (isolation_state IN (
                             'confirmed', 'not_confirmed', 'unknown', 'not_applicable'
                           )),
  drained_state            text NOT NULL CHECK (drained_state IN (
                             'confirmed', 'not_confirmed', 'unknown', 'not_applicable'
                           )),
  safe_access_state        text NOT NULL CHECK (safe_access_state IN (
                             'confirmed', 'not_confirmed', 'unknown', 'not_applicable'
                           )),
  operating_state          text NOT NULL CHECK (operating_state IN (
                             'confirmed', 'not_confirmed', 'unknown', 'not_applicable'
                           )),
  component_manifest      jsonb NOT NULL DEFAULT '[]'::jsonb
                           CHECK (jsonb_typeof(component_manifest) = 'array'),
  evidence_refs           jsonb NOT NULL DEFAULT '[]'::jsonb
                           CHECK (jsonb_typeof(evidence_refs) = 'array'),
  notes                    text CHECK (notes IS NULL OR length(notes) <= 4000),
  declaration_sha256       text NOT NULL CHECK (declaration_sha256 ~ '^[0-9a-f]{64}$'),
  correlation_id           uuid NOT NULL,
  idempotency_key          text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (off_rent_request_id, declaration_version),
  UNIQUE (off_rent_request_id, idempotency_key),
  CHECK (
    (declaration_version = 1 AND supersedes_readiness_declaration_id IS NULL)
    OR
    (declaration_version > 1 AND supersedes_readiness_declaration_id IS NOT NULL)
  )
);

CREATE TABLE public.rental_stop_evaluation_attempts (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  off_rent_request_id      uuid REFERENCES public.rental_off_rent_requests ON DELETE RESTRICT,
  off_rent_acknowledgment_id uuid REFERENCES public.rental_off_rent_acknowledgments ON DELETE RESTRICT,
  readiness_declaration_id uuid REFERENCES public.rental_stop_readiness_declarations ON DELETE RESTRICT,
  term_snapshot_id         uuid REFERENCES public.rental_stop_term_snapshots ON DELETE RESTRICT,
  evaluator_key            text,
  evaluator_version        integer,
  evaluator_sha256         text CHECK (
                             evaluator_sha256 IS NULL OR evaluator_sha256 ~ '^[0-9a-f]{64}$'
                           ),
  idempotency_key          text NOT NULL CHECK (length(btrim(idempotency_key)) BETWEEN 8 AND 200),
  initiated_by             uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  initiation_authority     text NOT NULL CHECK (initiation_authority IN (
                             'platform_operations', 'customer_relationship', 'accepted_vendor_relationship'
                           )),
  outcome                  text NOT NULL CHECK (outcome IN ('blocked', 'complete')),
  blocker_code             text CHECK (
                             blocker_code IS NULL OR blocker_code IN (
                               'INVALID_STATE',
                               'OFF_RENT_REQUEST_MISSING',
                               'OFF_RENT_ACKNOWLEDGMENT_MISSING',
                               'ACCEPTED_TERM_SNAPSHOT_MISSING',
                               'STOP_RULE_UNKNOWN',
                               'EVALUATOR_NOT_ACTIVE',
                               'UNSUPPORTED_TRIGGER',
                               'MISSING_TRIGGER_EVIDENCE',
                               'UNSUPPORTED_BILLING_TREATMENT'
                             )
                           ),
  blocker_detail           text CHECK (
                             blocker_detail IS NULL OR length(blocker_detail) <= 2000
                           ),
  evidence_snapshot        jsonb NOT NULL CHECK (jsonb_typeof(evidence_snapshot) = 'object'),
  result_snapshot          jsonb NOT NULL CHECK (jsonb_typeof(result_snapshot) = 'object'),
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, idempotency_key),
  FOREIGN KEY (evaluator_key, evaluator_version, evaluator_sha256)
    REFERENCES public.rental_stop_evaluator_versions (
      evaluator_key, evaluator_version, artifact_sha256
    ) ON DELETE RESTRICT,
  CHECK (
    (evaluator_key IS NULL AND evaluator_version IS NULL AND evaluator_sha256 IS NULL)
    OR
    (evaluator_key IS NOT NULL AND evaluator_version IS NOT NULL AND evaluator_sha256 IS NOT NULL)
  ),
  CHECK (
    (outcome = 'blocked' AND blocker_code IS NOT NULL)
    OR
    (outcome = 'complete' AND blocker_code IS NULL AND blocker_detail IS NULL)
  )
);

CREATE TABLE public.rental_stop_determinations (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                   uuid NOT NULL REFERENCES public.rental_requests ON DELETE RESTRICT,
  off_rent_request_id      uuid NOT NULL REFERENCES public.rental_off_rent_requests ON DELETE RESTRICT,
  off_rent_acknowledgment_id uuid REFERENCES public.rental_off_rent_acknowledgments ON DELETE RESTRICT,
  readiness_declaration_id uuid REFERENCES public.rental_stop_readiness_declarations ON DELETE RESTRICT,
  term_snapshot_id         uuid NOT NULL REFERENCES public.rental_stop_term_snapshots ON DELETE RESTRICT,
  evaluation_attempt_id    uuid NOT NULL UNIQUE
                           REFERENCES public.rental_stop_evaluation_attempts ON DELETE RESTRICT,
  evaluator_key            text NOT NULL,
  evaluator_version        integer NOT NULL,
  evaluator_sha256         text NOT NULL CHECK (evaluator_sha256 ~ '^[0-9a-f]{64}$'),
  determination_version    integer NOT NULL CHECK (determination_version > 0),
  supersedes_determination_id uuid REFERENCES public.rental_stop_determinations ON DELETE RESTRICT,
  stop_effective_at        timestamptz NOT NULL,
  billable_through_at      timestamptz NOT NULL,
  exposure_ceiling_amount  numeric CHECK (exposure_ceiling_amount IS NULL OR exposure_ceiling_amount >= 0),
  currency_code            text NOT NULL CHECK (currency_code ~ '^[A-Z]{3}$'),
  calculation_inputs       jsonb NOT NULL CHECK (jsonb_typeof(calculation_inputs) = 'object'),
  calculation_outputs      jsonb NOT NULL CHECK (jsonb_typeof(calculation_outputs) = 'object'),
  explanation              text NOT NULL CHECK (length(btrim(explanation)) BETWEEN 1 AND 4000),
  determined_at            timestamptz NOT NULL DEFAULT now(),
  correlation_id           uuid NOT NULL,
  audit_event_id           uuid NOT NULL REFERENCES public.audit_events ON DELETE RESTRICT,
  is_simulated             boolean NOT NULL DEFAULT false,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, determination_version),
  FOREIGN KEY (evaluator_key, evaluator_version, evaluator_sha256)
    REFERENCES public.rental_stop_evaluator_versions (
      evaluator_key, evaluator_version, artifact_sha256
    ) ON DELETE RESTRICT,
  CHECK (billable_through_at >= stop_effective_at),
  CHECK (
    (determination_version = 1 AND supersedes_determination_id IS NULL)
    OR
    (determination_version > 1 AND supersedes_determination_id IS NOT NULL)
  )
);

ALTER TABLE public.rental_stop_evaluator_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stop_rule_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stop_term_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stop_readiness_declarations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stop_evaluation_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_stop_determinations ENABLE ROW LEVEL SECURITY;

-- Data API exposure is opt-in and read-only. All authoritative writes execute
-- through actor-specific SECURITY DEFINER commands. The service role is a
-- transport credential, not product authority.
REVOKE ALL ON public.rental_stop_evaluator_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_stop_rule_versions FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_stop_term_snapshots FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_stop_readiness_declarations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_stop_evaluation_attempts FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.rental_stop_determinations FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.rental_stop_evaluator_versions TO authenticated;
GRANT SELECT ON public.rental_stop_rule_versions TO authenticated;
GRANT SELECT ON public.rental_stop_term_snapshots TO authenticated;
GRANT SELECT ON public.rental_stop_readiness_declarations TO authenticated;
GRANT SELECT ON public.rental_stop_evaluation_attempts TO authenticated;
GRANT SELECT ON public.rental_stop_determinations TO authenticated;

REVOKE ALL ON public.rental_stop_evaluator_versions FROM service_role;
REVOKE ALL ON public.rental_stop_rule_versions FROM service_role;
REVOKE ALL ON public.rental_stop_term_snapshots FROM service_role;
REVOKE ALL ON public.rental_stop_readiness_declarations FROM service_role;
REVOKE ALL ON public.rental_stop_evaluation_attempts FROM service_role;
REVOKE ALL ON public.rental_stop_determinations FROM service_role;

-- The service role receives read access only. Authoritative inserts execute
-- through separately granted SECURITY DEFINER commands; direct table writes
-- are not an alternate mutation path.
GRANT SELECT ON public.rental_stop_evaluator_versions TO service_role;
GRANT SELECT ON public.rental_stop_rule_versions TO service_role;
GRANT SELECT ON public.rental_stop_term_snapshots TO service_role;
GRANT SELECT ON public.rental_stop_readiness_declarations TO service_role;
GRANT SELECT ON public.rental_stop_evaluation_attempts TO service_role;
GRANT SELECT ON public.rental_stop_determinations TO service_role;

CREATE POLICY "stop_evaluator_versions_select_authenticated"
  ON public.rental_stop_evaluator_versions FOR SELECT TO authenticated
  USING (
    (NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true
  );

CREATE POLICY "stop_rule_versions_select_authorized"
  ON public.rental_stop_rule_versions FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND (
      visibility = 'platform'
      OR customer_organization_id IN (
        SELECT om.organization_id
        FROM public.organization_memberships AS om
        WHERE om.user_id = (SELECT auth.uid())
          AND om.archived_at IS NULL
      )
      OR vendor_organization_id IN (
        SELECT om.organization_id
        FROM public.organization_memberships AS om
        WHERE om.user_id = (SELECT auth.uid())
          AND om.archived_at IS NULL
      )
    )
  );

CREATE POLICY "stop_term_snapshots_select_customer"
  ON public.rental_stop_term_snapshots FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND
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
  );

CREATE POLICY "stop_term_snapshots_select_accepted_vendor"
  ON public.rental_stop_term_snapshots FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND public.rfq_vendor_has_accepted_quote(rfq_id)
  );

CREATE POLICY "stop_readiness_select_customer"
  ON public.rental_stop_readiness_declarations FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND
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
  );

CREATE POLICY "stop_readiness_select_accepted_vendor"
  ON public.rental_stop_readiness_declarations FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND public.rfq_vendor_has_accepted_quote(rfq_id)
  );

CREATE POLICY "stop_attempts_select_customer"
  ON public.rental_stop_evaluation_attempts FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
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

CREATE POLICY "stop_attempts_select_accepted_vendor"
  ON public.rental_stop_evaluation_attempts FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND public.rfq_vendor_has_accepted_quote(rfq_id)
  );

CREATE POLICY "stop_determinations_select_customer"
  ON public.rental_stop_determinations FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND
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
  );

CREATE POLICY "stop_determinations_select_accepted_vendor"
  ON public.rental_stop_determinations FOR SELECT TO authenticated
  USING (
    ((NOT public.is_demo_actor((SELECT auth.uid()))) OR is_simulated = true)
    AND public.rfq_vendor_has_accepted_quote(rfq_id)
  );

CREATE INDEX idx_stop_rule_versions_pair
  ON public.rental_stop_rule_versions (customer_organization_id, vendor_organization_id);
CREATE INDEX idx_stop_rule_versions_vendor
  ON public.rental_stop_rule_versions (vendor_organization_id)
  WHERE vendor_organization_id IS NOT NULL;
CREATE INDEX idx_stop_rule_versions_predecessor
  ON public.rental_stop_rule_versions (predecessor_rule_version_id)
  WHERE predecessor_rule_version_id IS NOT NULL;
CREATE INDEX idx_stop_rule_versions_created_by
  ON public.rental_stop_rule_versions (created_by) WHERE created_by IS NOT NULL;
CREATE INDEX idx_stop_rule_versions_audit
  ON public.rental_stop_rule_versions (audit_event_id);
CREATE INDEX idx_stop_rule_versions_evaluator
  ON public.rental_stop_rule_versions (
    evaluator_key, evaluator_version, evaluator_sha256
  )
  WHERE evaluator_key IS NOT NULL;
CREATE INDEX idx_stop_evaluator_versions_predecessor
  ON public.rental_stop_evaluator_versions (predecessor_evaluator_version_id)
  WHERE predecessor_evaluator_version_id IS NOT NULL;
CREATE INDEX idx_stop_evaluator_versions_published_by
  ON public.rental_stop_evaluator_versions (published_by)
  WHERE published_by IS NOT NULL;
CREATE INDEX idx_stop_evaluator_versions_audit
  ON public.rental_stop_evaluator_versions (audit_event_id);
CREATE INDEX idx_stop_term_snapshots_rfq_version
  ON public.rental_stop_term_snapshots (rfq_id, snapshot_version DESC);
CREATE INDEX idx_stop_term_snapshots_quote
  ON public.rental_stop_term_snapshots (accepted_quote_id);
CREATE INDEX idx_stop_term_snapshots_rule
  ON public.rental_stop_term_snapshots (rule_version_id);
CREATE INDEX idx_stop_term_snapshots_predecessor
  ON public.rental_stop_term_snapshots (supersedes_term_snapshot_id)
  WHERE supersedes_term_snapshot_id IS NOT NULL;
CREATE INDEX idx_stop_term_snapshots_accepted_by
  ON public.rental_stop_term_snapshots (accepted_by);
CREATE INDEX idx_stop_term_snapshots_audit
  ON public.rental_stop_term_snapshots (audit_event_id);
CREATE INDEX idx_stop_readiness_rfq_version
  ON public.rental_stop_readiness_declarations (rfq_id, declaration_version DESC);
CREATE INDEX idx_stop_readiness_request
  ON public.rental_stop_readiness_declarations (off_rent_request_id);
CREATE INDEX idx_stop_readiness_predecessor
  ON public.rental_stop_readiness_declarations (supersedes_readiness_declaration_id)
  WHERE supersedes_readiness_declaration_id IS NOT NULL;
CREATE INDEX idx_stop_readiness_declared_by
  ON public.rental_stop_readiness_declarations (declared_by);
CREATE INDEX idx_stop_readiness_audit
  ON public.rental_stop_readiness_declarations (audit_event_id);
CREATE INDEX idx_stop_attempts_request
  ON public.rental_stop_evaluation_attempts (off_rent_request_id)
  WHERE off_rent_request_id IS NOT NULL;
CREATE INDEX idx_stop_attempts_ack
  ON public.rental_stop_evaluation_attempts (off_rent_acknowledgment_id)
  WHERE off_rent_acknowledgment_id IS NOT NULL;
CREATE INDEX idx_stop_attempts_readiness
  ON public.rental_stop_evaluation_attempts (readiness_declaration_id)
  WHERE readiness_declaration_id IS NOT NULL;
CREATE INDEX idx_stop_attempts_terms
  ON public.rental_stop_evaluation_attempts (term_snapshot_id)
  WHERE term_snapshot_id IS NOT NULL;
CREATE INDEX idx_stop_attempts_audit
  ON public.rental_stop_evaluation_attempts (audit_event_id);
CREATE INDEX idx_stop_attempts_initiated_by
  ON public.rental_stop_evaluation_attempts (initiated_by);
CREATE INDEX idx_stop_attempts_evaluator
  ON public.rental_stop_evaluation_attempts (
    evaluator_key, evaluator_version, evaluator_sha256
  )
  WHERE evaluator_key IS NOT NULL;
CREATE INDEX idx_stop_determinations_rfq_version
  ON public.rental_stop_determinations (rfq_id, determination_version DESC);
CREATE INDEX idx_stop_determinations_request
  ON public.rental_stop_determinations (off_rent_request_id);
CREATE INDEX idx_stop_determinations_ack
  ON public.rental_stop_determinations (off_rent_acknowledgment_id)
  WHERE off_rent_acknowledgment_id IS NOT NULL;
CREATE INDEX idx_stop_determinations_readiness
  ON public.rental_stop_determinations (readiness_declaration_id)
  WHERE readiness_declaration_id IS NOT NULL;
CREATE INDEX idx_stop_determinations_terms
  ON public.rental_stop_determinations (term_snapshot_id);
CREATE INDEX idx_stop_determinations_predecessor
  ON public.rental_stop_determinations (supersedes_determination_id)
  WHERE supersedes_determination_id IS NOT NULL;
CREATE INDEX idx_stop_determinations_audit
  ON public.rental_stop_determinations (audit_event_id);
CREATE INDEX idx_stop_determinations_evaluator
  ON public.rental_stop_determinations (
    evaluator_key, evaluator_version, evaluator_sha256
  );

-- Earlier off-rent migrations granted broad service-role table mutation.
-- Their SECURITY DEFINER commands continue to work as table owner, while the
-- transport role loses the direct bypass path.
REVOKE INSERT, UPDATE, DELETE ON public.rental_off_rent_requests FROM service_role;
REVOKE INSERT, UPDATE, DELETE ON public.rental_off_rent_acknowledgments FROM service_role;

CREATE OR REPLACE FUNCTION public.reject_rental_clock_immutable_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION '% rows are immutable; create a new version or superseding determination',
    TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER rental_stop_evaluator_versions_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_evaluator_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();
CREATE TRIGGER rental_stop_rule_versions_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();
CREATE TRIGGER rental_stop_term_snapshots_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_term_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();
CREATE TRIGGER rental_stop_readiness_declarations_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_readiness_declarations
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();
CREATE TRIGGER rental_stop_evaluation_attempts_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_evaluation_attempts
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();
CREATE TRIGGER rental_stop_determinations_immutable
  BEFORE UPDATE OR DELETE ON public.rental_stop_determinations
  FOR EACH ROW EXECUTE FUNCTION public.reject_rental_clock_immutable_change();

CREATE OR REPLACE FUNCTION public.assert_rental_clock_audit_event(
  p_audit_event_id uuid,
  p_entity_type text,
  p_entity_id uuid,
  p_rfq_id uuid,
  p_is_simulated boolean,
  p_correlation_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_event record;
BEGIN
  SELECT entity_type, entity_id, related_rfq_id, is_simulated, correlation_id
  INTO v_event
  FROM public.audit_events
  WHERE id = p_audit_event_id;

  IF NOT FOUND
     OR v_event.entity_type <> p_entity_type
     OR v_event.entity_id <> p_entity_id
     OR v_event.related_rfq_id IS DISTINCT FROM p_rfq_id
     OR v_event.is_simulated IS DISTINCT FROM p_is_simulated
     OR v_event.correlation_id IS DISTINCT FROM p_correlation_id THEN
    RAISE EXCEPTION 'Rental-clock audit event does not match entity, RFQ, correlation, or simulation scope';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_rental_stop_evaluator_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_prior record;
BEGIN
  IF NEW.predecessor_evaluator_version_id IS NOT NULL THEN
    SELECT evaluator_key, evaluator_version
    INTO v_prior
    FROM public.rental_stop_evaluator_versions
    WHERE id = NEW.predecessor_evaluator_version_id
    FOR KEY SHARE;

    IF NOT FOUND
       OR v_prior.evaluator_key <> NEW.evaluator_key
       OR v_prior.evaluator_version <> NEW.evaluator_version - 1 THEN
      RAISE EXCEPTION 'Evaluator version must reference the immediately prior version of the same evaluator';
    END IF;
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_evaluator_version',
    NEW.id,
    NULL,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_evaluator_version_contract
  BEFORE INSERT ON public.rental_stop_evaluator_versions
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_evaluator_version();

CREATE OR REPLACE FUNCTION public.validate_rental_stop_rule_version()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_prior record;
  v_evaluator record;
BEGIN
  IF NEW.predecessor_rule_version_id IS NOT NULL THEN
    SELECT rule_code, version
    INTO v_prior
    FROM public.rental_stop_rule_versions
    WHERE id = NEW.predecessor_rule_version_id
    FOR KEY SHARE;

    IF NOT FOUND
       OR v_prior.rule_code <> NEW.rule_code
       OR v_prior.version <> NEW.version - 1 THEN
      RAISE EXCEPTION 'Stop-rule version must reference the immediately prior version of the same rule';
    END IF;
  END IF;

  IF NEW.evaluator_key IS NOT NULL THEN
    SELECT supported_trigger_bases, billing_treatment, lifecycle_state,
           effective_from, effective_until, is_simulated
    INTO v_evaluator
    FROM public.rental_stop_evaluator_versions
    WHERE evaluator_key = NEW.evaluator_key
      AND evaluator_version = NEW.evaluator_version
      AND artifact_sha256 = NEW.evaluator_sha256;

    IF NOT FOUND
       OR v_evaluator.lifecycle_state <> 'active'
       OR v_evaluator.effective_from > NEW.effective_from
       OR (v_evaluator.effective_until IS NOT NULL
         AND v_evaluator.effective_until <= NEW.effective_from)
       OR v_evaluator.is_simulated IS DISTINCT FROM NEW.is_simulated
       OR v_evaluator.billing_treatment <> NEW.billing_treatment
       OR NOT (NEW.trigger_basis = ANY(v_evaluator.supported_trigger_bases)) THEN
      RAISE EXCEPTION 'Stop-rule version requires an active evaluator that supports its trigger and billing treatment';
    END IF;
  ELSIF NEW.trigger_basis <> 'unknown' AND NEW.billing_treatment <> 'unknown' THEN
    RAISE EXCEPTION 'A determinate stop rule requires an approved evaluator version';
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_rule_version',
    NEW.id,
    NULL,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_rule_version_contract
  BEFORE INSERT ON public.rental_stop_rule_versions
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_rule_version();

CREATE OR REPLACE FUNCTION public.validate_rental_stop_term_snapshot()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_quote record;
  v_rule  record;
  v_rfq   record;
  v_prior record;
BEGIN
  SELECT rfq_id, vendor_organization_id, status, accepted_by, accepted_at, is_simulated
  INTO v_quote
  FROM public.vendor_quote_responses
  WHERE id = NEW.accepted_quote_id;

  IF NOT FOUND OR v_quote.rfq_id <> NEW.rfq_id OR v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'Stop-term snapshot requires the accepted quote for RFQ %', NEW.rfq_id;
  END IF;

  IF v_quote.accepted_by IS DISTINCT FROM NEW.accepted_by
     OR v_quote.accepted_at IS DISTINCT FROM NEW.accepted_at THEN
    RAISE EXCEPTION 'Stop-term snapshot acceptance must match the immutable accepted quote event';
  END IF;

  SELECT customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = NEW.rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', NEW.rfq_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_timezone_names AS tz
    WHERE tz.name = NEW.time_zone
  ) THEN
    RAISE EXCEPTION 'Stop-term snapshot requires a recognized IANA time zone: %', NEW.time_zone;
  END IF;

  SELECT visibility, customer_organization_id, vendor_organization_id,
         published_at, effective_from, effective_until, is_simulated
  INTO v_rule
  FROM public.rental_stop_rule_versions
  WHERE id = NEW.rule_version_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Stop-rule version not found: %', NEW.rule_version_id;
  END IF;

  IF v_rule.published_at > NEW.accepted_at
     OR v_rule.effective_from > NEW.accepted_at
     OR (v_rule.effective_until IS NOT NULL AND v_rule.effective_until <= NEW.accepted_at) THEN
    RAISE EXCEPTION 'Stop-rule version was not published and effective when the quote was accepted';
  END IF;

  IF v_rule.visibility = 'organization_pair'
     AND (v_rule.customer_organization_id IS DISTINCT FROM v_rfq.customer_organization_id
       OR v_rule.vendor_organization_id IS DISTINCT FROM v_quote.vendor_organization_id) THEN
    RAISE EXCEPTION 'Stop-rule version is not authorized for the accepted customer/vendor pair';
  END IF;

  IF NEW.is_simulated IS DISTINCT FROM v_rfq.is_simulated
     OR NEW.is_simulated IS DISTINCT FROM v_quote.is_simulated
     OR NEW.is_simulated IS DISTINCT FROM v_rule.is_simulated THEN
    RAISE EXCEPTION 'Stop-term snapshot simulation scope does not match its RFQ, quote, and rule';
  END IF;

  IF NEW.supersedes_term_snapshot_id IS NOT NULL THEN
    SELECT rfq_id, snapshot_version
    INTO v_prior
    FROM public.rental_stop_term_snapshots
    WHERE id = NEW.supersedes_term_snapshot_id
    FOR KEY SHARE;

    IF NOT FOUND OR v_prior.rfq_id <> NEW.rfq_id
       OR v_prior.snapshot_version <> NEW.snapshot_version - 1 THEN
      RAISE EXCEPTION 'Superseding term snapshot must reference the immediately prior RFQ snapshot';
    END IF;
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_term_snapshot',
    NEW.id,
    NEW.rfq_id,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_term_snapshot_contract
  BEFORE INSERT ON public.rental_stop_term_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_term_snapshot();

CREATE OR REPLACE FUNCTION public.validate_rental_stop_readiness_declaration()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_request record;
  v_rfq record;
  v_prior record;
BEGIN
  SELECT rfq_id, is_simulated
  INTO v_request
  FROM public.rental_off_rent_requests
  WHERE id = NEW.off_rent_request_id;

  SELECT is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = NEW.rfq_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', NEW.rfq_id;
  END IF;

  IF v_request.rfq_id IS DISTINCT FROM NEW.rfq_id THEN
    RAISE EXCEPTION 'Readiness declaration must match its RFQ and off-rent request';
  END IF;

  IF NEW.is_simulated IS DISTINCT FROM v_request.is_simulated
     OR NEW.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Readiness declaration simulation scope does not match its RFQ and request';
  END IF;

  IF NEW.supersedes_readiness_declaration_id IS NOT NULL THEN
    SELECT off_rent_request_id, declaration_version
    INTO v_prior
    FROM public.rental_stop_readiness_declarations
    WHERE id = NEW.supersedes_readiness_declaration_id
    FOR KEY SHARE;

    IF NOT FOUND OR v_prior.off_rent_request_id <> NEW.off_rent_request_id
       OR v_prior.declaration_version <> NEW.declaration_version - 1 THEN
      RAISE EXCEPTION 'Superseding readiness declaration must reference the immediately prior request declaration';
    END IF;
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_readiness_declaration',
    NEW.id,
    NEW.rfq_id,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_readiness_declaration_contract
  BEFORE INSERT ON public.rental_stop_readiness_declarations
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_readiness_declaration();

CREATE OR REPLACE FUNCTION public.validate_rental_stop_evaluation_attempt()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.rental_requests AS rr
    WHERE rr.id = NEW.rfq_id
      AND rr.is_simulated = NEW.is_simulated
  ) THEN
    RAISE EXCEPTION 'Stop-evaluation attempt simulation scope does not match its RFQ';
  END IF;

  IF NEW.off_rent_request_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rental_off_rent_requests AS req
    WHERE req.id = NEW.off_rent_request_id
      AND req.rfq_id = NEW.rfq_id
      AND req.is_simulated = NEW.is_simulated
  ) THEN
    RAISE EXCEPTION 'Stop-evaluation attempt request does not match its RFQ and simulation scope';
  END IF;

  IF NEW.off_rent_acknowledgment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rental_off_rent_acknowledgments AS ack
    WHERE ack.id = NEW.off_rent_acknowledgment_id
      AND ack.rfq_id = NEW.rfq_id
      AND ack.is_simulated = NEW.is_simulated
  ) THEN
    RAISE EXCEPTION 'Stop-evaluation attempt acknowledgment does not match its RFQ and simulation scope';
  END IF;

  IF NEW.readiness_declaration_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rental_stop_readiness_declarations AS ready
    WHERE ready.id = NEW.readiness_declaration_id
      AND ready.rfq_id = NEW.rfq_id
      AND ready.is_simulated = NEW.is_simulated
  ) THEN
    RAISE EXCEPTION 'Stop-evaluation attempt readiness does not match its RFQ and simulation scope';
  END IF;

  IF NEW.term_snapshot_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rental_stop_term_snapshots AS terms
    WHERE terms.id = NEW.term_snapshot_id
      AND terms.rfq_id = NEW.rfq_id
      AND terms.is_simulated = NEW.is_simulated
  ) THEN
    RAISE EXCEPTION 'Stop-evaluation attempt terms do not match its RFQ and simulation scope';
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_evaluation_attempt',
    NEW.id,
    NEW.rfq_id,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_evaluation_attempt_contract
  BEFORE INSERT ON public.rental_stop_evaluation_attempts
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_evaluation_attempt();

CREATE OR REPLACE FUNCTION public.validate_rental_stop_determination()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_request  record;
  v_ack      record;
  v_terms    record;
  v_rule     record;
  v_prior    record;
  v_ready    record;
  v_attempt  record;
  v_expected_stop_at timestamptz;
BEGIN
  SELECT rfq_id, requested_at, requested_stop_at, pickup_available_from, is_simulated
  INTO v_request
  FROM public.rental_off_rent_requests
  WHERE id = NEW.off_rent_request_id;

  IF NOT FOUND OR v_request.rfq_id <> NEW.rfq_id THEN
    RAISE EXCEPTION 'Stop determination requires the governed off-rent request for RFQ %', NEW.rfq_id;
  END IF;

  -- Execute optional-evidence queries unconditionally so their record shapes
  -- are defined even when the foreign key is NULL. PL/pgSQL cannot safely
  -- dereference a never-assigned generic record inside later boolean checks.
  SELECT rfq_id, off_rent_request_id, acknowledged_at, is_simulated
  INTO v_ack
  FROM public.rental_off_rent_acknowledgments
  WHERE id = NEW.off_rent_acknowledgment_id;

  IF NEW.off_rent_acknowledgment_id IS NOT NULL THEN
    IF NOT FOUND OR v_ack.rfq_id <> NEW.rfq_id
       OR v_ack.off_rent_request_id <> NEW.off_rent_request_id THEN
      RAISE EXCEPTION 'Stop determination acknowledgment does not belong to its request and RFQ';
    END IF;
  END IF;

  SELECT rfq_id, rule_version_id, currency_code, is_simulated
  INTO v_terms
  FROM public.rental_stop_term_snapshots
  WHERE id = NEW.term_snapshot_id;

  IF NOT FOUND OR v_terms.rfq_id <> NEW.rfq_id THEN
    RAISE EXCEPTION 'Stop determination requires an accepted term snapshot for RFQ %', NEW.rfq_id;
  END IF;

  SELECT trigger_basis, billing_treatment, evaluator_key, evaluator_version,
         evaluator_sha256, published_at
  INTO v_rule
  FROM public.rental_stop_rule_versions
  WHERE id = v_terms.rule_version_id;

  IF v_rule.trigger_basis = 'unknown' OR v_rule.billing_treatment = 'unknown' THEN
    RAISE EXCEPTION 'Stop determination is blocked while contractual trigger or billing treatment is UNKNOWN';
  END IF;

  IF v_rule.published_at > NEW.determined_at THEN
    RAISE EXCEPTION 'Stop determination cannot use a rule before its publication time';
  END IF;

  IF NEW.evaluator_key IS DISTINCT FROM v_rule.evaluator_key
     OR NEW.evaluator_version IS DISTINCT FROM v_rule.evaluator_version
     OR NEW.evaluator_sha256 IS DISTINCT FROM v_rule.evaluator_sha256 THEN
    RAISE EXCEPTION 'Stop determination evaluator identity must match the accepted rule version';
  END IF;

  SELECT rfq_id, off_rent_request_id, ready_at, is_simulated
  INTO v_ready
  FROM public.rental_stop_readiness_declarations
  WHERE id = NEW.readiness_declaration_id;

  IF NEW.readiness_declaration_id IS NOT NULL THEN
    IF NOT FOUND OR v_ready.rfq_id <> NEW.rfq_id
       OR v_ready.off_rent_request_id <> NEW.off_rent_request_id THEN
      RAISE EXCEPTION 'Stop determination readiness declaration does not belong to its request and RFQ';
    END IF;
  END IF;

  CASE v_rule.trigger_basis
    WHEN 'request_received' THEN
      v_expected_stop_at := v_request.requested_at;
    WHEN 'requested_stop' THEN
      v_expected_stop_at := v_request.requested_stop_at;
    WHEN 'verified_readiness' THEN
      IF NEW.readiness_declaration_id IS NULL OR v_ready.ready_at IS NULL THEN
        RAISE EXCEPTION 'Verified-readiness trigger requires a readiness declaration with ready_at';
      END IF;
      v_expected_stop_at := v_ready.ready_at;
    WHEN 'vendor_acknowledgment' THEN
      IF NEW.off_rent_acknowledgment_id IS NULL THEN
        RAISE EXCEPTION 'Vendor-acknowledgment trigger requires the governed acknowledgment';
      END IF;
      v_expected_stop_at := v_ack.acknowledged_at;
    WHEN 'pickup_available' THEN
      v_expected_stop_at := v_request.pickup_available_from;
    WHEN 'physical_pickup' THEN
      RAISE EXCEPTION 'Physical-pickup determination is blocked until governed pickup evidence exists';
    WHEN 'contract_specific' THEN
      RAISE EXCEPTION 'Contract-specific stop trigger is blocked until its approved evaluator exists';
    ELSE
      RAISE EXCEPTION 'Unsupported stop trigger basis: %', v_rule.trigger_basis;
  END CASE;

  IF NEW.stop_effective_at IS DISTINCT FROM v_expected_stop_at THEN
    RAISE EXCEPTION 'Stop effective timestamp must equal the evidence selected by the accepted trigger rule';
  END IF;

  IF v_rule.billing_treatment = 'exact_timestamp' THEN
    IF NEW.billable_through_at IS DISTINCT FROM NEW.stop_effective_at THEN
      RAISE EXCEPTION 'Exact-timestamp billing requires billable-through to equal stop-effective';
    END IF;
  ELSE
    RAISE EXCEPTION 'Billing treatment % is blocked until its approved deterministic evaluator exists',
      v_rule.billing_treatment;
  END IF;

  IF NEW.currency_code <> v_terms.currency_code THEN
    RAISE EXCEPTION 'Stop determination currency must match the accepted term snapshot';
  END IF;

  SELECT rfq_id, off_rent_request_id, off_rent_acknowledgment_id,
         readiness_declaration_id, term_snapshot_id, evaluator_key,
         evaluator_version, evaluator_sha256, outcome, is_simulated
  INTO v_attempt
  FROM public.rental_stop_evaluation_attempts
  WHERE id = NEW.evaluation_attempt_id;

  IF NOT FOUND OR v_attempt.outcome <> 'complete'
     OR v_attempt.rfq_id <> NEW.rfq_id
     OR v_attempt.off_rent_request_id IS DISTINCT FROM NEW.off_rent_request_id
     OR v_attempt.off_rent_acknowledgment_id IS DISTINCT FROM NEW.off_rent_acknowledgment_id
     OR v_attempt.readiness_declaration_id IS DISTINCT FROM NEW.readiness_declaration_id
     OR v_attempt.term_snapshot_id IS DISTINCT FROM NEW.term_snapshot_id
     OR v_attempt.evaluator_key IS DISTINCT FROM NEW.evaluator_key
     OR v_attempt.evaluator_version IS DISTINCT FROM NEW.evaluator_version
     OR v_attempt.evaluator_sha256 IS DISTINCT FROM NEW.evaluator_sha256
     OR v_attempt.is_simulated IS DISTINCT FROM NEW.is_simulated THEN
    RAISE EXCEPTION 'Stop determination must match its completed evaluation attempt';
  END IF;

  IF NEW.is_simulated IS DISTINCT FROM v_request.is_simulated
     OR NEW.is_simulated IS DISTINCT FROM v_terms.is_simulated
     OR (NEW.off_rent_acknowledgment_id IS NOT NULL
       AND NEW.is_simulated IS DISTINCT FROM v_ack.is_simulated)
     OR (NEW.readiness_declaration_id IS NOT NULL
       AND NEW.is_simulated IS DISTINCT FROM v_ready.is_simulated) THEN
    RAISE EXCEPTION 'Stop determination simulation scope does not match its evidence';
  END IF;

  IF NEW.supersedes_determination_id IS NOT NULL THEN
    SELECT rfq_id, determination_version
    INTO v_prior
    FROM public.rental_stop_determinations
    WHERE id = NEW.supersedes_determination_id;

    IF NOT FOUND OR v_prior.rfq_id <> NEW.rfq_id
       OR v_prior.determination_version <> NEW.determination_version - 1 THEN
      RAISE EXCEPTION 'Superseding determination must reference the immediately prior RFQ determination';
    END IF;
  END IF;

  PERFORM public.assert_rental_clock_audit_event(
    NEW.audit_event_id,
    'rental_stop_determination',
    NEW.id,
    NEW.rfq_id,
    NEW.is_simulated,
    NEW.correlation_id
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_stop_determination_contract
  BEFORE INSERT ON public.rental_stop_determinations
  FOR EACH ROW EXECUTE FUNCTION public.validate_rental_stop_determination();

REVOKE EXECUTE ON FUNCTION public.reject_rental_clock_immutable_change()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.assert_rental_clock_audit_event(uuid, text, uuid, uuid, boolean, uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_evaluator_version()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_rule_version()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_term_snapshot()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_readiness_declaration()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_evaluation_attempt()
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.validate_rental_stop_determination()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.rental_stop_platform_publisher(p_actor_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles AS ur
    WHERE ur.user_id = p_actor_id
      AND ur.role IN ('admin'::public.app_role, 'manager'::public.app_role)
  )
$$;

CREATE OR REPLACE FUNCTION public.rental_stop_actor_authority(
  p_actor_id uuid,
  p_rfq_id uuid
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq record;
BEGIN
  IF public.rental_stop_platform_publisher(p_actor_id) THEN
    RETURN 'platform_operations';
  END IF;

  SELECT customer_id, customer_organization_id
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id;

  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  IF v_rfq.customer_id = p_actor_id OR EXISTS (
    SELECT 1
    FROM public.organization_memberships AS om
    WHERE om.user_id = p_actor_id
      AND om.organization_id = v_rfq.customer_organization_id
      AND om.archived_at IS NULL
      AND om.role IN ('owner', 'admin', 'member')
  ) THEN
    RETURN 'customer_relationship';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.vendor_quote_responses AS quote
    JOIN public.organization_memberships AS om
      ON om.organization_id = quote.vendor_organization_id
     AND om.user_id = p_actor_id
     AND om.archived_at IS NULL
     AND om.role IN ('owner', 'admin', 'member')
    WHERE quote.rfq_id = p_rfq_id
      AND quote.status = 'accepted'
  ) THEN
    RETURN 'accepted_vendor_relationship';
  END IF;

  RETURN NULL;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.rental_stop_platform_publisher(uuid)
  FROM PUBLIC, anon, authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.rental_stop_actor_authority(uuid, uuid)
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.publish_rental_stop_evaluator_version(
  p_actor_id uuid,
  p_evaluator_key text,
  p_artifact_sha256 text,
  p_source_kind text,
  p_source_reference text,
  p_source_sha256 text,
  p_supported_trigger_bases text[],
  p_billing_treatment text,
  p_definition jsonb,
  p_lifecycle_state text,
  p_effective_from timestamptz,
  p_effective_until timestamptz,
  p_is_simulated boolean,
  p_idempotency_key text,
  p_expected_predecessor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing record;
  v_prior record;
  v_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_version integer;
BEGIN
  IF NOT public.rental_stop_platform_publisher(p_actor_id) THEN
    RAISE EXCEPTION 'Actor % lacks technical rental-stop evaluator publication authority', p_actor_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT p_is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot publish a non-simulated evaluator', p_actor_id;
  END IF;

  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain between 8 and 200 characters';
  END IF;

  IF p_effective_from IS NULL
     OR (p_effective_until IS NOT NULL AND p_effective_until <= p_effective_from) THEN
    RAISE EXCEPTION 'Evaluator effective interval is invalid';
  END IF;

  IF p_source_kind <> 'backend_artifact'
     OR p_source_reference IS NULL
     OR length(btrim(p_source_reference)) NOT BETWEEN 3 AND 500
     OR p_source_sha256 IS NULL
     OR p_source_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Evaluator publication requires a backend artifact source reference and SHA-256 digest';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rental-stop-evaluator:' || coalesce(p_evaluator_key, ''), 0)
  );

  SELECT id, evaluator_version, correlation_id
  INTO v_existing
  FROM public.rental_stop_evaluator_versions
  WHERE evaluator_key = p_evaluator_key
    AND idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'published',
      'evaluator_version_id', v_existing.id,
      'evaluator_version', v_existing.evaluator_version,
      'correlation_id', v_existing.correlation_id,
      'idempotent_replay', true
    );
  END IF;

  SELECT id, evaluator_version
  INTO v_prior
  FROM public.rental_stop_evaluator_versions
  WHERE evaluator_key = p_evaluator_key
  ORDER BY evaluator_version DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prior.id IS DISTINCT FROM p_expected_predecessor_id THEN
    RAISE EXCEPTION 'Evaluator predecessor conflict for %', p_evaluator_key;
  END IF;

  v_version := coalesce(v_prior.evaluator_version, 0) + 1;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id := v_correlation_id,
    p_entity_type := 'rental_stop_evaluator_version',
    p_entity_id := v_id,
    p_event_type := 'stoprent.evaluator_published',
    p_event_category := 'billing',
    p_actor_id := p_actor_id,
    p_actor_role := 'platform_operations',
    p_actor_type := 'user',
    p_new_value := jsonb_build_object(
      'evaluator_key', p_evaluator_key,
      'evaluator_version', v_version,
      'artifact_sha256', p_artifact_sha256,
      'source_kind', p_source_kind,
      'source_reference', p_source_reference,
      'source_sha256', p_source_sha256,
      'lifecycle_state', p_lifecycle_state,
      'effective_from', p_effective_from,
      'effective_until', p_effective_until
    ),
    p_reason := 'Published an immutable evaluator artifact version',
    p_source := 'admin_action',
    p_is_simulated := p_is_simulated,
    p_metadata := jsonb_build_object(
      'predecessor_evaluator_version_id', v_prior.id,
      'supported_trigger_bases', p_supported_trigger_bases,
      'billing_treatment', p_billing_treatment
    )
  );

  INSERT INTO public.rental_stop_evaluator_versions (
    id, evaluator_key, evaluator_version, predecessor_evaluator_version_id,
    artifact_sha256, source_kind, source_reference, source_sha256,
    supported_trigger_bases, billing_treatment, definition,
    lifecycle_state, effective_from, effective_until, published_by,
    correlation_id, idempotency_key, audit_event_id, is_simulated
  ) VALUES (
    v_id, p_evaluator_key, v_version, v_prior.id, p_artifact_sha256,
    p_source_kind, btrim(p_source_reference), p_source_sha256,
    p_supported_trigger_bases, p_billing_treatment, p_definition,
    p_lifecycle_state, p_effective_from, p_effective_until, p_actor_id,
    v_correlation_id, btrim(p_idempotency_key), v_audit_event_id, p_is_simulated
  );

  RETURN jsonb_build_object(
    'status', 'published',
    'evaluator_version_id', v_id,
    'evaluator_version', v_version,
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_rental_stop_evaluator_version(
  uuid, text, text, text, text, text, text[], text, jsonb, text, timestamptz, timestamptz,
  boolean, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_rental_stop_evaluator_version(
  uuid, text, text, text, text, text, text[], text, jsonb, text, timestamptz, timestamptz,
  boolean, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.publish_rental_stop_rule_version(
  p_actor_id uuid,
  p_rule_code text,
  p_display_name text,
  p_visibility text,
  p_customer_organization_id uuid,
  p_vendor_organization_id uuid,
  p_trigger_basis text,
  p_billing_treatment text,
  p_evaluator_key text,
  p_evaluator_version integer,
  p_evaluator_sha256 text,
  p_rule_parameters jsonb,
  p_source_kind text,
  p_source_reference text,
  p_source_sha256 text,
  p_effective_from timestamptz,
  p_effective_until timestamptz,
  p_is_simulated boolean,
  p_idempotency_key text,
  p_expected_predecessor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_existing record;
  v_prior record;
  v_customer_org record;
  v_vendor_org record;
  v_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_version integer;
  v_published_at timestamptz := now();
BEGIN
  IF NOT public.rental_stop_platform_publisher(p_actor_id) THEN
    RAISE EXCEPTION 'Actor % lacks technical rental-stop rule publication authority', p_actor_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT p_is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot publish a non-simulated rule', p_actor_id;
  END IF;

  -- Repository doctrine does not define unilateral platform billing-policy
  -- authority. Only evidence-backed contract, quote, or change-order sources
  -- can be represented; acceptance remains a separate customer command.
  IF p_source_kind = 'platform_policy' THEN
    RAISE EXCEPTION 'Platform stop-rent policy authority is UNKNOWN and fails closed';
  END IF;

  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain between 8 and 200 characters';
  END IF;

  IF p_effective_from IS NULL
     OR (p_effective_until IS NOT NULL AND p_effective_until <= p_effective_from) THEN
    RAISE EXCEPTION 'Rule effective interval is invalid';
  END IF;

  IF p_visibility = 'organization_pair' THEN
    SELECT org_type, archived_at, is_simulated
    INTO v_customer_org
    FROM public.organizations
    WHERE id = p_customer_organization_id;

    SELECT org_type, archived_at, is_simulated
    INTO v_vendor_org
    FROM public.organizations
    WHERE id = p_vendor_organization_id;

    IF v_customer_org.org_type NOT IN ('customer'::public.organization_type, 'both'::public.organization_type)
       OR v_vendor_org.org_type NOT IN ('vendor'::public.organization_type, 'both'::public.organization_type)
       OR v_customer_org.archived_at IS NOT NULL
       OR v_vendor_org.archived_at IS NOT NULL
       OR v_customer_org.is_simulated IS DISTINCT FROM p_is_simulated
       OR v_vendor_org.is_simulated IS DISTINCT FROM p_is_simulated THEN
      RAISE EXCEPTION 'Rule organization pair is invalid, archived, or has mismatched simulation scope';
    END IF;
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rental-stop-rule:' || coalesce(p_rule_code, ''), 0)
  );

  SELECT id, version, correlation_id
  INTO v_existing
  FROM public.rental_stop_rule_versions
  WHERE rule_code = p_rule_code
    AND idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'published',
      'rule_version_id', v_existing.id,
      'rule_version', v_existing.version,
      'correlation_id', v_existing.correlation_id,
      'idempotent_replay', true
    );
  END IF;

  SELECT id, version
  INTO v_prior
  FROM public.rental_stop_rule_versions
  WHERE rule_code = p_rule_code
  ORDER BY version DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prior.id IS DISTINCT FROM p_expected_predecessor_id THEN
    RAISE EXCEPTION 'Rule predecessor conflict for %', p_rule_code;
  END IF;

  v_version := coalesce(v_prior.version, 0) + 1;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id := v_correlation_id,
    p_entity_type := 'rental_stop_rule_version',
    p_entity_id := v_id,
    p_event_type := 'stoprent.rule_published',
    p_event_category := 'billing',
    p_actor_id := p_actor_id,
    p_actor_role := 'platform_operations',
    p_actor_type := 'user',
    p_new_value := jsonb_build_object(
      'rule_code', p_rule_code,
      'version', v_version,
      'trigger_basis', p_trigger_basis,
      'billing_treatment', p_billing_treatment,
      'source_kind', p_source_kind,
      'source_sha256', p_source_sha256,
      'effective_from', p_effective_from,
      'effective_until', p_effective_until
    ),
    p_reason := 'Published an immutable evidence-backed stop-rent rule representation',
    p_source := 'admin_action',
    p_is_simulated := p_is_simulated,
    p_related_customer_organization_id := p_customer_organization_id,
    p_related_vendor_organization_id := p_vendor_organization_id,
    p_metadata := jsonb_build_object(
      'predecessor_rule_version_id', v_prior.id,
      'evaluator_key', p_evaluator_key,
      'evaluator_version', p_evaluator_version,
      'evaluator_sha256', p_evaluator_sha256
    )
  );

  INSERT INTO public.rental_stop_rule_versions (
    id, rule_code, version, predecessor_rule_version_id, display_name,
    visibility, customer_organization_id, vendor_organization_id,
    trigger_basis, billing_treatment, evaluator_key, evaluator_version,
    evaluator_sha256, rule_parameters, source_kind, source_reference,
    source_sha256, published_at, effective_from, effective_until, created_by,
    correlation_id, idempotency_key, audit_event_id, is_simulated
  ) VALUES (
    v_id, p_rule_code, v_version, v_prior.id, p_display_name, p_visibility,
    p_customer_organization_id, p_vendor_organization_id, p_trigger_basis,
    p_billing_treatment, p_evaluator_key, p_evaluator_version,
    p_evaluator_sha256, p_rule_parameters, p_source_kind, p_source_reference,
    p_source_sha256, v_published_at, p_effective_from, p_effective_until,
    p_actor_id, v_correlation_id, btrim(p_idempotency_key), v_audit_event_id,
    p_is_simulated
  );

  RETURN jsonb_build_object(
    'status', 'published',
    'rule_version_id', v_id,
    'rule_version', v_version,
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.publish_rental_stop_rule_version(
  uuid, text, text, text, uuid, uuid, text, text, text, integer, text,
  jsonb, text, text, text, timestamptz, timestamptz, boolean, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.publish_rental_stop_rule_version(
  uuid, text, text, text, uuid, uuid, text, text, text, integer, text,
  jsonb, text, text, text, timestamptz, timestamptz, boolean, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.accept_rental_stop_term_snapshot(
  p_actor_id uuid,
  p_rfq_id uuid,
  p_accepted_quote_id uuid,
  p_rule_version_id uuid,
  p_time_zone text,
  p_currency_code text,
  p_terms_payload jsonb,
  p_terms_sha256 text,
  p_idempotency_key text,
  p_expected_supersedes_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq record;
  v_quote record;
  v_rule record;
  v_existing record;
  v_prior record;
  v_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_version integer;
BEGIN
  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain between 8 and 200 characters';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rental-stop-terms:' || p_rfq_id::text, 0)
  );

  SELECT id, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot accept terms for non-simulated RFQ %', p_actor_id, p_rfq_id;
  END IF;

  SELECT id, rfq_id, vendor_organization_id, status, accepted_by,
         accepted_at, is_simulated
  INTO v_quote
  FROM public.vendor_quote_responses
  WHERE id = p_accepted_quote_id
  FOR KEY SHARE;

  IF NOT FOUND OR v_quote.rfq_id <> p_rfq_id OR v_quote.status <> 'accepted' THEN
    RAISE EXCEPTION 'Stop-term snapshot requires the accepted quote for RFQ %', p_rfq_id;
  END IF;

  IF v_quote.accepted_by IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Only the recorded quote accepter may bind the stop-rent term snapshot';
  END IF;

  IF v_quote.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Accepted quote simulation scope does not match RFQ %', p_rfq_id;
  END IF;

  SELECT id, visibility, customer_organization_id, vendor_organization_id,
         published_at, effective_from, effective_until, is_simulated
  INTO v_rule
  FROM public.rental_stop_rule_versions
  WHERE id = p_rule_version_id
  FOR KEY SHARE;

  IF NOT FOUND
     OR v_rule.is_simulated IS DISTINCT FROM v_rfq.is_simulated
     OR v_rule.published_at > v_quote.accepted_at
     OR v_rule.effective_from > v_quote.accepted_at
     OR (v_rule.effective_until IS NOT NULL AND v_rule.effective_until <= v_quote.accepted_at) THEN
    RAISE EXCEPTION 'Stop-rule version was not valid for this quote acceptance';
  END IF;

  IF v_rule.visibility = 'organization_pair'
     AND (v_rule.customer_organization_id IS DISTINCT FROM v_rfq.customer_organization_id
       OR v_rule.vendor_organization_id IS DISTINCT FROM v_quote.vendor_organization_id) THEN
    RAISE EXCEPTION 'Stop-rule version is not authorized for the accepted customer/vendor pair';
  END IF;

  SELECT id, snapshot_version, correlation_id
  INTO v_existing
  FROM public.rental_stop_term_snapshots
  WHERE rfq_id = p_rfq_id
    AND idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'accepted',
      'term_snapshot_id', v_existing.id,
      'snapshot_version', v_existing.snapshot_version,
      'correlation_id', v_existing.correlation_id,
      'idempotent_replay', true
    );
  END IF;

  SELECT id, snapshot_version
  INTO v_prior
  FROM public.rental_stop_term_snapshots
  WHERE rfq_id = p_rfq_id
  ORDER BY snapshot_version DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prior.id IS DISTINCT FROM p_expected_supersedes_id THEN
    RAISE EXCEPTION 'Term snapshot predecessor conflict for RFQ %', p_rfq_id;
  END IF;

  v_version := coalesce(v_prior.snapshot_version, 0) + 1;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id := v_correlation_id,
    p_entity_type := 'rental_stop_term_snapshot',
    p_entity_id := v_id,
    p_event_type := 'stoprent.terms_accepted',
    p_event_category := 'billing',
    p_actor_id := p_actor_id,
    p_actor_role := 'customer_quote_accepter',
    p_actor_type := 'user',
    p_new_value := jsonb_build_object(
      'rfq_id', p_rfq_id,
      'accepted_quote_id', p_accepted_quote_id,
      'rule_version_id', p_rule_version_id,
      'snapshot_version', v_version,
      'terms_sha256', p_terms_sha256
    ),
    p_reason := 'Bound accepted quote terms to an immutable stop-rent rule version',
    p_source := 'customer_action',
    p_is_simulated := v_rfq.is_simulated,
    p_related_rfq_id := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id := v_quote.vendor_organization_id,
    p_metadata := jsonb_build_object('supersedes_term_snapshot_id', v_prior.id)
  );

  INSERT INTO public.rental_stop_term_snapshots (
    id, rfq_id, accepted_quote_id, rule_version_id, snapshot_version,
    supersedes_term_snapshot_id, time_zone, currency_code, terms_payload,
    terms_sha256, accepted_at, accepted_by, correlation_id, idempotency_key,
    audit_event_id, is_simulated
  ) VALUES (
    v_id, p_rfq_id, p_accepted_quote_id, p_rule_version_id, v_version,
    v_prior.id, p_time_zone, upper(p_currency_code), p_terms_payload,
    p_terms_sha256, v_quote.accepted_at, p_actor_id, v_correlation_id,
    btrim(p_idempotency_key), v_audit_event_id, v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'status', 'accepted',
    'term_snapshot_id', v_id,
    'snapshot_version', v_version,
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.accept_rental_stop_term_snapshot(
  uuid, uuid, uuid, uuid, text, text, jsonb, text, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_rental_stop_term_snapshot(
  uuid, uuid, uuid, uuid, text, text, jsonb, text, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.record_rental_stop_readiness_declaration(
  p_actor_id uuid,
  p_rfq_id uuid,
  p_off_rent_request_id uuid,
  p_ready_at timestamptz,
  p_equipment_location text,
  p_isolation_state text,
  p_drained_state text,
  p_safe_access_state text,
  p_operating_state text,
  p_component_manifest jsonb,
  p_evidence_refs jsonb,
  p_notes text,
  p_declaration_sha256 text,
  p_idempotency_key text,
  p_expected_supersedes_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq record;
  v_request record;
  v_existing record;
  v_prior record;
  v_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_audit_event_id uuid;
  v_version integer;
BEGIN
  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain between 8 and 200 characters';
  END IF;

  IF p_declaration_sha256 IS NULL
     OR p_declaration_sha256 !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'Readiness declaration requires a full SHA-256 digest';
  END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('rental-stop-readiness:' || p_off_rent_request_id::text, 0)
  );

  SELECT id, operational_status, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  IF v_rfq.operational_status NOT IN (
    'off_rent_requested'::public.app_rfq_status,
    'demobilizing'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'Readiness may be declared only after a governed off-rent request';
  END IF;

  SELECT id, rfq_id, requested_by, requested_at, is_simulated
  INTO v_request
  FROM public.rental_off_rent_requests
  WHERE id = p_off_rent_request_id
  FOR KEY SHARE;

  IF NOT FOUND OR v_request.rfq_id <> p_rfq_id THEN
    RAISE EXCEPTION 'Readiness declaration must match its RFQ and off-rent request';
  END IF;

  IF v_request.requested_by IS DISTINCT FROM p_actor_id THEN
    RAISE EXCEPTION 'Only the recorded customer off-rent requester may declare readiness';
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot declare readiness for non-simulated RFQ %', p_actor_id, p_rfq_id;
  END IF;

  IF v_request.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Readiness request simulation scope does not match RFQ %', p_rfq_id;
  END IF;

  IF p_ready_at IS NOT NULL AND p_ready_at < v_request.requested_at THEN
    RAISE EXCEPTION 'ready_at cannot be before the governed off-rent request';
  END IF;

  SELECT id, declaration_version, correlation_id
  INTO v_existing
  FROM public.rental_stop_readiness_declarations
  WHERE off_rent_request_id = p_off_rent_request_id
    AND idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    RETURN jsonb_build_object(
      'status', 'recorded',
      'readiness_declaration_id', v_existing.id,
      'declaration_version', v_existing.declaration_version,
      'correlation_id', v_existing.correlation_id,
      'idempotent_replay', true
    );
  END IF;

  SELECT id, declaration_version
  INTO v_prior
  FROM public.rental_stop_readiness_declarations
  WHERE off_rent_request_id = p_off_rent_request_id
  ORDER BY declaration_version DESC
  LIMIT 1
  FOR UPDATE;

  IF v_prior.id IS DISTINCT FROM p_expected_supersedes_id THEN
    RAISE EXCEPTION 'Readiness predecessor conflict for off-rent request %', p_off_rent_request_id;
  END IF;

  v_version := coalesce(v_prior.declaration_version, 0) + 1;

  v_audit_event_id := public.log_audit_event(
    p_correlation_id := v_correlation_id,
    p_entity_type := 'rental_stop_readiness_declaration',
    p_entity_id := v_id,
    p_event_type := 'stoprent.readiness_declared',
    p_event_category := 'inspection',
    p_actor_id := p_actor_id,
    p_actor_role := 'customer_off_rent_requester',
    p_actor_type := 'user',
    p_new_value := jsonb_build_object(
      'rfq_id', p_rfq_id,
      'off_rent_request_id', p_off_rent_request_id,
      'declaration_version', v_version,
      'ready_at', p_ready_at,
      'isolation_state', p_isolation_state,
      'drained_state', p_drained_state,
      'safe_access_state', p_safe_access_state,
      'operating_state', p_operating_state
      ,'declaration_sha256', p_declaration_sha256
    ),
    p_reason := nullif(btrim(p_notes), ''),
    p_source := 'customer_action',
    p_is_simulated := v_rfq.is_simulated,
    p_related_rfq_id := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata := jsonb_build_object(
      'supersedes_readiness_declaration_id', v_prior.id,
      'component_count', jsonb_array_length(p_component_manifest),
      'evidence_reference_count', jsonb_array_length(p_evidence_refs)
    )
  );

  INSERT INTO public.rental_stop_readiness_declarations (
    id, rfq_id, off_rent_request_id, declaration_version,
    supersedes_readiness_declaration_id, declared_by, ready_at,
    equipment_location, isolation_state, drained_state, safe_access_state,
    operating_state, component_manifest, evidence_refs, notes, correlation_id,
    declaration_sha256, idempotency_key, audit_event_id, is_simulated
  ) VALUES (
    v_id, p_rfq_id, p_off_rent_request_id, v_version, v_prior.id, p_actor_id,
    p_ready_at, nullif(btrim(p_equipment_location), ''), p_isolation_state,
    p_drained_state, p_safe_access_state, p_operating_state,
    p_component_manifest, p_evidence_refs, nullif(btrim(p_notes), ''),
    v_correlation_id, p_declaration_sha256, btrim(p_idempotency_key), v_audit_event_id,
    v_rfq.is_simulated
  );

  RETURN jsonb_build_object(
    'status', 'recorded',
    'readiness_declaration_id', v_id,
    'declaration_version', v_version,
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.record_rental_stop_readiness_declaration(
  uuid, uuid, uuid, timestamptz, text, text, text, text, text, jsonb, jsonb,
  text, text, text, uuid
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_rental_stop_readiness_declaration(
  uuid, uuid, uuid, timestamptz, text, text, text, text, text, jsonb, jsonb,
  text, text, text, uuid
) TO service_role;

CREATE OR REPLACE FUNCTION public.enforce_governed_off_rent_transition()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_determination_id_text text;
  v_determination_id uuid;
BEGIN
  IF NEW.operational_status = 'off_rent'::public.app_rfq_status
     AND (
       OLD.operational_status IS DISTINCT FROM NEW.operational_status
       OR OLD.off_rent_at IS DISTINCT FROM NEW.off_rent_at
     ) THEN
    v_determination_id_text := current_setting(
      'app.rental_stop_determination_id',
      true
    );

    IF v_determination_id_text IS NULL OR v_determination_id_text = '' THEN
      RAISE EXCEPTION 'demobilizing -> off_rent requires the governed rental-stop command';
    END IF;

    BEGIN
      v_determination_id := v_determination_id_text::uuid;
    EXCEPTION WHEN invalid_text_representation THEN
      RAISE EXCEPTION 'Invalid governed rental-stop determination context';
    END;

    IF OLD.operational_status <> 'demobilizing'::public.app_rfq_status
       OR NOT EXISTS (
         SELECT 1
         FROM public.rental_stop_determinations AS determination
         WHERE determination.id = v_determination_id
           AND determination.rfq_id = NEW.id
           AND determination.stop_effective_at = NEW.off_rent_at
       ) THEN
      RAISE EXCEPTION 'off_rent state and timestamp must match a governed rental-stop determination';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER rental_requests_governed_off_rent_transition
  BEFORE UPDATE OF operational_status, off_rent_at ON public.rental_requests
  FOR EACH ROW EXECUTE FUNCTION public.enforce_governed_off_rent_transition();

REVOKE EXECUTE ON FUNCTION public.enforce_governed_off_rent_transition()
  FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.determine_rental_stop_and_transition(
  p_rfq_id uuid,
  p_actor_id uuid,
  p_idempotency_key text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_rfq record;
  v_request record;
  v_ack record;
  v_terms record;
  v_ready record;
  v_existing record;
  v_prior record;
  v_attempt_id uuid := gen_random_uuid();
  v_determination_id uuid := gen_random_uuid();
  v_correlation_id uuid := gen_random_uuid();
  v_attempt_event_id uuid;
  v_determination_event_id uuid;
  v_transition_event_id uuid;
  v_blocker_code text;
  v_blocker_detail text;
  v_stop_effective_at timestamptz;
  v_determination_version integer;
  v_evidence jsonb;
  v_result jsonb;
  v_initiation_authority text;
BEGIN
  IF p_idempotency_key IS NULL
     OR length(btrim(p_idempotency_key)) NOT BETWEEN 8 AND 200 THEN
    RAISE EXCEPTION 'Idempotency key must contain between 8 and 200 characters';
  END IF;

  -- The RFQ row is the serialization boundary for all stop-clock attempts.
  SELECT id, operational_status, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  IF public.is_demo_actor(p_actor_id) AND NOT v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Demo actor % cannot initiate determination for non-simulated RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  v_initiation_authority := public.rental_stop_actor_authority(p_actor_id, p_rfq_id);
  IF v_initiation_authority IS NULL THEN
    RAISE EXCEPTION 'Actor % lacks an authorized relationship to initiate stop-rent determination for RFQ %',
      p_actor_id, p_rfq_id;
  END IF;

  SELECT attempt.id, attempt.outcome, attempt.blocker_code,
         attempt.blocker_detail, attempt.correlation_id,
         attempt.initiated_by,
         determination.id AS determination_id,
         determination.stop_effective_at,
         determination.billable_through_at
  INTO v_existing
  FROM public.rental_stop_evaluation_attempts AS attempt
  LEFT JOIN public.rental_stop_determinations AS determination
    ON determination.evaluation_attempt_id = attempt.id
  WHERE attempt.rfq_id = p_rfq_id
    AND attempt.idempotency_key = btrim(p_idempotency_key);

  IF FOUND THEN
    IF v_existing.initiated_by IS DISTINCT FROM p_actor_id THEN
      RAISE EXCEPTION 'Idempotency key belongs to a different initiating actor';
    END IF;

    RETURN jsonb_strip_nulls(jsonb_build_object(
      'status', v_existing.outcome,
      'attempt_id', v_existing.id,
      'determination_id', v_existing.determination_id,
      'correlation_id', v_existing.correlation_id,
      'blocker_code', v_existing.blocker_code,
      'blocker_detail', v_existing.blocker_detail,
      'stop_effective_at', v_existing.stop_effective_at,
      'billable_through_at', v_existing.billable_through_at,
      'idempotent_replay', true
    ));
  END IF;

  SELECT id, requested_at, requested_stop_at, pickup_available_from, is_simulated
  INTO v_request
  FROM public.rental_off_rent_requests
  WHERE rfq_id = p_rfq_id;

  SELECT id, off_rent_request_id, vendor_organization_id, acknowledged_at, is_simulated
  INTO v_ack
  FROM public.rental_off_rent_acknowledgments
  WHERE rfq_id = p_rfq_id;

  SELECT terms.id, terms.rule_version_id, terms.currency_code, terms.is_simulated,
         rule.trigger_basis, rule.billing_treatment, rule.evaluator_key,
         rule.evaluator_version, rule.evaluator_sha256, rule.published_at,
         rule.effective_from, rule.effective_until,
         evaluator.supported_trigger_bases, evaluator.billing_treatment AS evaluator_billing_treatment,
         evaluator.lifecycle_state AS evaluator_lifecycle_state,
         evaluator.effective_from AS evaluator_effective_from,
         evaluator.effective_until AS evaluator_effective_until,
         quote.vendor_organization_id
  INTO v_terms
  FROM public.rental_stop_term_snapshots AS terms
  JOIN public.rental_stop_rule_versions AS rule
    ON rule.id = terms.rule_version_id
  JOIN public.vendor_quote_responses AS quote
    ON quote.id = terms.accepted_quote_id
  LEFT JOIN public.rental_stop_evaluator_versions AS evaluator
    ON evaluator.evaluator_key = rule.evaluator_key
   AND evaluator.evaluator_version = rule.evaluator_version
   AND evaluator.artifact_sha256 = rule.evaluator_sha256
  WHERE terms.rfq_id = p_rfq_id
  ORDER BY terms.snapshot_version DESC
  LIMIT 1;

  SELECT id, ready_at, isolation_state, drained_state, safe_access_state,
         operating_state, is_simulated
  INTO v_ready
  FROM public.rental_stop_readiness_declarations
  WHERE off_rent_request_id = v_request.id
  ORDER BY declaration_version DESC
  LIMIT 1;

  v_evidence := jsonb_strip_nulls(jsonb_build_object(
    'rfq_id', p_rfq_id,
    'off_rent_request_id', v_request.id,
    'request_received_at', v_request.requested_at,
    'requested_stop_at', v_request.requested_stop_at,
    'pickup_available_from', v_request.pickup_available_from,
    'off_rent_acknowledgment_id', v_ack.id,
    'vendor_acknowledged_at', v_ack.acknowledged_at,
    'readiness_declaration_id', v_ready.id,
    'verified_ready_at', v_ready.ready_at,
    'term_snapshot_id', v_terms.id,
    'rule_version_id', v_terms.rule_version_id,
    'trigger_basis', v_terms.trigger_basis,
    'billing_treatment', v_terms.billing_treatment
    ,'initiated_by', p_actor_id
    ,'initiation_authority', v_initiation_authority
  ));

  IF v_rfq.operational_status <> 'demobilizing'::public.app_rfq_status THEN
    v_blocker_code := 'INVALID_STATE';
    v_blocker_detail := format(
      'RFQ must be demobilizing before stop-rent determination; current status is %s',
      v_rfq.operational_status
    );
  ELSIF v_request.id IS NULL THEN
    v_blocker_code := 'OFF_RENT_REQUEST_MISSING';
    v_blocker_detail := 'Governed off-rent request is missing';
  ELSIF v_ack.id IS NULL OR v_ack.off_rent_request_id IS DISTINCT FROM v_request.id THEN
    v_blocker_code := 'OFF_RENT_ACKNOWLEDGMENT_MISSING';
    v_blocker_detail := 'Governed accepted-vendor acknowledgment is missing or mismatched';
  ELSIF v_terms.id IS NULL THEN
    v_blocker_code := 'ACCEPTED_TERM_SNAPSHOT_MISSING';
    v_blocker_detail := 'No accepted stop-term snapshot is bound to this RFQ';
  ELSIF v_request.is_simulated IS DISTINCT FROM v_rfq.is_simulated
     OR v_ack.is_simulated IS DISTINCT FROM v_rfq.is_simulated
     OR v_terms.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Stop-rent evidence simulation scope does not match RFQ %', p_rfq_id;
  ELSIF v_terms.trigger_basis = 'unknown'
     OR v_terms.billing_treatment = 'unknown'
     OR v_terms.evaluator_key IS NULL THEN
    v_blocker_code := 'STOP_RULE_UNKNOWN';
    v_blocker_detail := 'Accepted terms do not define an executable stop-rent rule';
  ELSIF v_terms.published_at > now()
     OR v_terms.effective_from > now()
     OR (v_terms.effective_until IS NOT NULL AND v_terms.effective_until <= now())
     OR v_terms.evaluator_lifecycle_state IS DISTINCT FROM 'active'
     OR v_terms.evaluator_effective_from > now()
     OR (v_terms.evaluator_effective_until IS NOT NULL
       AND v_terms.evaluator_effective_until <= now()) THEN
    v_blocker_code := 'EVALUATOR_NOT_ACTIVE';
    v_blocker_detail := 'Accepted stop-rent evaluator is not active at determination time';
  ELSIF v_terms.billing_treatment <> 'exact_timestamp'
     OR v_terms.evaluator_billing_treatment <> 'exact_timestamp' THEN
    v_blocker_code := 'UNSUPPORTED_BILLING_TREATMENT';
    v_blocker_detail := format(
      'Billing treatment %s has no active deterministic command',
      v_terms.billing_treatment
    );
  ELSIF NOT (v_terms.trigger_basis = ANY(v_terms.supported_trigger_bases))
     OR v_terms.trigger_basis IN ('physical_pickup', 'contract_specific') THEN
    v_blocker_code := 'UNSUPPORTED_TRIGGER';
    v_blocker_detail := format(
      'Trigger basis %s has no active governed evidence evaluator',
      v_terms.trigger_basis
    );
  ELSE
    CASE v_terms.trigger_basis
      WHEN 'request_received' THEN
        v_stop_effective_at := v_request.requested_at;
      WHEN 'requested_stop' THEN
        v_stop_effective_at := v_request.requested_stop_at;
      WHEN 'vendor_acknowledgment' THEN
        v_stop_effective_at := v_ack.acknowledged_at;
      WHEN 'pickup_available' THEN
        v_stop_effective_at := v_request.pickup_available_from;
      WHEN 'verified_readiness' THEN
        IF v_ready.id IS NOT NULL
           AND v_ready.is_simulated IS NOT DISTINCT FROM v_rfq.is_simulated
           AND v_ready.ready_at IS NOT NULL
           AND v_ready.isolation_state IN ('confirmed', 'not_applicable')
           AND v_ready.drained_state IN ('confirmed', 'not_applicable')
           AND v_ready.safe_access_state IN ('confirmed', 'not_applicable')
           AND v_ready.operating_state IN ('confirmed', 'not_applicable') THEN
          v_stop_effective_at := v_ready.ready_at;
        END IF;
      ELSE
        v_stop_effective_at := NULL;
    END CASE;

    IF v_stop_effective_at IS NULL THEN
      v_blocker_code := 'MISSING_TRIGGER_EVIDENCE';
      v_blocker_detail := format(
        'Required governed evidence is incomplete for trigger basis %s',
        v_terms.trigger_basis
      );
    END IF;
  END IF;

  IF v_blocker_code IS NOT NULL THEN
    v_result := jsonb_build_object(
      'status', 'blocked',
      'blocker_code', v_blocker_code,
      'blocker_detail', v_blocker_detail
    );

    v_attempt_event_id := public.log_audit_event(
      p_correlation_id                   := v_correlation_id,
      p_entity_type                      := 'rental_stop_evaluation_attempt',
      p_entity_id                        := v_attempt_id,
      p_event_type                       := 'stoprent.determination_blocked',
      p_event_category                   := 'billing',
      p_actor_id                         := NULL,
      p_actor_role                       := 'rental_clock',
      p_actor_type                       := 'system',
      p_new_value                        := v_result,
      p_reason                           := v_blocker_detail,
      p_source                           := 'system',
      p_severity                         := 'blocker',
      p_is_simulated                     := v_rfq.is_simulated,
      p_related_rfq_id                   := p_rfq_id,
      p_related_customer_organization_id := v_rfq.customer_organization_id,
      p_related_vendor_organization_id   := v_ack.vendor_organization_id,
      p_metadata                         := v_evidence
    );

    INSERT INTO public.rental_stop_evaluation_attempts (
      id, rfq_id, off_rent_request_id, off_rent_acknowledgment_id,
      readiness_declaration_id, term_snapshot_id, evaluator_key,
      evaluator_version, evaluator_sha256, idempotency_key, initiated_by,
      initiation_authority, outcome,
      blocker_code, blocker_detail, evidence_snapshot, result_snapshot,
      correlation_id, audit_event_id, is_simulated
    ) VALUES (
      v_attempt_id, p_rfq_id, v_request.id, v_ack.id, v_ready.id, v_terms.id,
      v_terms.evaluator_key, v_terms.evaluator_version, v_terms.evaluator_sha256,
      btrim(p_idempotency_key), p_actor_id, v_initiation_authority, 'blocked',
      v_blocker_code, v_blocker_detail,
      v_evidence, v_result, v_correlation_id, v_attempt_event_id,
      v_rfq.is_simulated
    );

    RETURN v_result || jsonb_build_object(
      'attempt_id', v_attempt_id,
      'correlation_id', v_correlation_id,
      'idempotent_replay', false
    );
  END IF;

  v_result := jsonb_build_object(
    'status', 'complete',
    'stop_effective_at', v_stop_effective_at,
    'billable_through_at', v_stop_effective_at
  );

  v_attempt_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_stop_evaluation_attempt',
    p_entity_id                        := v_attempt_id,
    p_event_type                       := 'stoprent.rule_applied',
    p_event_category                   := 'billing',
    p_actor_id                         := NULL,
    p_actor_role                       := 'rental_clock',
    p_actor_type                       := 'system',
    p_new_value                        := v_result,
    p_reason                           := 'Active accepted stop-rent rule evaluated',
    p_source                           := 'system',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_ack.vendor_organization_id,
    p_metadata                         := v_evidence || jsonb_build_object(
                                             'evaluator_key', v_terms.evaluator_key,
                                             'evaluator_version', v_terms.evaluator_version,
                                             'evaluator_sha256', v_terms.evaluator_sha256
                                           )
  );

  INSERT INTO public.rental_stop_evaluation_attempts (
    id, rfq_id, off_rent_request_id, off_rent_acknowledgment_id,
    readiness_declaration_id, term_snapshot_id, evaluator_key,
    evaluator_version, evaluator_sha256, idempotency_key, initiated_by,
    initiation_authority, outcome,
    blocker_code, blocker_detail, evidence_snapshot, result_snapshot,
    correlation_id, audit_event_id, is_simulated
  ) VALUES (
    v_attempt_id, p_rfq_id, v_request.id, v_ack.id, v_ready.id, v_terms.id,
    v_terms.evaluator_key, v_terms.evaluator_version, v_terms.evaluator_sha256,
    btrim(p_idempotency_key), p_actor_id, v_initiation_authority, 'complete',
    NULL, NULL, v_evidence, v_result,
    v_correlation_id, v_attempt_event_id, v_rfq.is_simulated
  );

  SELECT id, determination_version
  INTO v_prior
  FROM public.rental_stop_determinations
  WHERE rfq_id = p_rfq_id
  ORDER BY determination_version DESC
  LIMIT 1
  FOR KEY SHARE;

  v_determination_version := COALESCE(v_prior.determination_version, 0) + 1;

  v_determination_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_stop_determination',
    p_entity_id                        := v_determination_id,
    p_event_type                       := 'stoprent.determined',
    p_event_category                   := 'billing',
    p_actor_id                         := NULL,
    p_actor_role                       := 'rental_clock',
    p_actor_type                       := 'system',
    p_new_value                        := v_result,
    p_reason                           := 'System determined contractual stop-rent timestamp',
    p_source                           := 'system',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_ack.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'evaluation_attempt_id', v_attempt_id,
                                             'term_snapshot_id', v_terms.id,
                                             'rule_version_id', v_terms.rule_version_id,
                                             'evaluator_key', v_terms.evaluator_key,
                                             'evaluator_version', v_terms.evaluator_version,
                                             'evaluator_sha256', v_terms.evaluator_sha256
                                           )
  );

  INSERT INTO public.rental_stop_determinations (
    id, rfq_id, off_rent_request_id, off_rent_acknowledgment_id,
    readiness_declaration_id, term_snapshot_id, evaluation_attempt_id,
    evaluator_key, evaluator_version, evaluator_sha256,
    determination_version, supersedes_determination_id, stop_effective_at,
    billable_through_at, exposure_ceiling_amount, currency_code,
    calculation_inputs, calculation_outputs, explanation, audit_event_id,
    correlation_id, is_simulated
  ) VALUES (
    v_determination_id, p_rfq_id, v_request.id, v_ack.id, v_ready.id,
    v_terms.id, v_attempt_id, v_terms.evaluator_key, v_terms.evaluator_version,
    v_terms.evaluator_sha256, v_determination_version, v_prior.id,
    v_stop_effective_at, v_stop_effective_at, NULL, v_terms.currency_code,
    v_evidence, v_result,
    format('Rule %s selected %s evidence and applied exact-timestamp billing',
      v_terms.rule_version_id, v_terms.trigger_basis),
    v_determination_event_id, v_correlation_id, v_rfq.is_simulated
  );

  v_transition_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := NULL,
    p_actor_role                       := 'rental_clock',
    p_actor_type                       := 'system',
    p_old_value                        := jsonb_build_object('operational_status', 'demobilizing'),
    p_new_value                        := jsonb_build_object(
                                             'operational_status', 'off_rent',
                                             'off_rent_at', v_stop_effective_at
                                           ),
    p_reason                           := 'Governed stop-rent determination completed',
    p_source                           := 'system',
    p_is_simulated                     := v_rfq.is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_related_vendor_organization_id   := v_ack.vendor_organization_id,
    p_metadata                         := jsonb_build_object(
                                             'determination_id', v_determination_id,
                                             'evaluation_attempt_id', v_attempt_id
                                           )
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, 'demobilizing', 'off_rent', NULL, 'rental_clock',
    'Governed stop-rent determination completed', v_correlation_id,
    v_transition_event_id, v_rfq.is_simulated
  );

  PERFORM set_config(
    'app.rental_stop_determination_id',
    v_determination_id::text,
    true
  );

  UPDATE public.rental_requests
  SET operational_status = 'off_rent',
      off_rent_at = v_stop_effective_at
  WHERE id = p_rfq_id
    AND operational_status = 'demobilizing';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ % changed state during stop-rent determination', p_rfq_id;
  END IF;

  RETURN v_result || jsonb_build_object(
    'attempt_id', v_attempt_id,
    'determination_id', v_determination_id,
    'correlation_id', v_correlation_id,
    'idempotent_replay', false
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.determine_rental_stop_and_transition(uuid, uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.determine_rental_stop_and_transition(uuid, uuid, text)
  TO service_role;

-- Deliberate stop condition: this migration adds no customer/vendor/API route
-- and seeds no contractual stop rule. Without an explicitly published rule and
-- accepted term snapshot the command records a governed blocker and does not
-- modify operational status, off_rent_at, or any invoice value.
