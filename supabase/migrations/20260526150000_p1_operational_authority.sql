-- P1-2: Operational Authority Layer
--
-- Establishes organization-based authority, RFQ state machine, immutable audit trail,
-- vendor quote lifecycle, and notification event infrastructure.
--
-- Authority order (ALLRENTZ_CONSTITUTION.md):
--   Layer 1 (Access)  — handled in P0-1
--   Layer 2 (Schema)  — this migration
--   Layer 3 (Event)   — audit_events, rfq_operational_status (this migration)
--   Layer 5 (State)   — app_rfq_status enum + transition_rfq_status() (this migration)
--   Layer 8 (Quote)   — vendor_quote_responses (this migration)
--
-- Depends on:
--   20260526095022_p0_demo_authority.sql     (is_demo on profiles)
--   20260526130000_1ee06554-...              (demo account backfill)
--
-- All rental_requests changes are additive (ADD COLUMN IF NOT EXISTS).
-- No destructive changes. No existing columns removed or modified.
-- Demo seed records: is_simulated = true, guarded by existence check.

-- ============================================================
-- SECTION 1: ENUMS
-- ============================================================

CREATE TYPE public.organization_type AS ENUM ('customer', 'vendor', 'both');

CREATE TYPE public.app_rfq_status AS ENUM (
  'draft',
  'submitted',
  'pending_vendor_review',
  'vendor_quote_received',
  'quote_accepted',
  'vendor_confirmed',
  'mobilizing',
  'in_transit',
  'on_rent',
  'rental_extended',
  'off_rent_requested',
  'demobilizing',
  'off_rent',
  'completed',
  'cancelled',
  'rejected'
);

-- ============================================================
-- SECTION 2: TABLES
-- All tables created before policies to avoid forward reference errors.
-- ============================================================

CREATE TABLE public.organizations (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                    text NOT NULL,
  org_type                public.organization_type NOT NULL,
  slug                    text UNIQUE,
  address                 text,
  city                    text,
  state                   text,
  phone                   text,
  primary_contact_user_id uuid REFERENCES auth.users ON DELETE SET NULL,
  verified                boolean NOT NULL DEFAULT false,
  is_simulated            boolean NOT NULL DEFAULT false,
  archived_at             timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.organization_memberships (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  role            text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  is_simulated    boolean NOT NULL DEFAULT false,
  archived_at     timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

ALTER TABLE public.rental_requests
  ADD COLUMN IF NOT EXISTS customer_organization_id uuid REFERENCES public.organizations ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS operational_status       public.app_rfq_status NOT NULL DEFAULT 'draft',
  ADD COLUMN IF NOT EXISTS is_simulated             boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS submitted_at             timestamptz,
  ADD COLUMN IF NOT EXISTS confirmed_at             timestamptz,
  ADD COLUMN IF NOT EXISTS on_rent_at               timestamptz,
  ADD COLUMN IF NOT EXISTS off_rent_at              timestamptz,
  ADD COLUMN IF NOT EXISTS closed_at                timestamptz;

CREATE TABLE public.audit_events (
  id                              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  correlation_id                  uuid NOT NULL,
  event_version                   integer NOT NULL DEFAULT 1,
  entity_type                     text NOT NULL,
  entity_id                       uuid NOT NULL,
  event_type                      text NOT NULL,
  event_category                  text NOT NULL CHECK (event_category IN (
    'rfq', 'vendor', 'compliance', 'billing', 'inspection', 'exception', 'system'
  )),
  actor_id                        uuid REFERENCES auth.users ON DELETE SET NULL,
  actor_role                      text,
  actor_type                      text NOT NULL CHECK (actor_type IN ('user', 'system', 'trigger')),
  old_value                       jsonb,
  new_value                       jsonb,
  reason                          text,
  source                          text NOT NULL CHECK (source IN (
    'customer_action', 'vendor_action', 'admin_action', 'system', 'smartmatch', 'migration'
  )),
  severity                        text NOT NULL DEFAULT 'info' CHECK (severity IN (
    'info', 'warning', 'blocker', 'critical'
  )),
  is_simulated                    boolean NOT NULL DEFAULT false,
  related_rfq_id                  uuid REFERENCES public.rental_requests ON DELETE SET NULL,
  related_customer_organization_id uuid REFERENCES public.organizations ON DELETE SET NULL,
  related_vendor_organization_id  uuid REFERENCES public.organizations ON DELETE SET NULL,
  related_equipment_id            uuid REFERENCES public.equipment ON DELETE SET NULL,
  metadata                        jsonb NOT NULL DEFAULT '{}',
  created_at                      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: audit events are immutable
);

CREATE TABLE public.rfq_operational_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id          uuid NOT NULL REFERENCES public.rental_requests ON DELETE CASCADE,
  previous_status public.app_rfq_status,
  new_status      public.app_rfq_status NOT NULL,
  transitioned_by uuid REFERENCES auth.users ON DELETE SET NULL,
  actor_role      text,
  reason          text,
  correlation_id  uuid NOT NULL,
  audit_event_id  uuid REFERENCES public.audit_events ON DELETE SET NULL,
  is_simulated    boolean NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
  -- No updated_at: status history is immutable
);

CREATE TABLE public.vendor_quote_responses (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rfq_id                  uuid NOT NULL REFERENCES public.rental_requests ON DELETE CASCADE,
  vendor_organization_id  uuid NOT NULL REFERENCES public.organizations ON DELETE RESTRICT,
  submitted_by            uuid NOT NULL REFERENCES auth.users ON DELETE RESTRICT,
  accepted_by             uuid REFERENCES auth.users ON DELETE SET NULL,
  rejected_by             uuid REFERENCES auth.users ON DELETE SET NULL,
  withdrawn_by            uuid REFERENCES auth.users ON DELETE SET NULL,
  equipment_id            uuid REFERENCES public.equipment ON DELETE SET NULL,
  version                 integer NOT NULL DEFAULT 1,
  status                  text NOT NULL DEFAULT 'pending' CHECK (status IN (
    'pending', 'submitted', 'revised', 'accepted', 'rejected', 'expired', 'withdrawn'
  )),
  daily_rate              numeric,
  delivery_fee            numeric,
  mobilization_fee        numeric,
  minimum_rental_days     integer,
  available_start_date    date,
  equipment_substitution  boolean NOT NULL DEFAULT false,
  substitution_notes      text,
  compliance_confirmed    boolean NOT NULL DEFAULT false,
  compliance_notes        text[] DEFAULT '{}',
  vendor_notes            text,
  response_deadline       timestamptz,
  submitted_at            timestamptz,
  accepted_at             timestamptz,
  rejected_at             timestamptz,
  is_simulated            boolean NOT NULL DEFAULT false,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rfq_id, vendor_organization_id, version)
);

CREATE TABLE public.notification_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  type                text NOT NULL,
  title               text NOT NULL,
  message             text,
  related_entity_type text,
  related_entity_id   uuid,
  audit_event_id      uuid REFERENCES public.audit_events ON DELETE SET NULL,
  correlation_id      uuid,
  channel             text NOT NULL DEFAULT 'in_app' CHECK (channel IN ('in_app', 'email', 'sms')),
  delivery_status     text NOT NULL DEFAULT 'pending' CHECK (delivery_status IN (
    'pending', 'delivered', 'read', 'failed'
  )),
  delivered_at        timestamptz,
  read_at             timestamptz,
  is_simulated        boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 3: ENABLE ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.organizations              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_memberships   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_events               ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rfq_operational_status     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_quote_responses     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_events        ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SECTION 4: REVOKE CLIENT WRITES ON IMMUTABLE TABLES
-- Hard wall — no client role can bypass this via a missing policy.
-- Writes flow only through SECURITY DEFINER functions (Edge Function gate).
-- ============================================================

REVOKE INSERT, UPDATE, DELETE ON public.audit_events           FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.rfq_operational_status FROM authenticated, anon;
-- notification_events: authenticated may update delivery_status; anon has no write path
REVOKE INSERT, DELETE ON public.notification_events            FROM authenticated, anon;
REVOKE UPDATE         ON public.notification_events            FROM anon;

-- ============================================================
-- SECTION 5: RLS POLICIES
-- All tables exist at this point — no forward reference errors.
-- ============================================================

-- organizations

CREATE POLICY "organizations_select"
  ON public.organizations FOR SELECT TO authenticated
  USING (archived_at IS NULL);

CREATE POLICY "organizations_service"
  ON public.organizations FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- organization_memberships

CREATE POLICY "memberships_select_own"
  ON public.organization_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND archived_at IS NULL);

CREATE POLICY "memberships_service"
  ON public.organization_memberships FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- audit_events: read-only for clients; own actor events or own org events

CREATE POLICY "audit_events_select"
  ON public.audit_events FOR SELECT TO authenticated
  USING (
    actor_id = auth.uid()
    OR related_customer_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
    )
    OR related_vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
    )
  );

CREATE POLICY "audit_events_service"
  ON public.audit_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- rfq_operational_status: read-only for clients
-- customers see their own RFQ transitions; vendors see via submitted quotes

CREATE POLICY "rfq_status_select"
  ON public.rfq_operational_status FOR SELECT TO authenticated
  USING (
    rfq_id IN (
      SELECT id FROM public.rental_requests
      WHERE customer_id = auth.uid()
    )
    OR rfq_id IN (
      SELECT rr.id
      FROM public.rental_requests rr
      JOIN public.vendor_quote_responses vqr ON vqr.rfq_id = rr.id
      JOIN public.organization_memberships om ON om.organization_id = vqr.vendor_organization_id
      WHERE om.user_id = auth.uid() AND om.archived_at IS NULL
    )
  );

CREATE POLICY "rfq_status_service"
  ON public.rfq_operational_status FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- vendor_quote_responses: vendors manage their org's responses; customers read

CREATE POLICY "vqr_select_vendor"
  ON public.vendor_quote_responses FOR SELECT TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
    )
  );

CREATE POLICY "vqr_insert_vendor"
  ON public.vendor_quote_responses FOR INSERT TO authenticated
  WITH CHECK (
    submitted_by = auth.uid()
    AND vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "vqr_update_vendor"
  ON public.vendor_quote_responses FOR UPDATE TO authenticated
  USING (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
  )
  WITH CHECK (
    vendor_organization_id IN (
      SELECT organization_id FROM public.organization_memberships
      WHERE user_id = auth.uid() AND archived_at IS NULL
        AND role IN ('owner', 'admin', 'member')
    )
  );

CREATE POLICY "vqr_select_customer"
  ON public.vendor_quote_responses FOR SELECT TO authenticated
  USING (
    rfq_id IN (
      SELECT id FROM public.rental_requests
      WHERE customer_id = auth.uid()
    )
  );

CREATE POLICY "vqr_service"
  ON public.vendor_quote_responses FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- notification_events: users read own; users update delivery_status on own

CREATE POLICY "notifications_select_own"
  ON public.notification_events FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "notifications_update_own"
  ON public.notification_events FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "notifications_service"
  ON public.notification_events FOR ALL TO service_role
  USING (true) WITH CHECK (true);

-- ============================================================
-- SECTION 6: INDEXES
-- ============================================================

CREATE INDEX idx_organizations_org_type       ON public.organizations (org_type) WHERE archived_at IS NULL;
CREATE INDEX idx_organizations_contact        ON public.organizations (primary_contact_user_id) WHERE archived_at IS NULL;

CREATE INDEX idx_memberships_org_id           ON public.organization_memberships (organization_id) WHERE archived_at IS NULL;
CREATE INDEX idx_memberships_user_id          ON public.organization_memberships (user_id) WHERE archived_at IS NULL;

CREATE INDEX idx_rental_requests_customer_org ON public.rental_requests (customer_organization_id) WHERE customer_organization_id IS NOT NULL;
CREATE INDEX idx_rental_requests_op_status    ON public.rental_requests (operational_status);

CREATE INDEX idx_audit_events_correlation     ON public.audit_events (correlation_id);
CREATE INDEX idx_audit_events_entity          ON public.audit_events (entity_type, entity_id);
CREATE INDEX idx_audit_events_related_rfq     ON public.audit_events (related_rfq_id) WHERE related_rfq_id IS NOT NULL;
CREATE INDEX idx_audit_events_actor           ON public.audit_events (actor_id) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_events_created_at      ON public.audit_events (created_at DESC);

CREATE INDEX idx_rfq_status_rfq_id            ON public.rfq_operational_status (rfq_id);
CREATE INDEX idx_rfq_status_correlation       ON public.rfq_operational_status (correlation_id);

CREATE INDEX idx_vqr_rfq_id                   ON public.vendor_quote_responses (rfq_id);
CREATE INDEX idx_vqr_vendor_org               ON public.vendor_quote_responses (vendor_organization_id);
CREATE INDEX idx_vqr_status                   ON public.vendor_quote_responses (status);
CREATE INDEX idx_vqr_submitted_by             ON public.vendor_quote_responses (submitted_by);

CREATE INDEX idx_notifications_user           ON public.notification_events (user_id, created_at DESC);
CREATE INDEX idx_notifications_correlation    ON public.notification_events (correlation_id) WHERE correlation_id IS NOT NULL;

-- ============================================================
-- SECTION 7: SECURITY DEFINER FUNCTIONS
-- log_audit_event must be created before transition_rfq_status (called internally).
-- ============================================================

CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_correlation_id                    uuid,
  p_entity_type                       text,
  p_entity_id                         uuid,
  p_event_type                        text,
  p_event_category                    text,
  p_actor_id                          uuid,
  p_actor_role                        text,
  p_actor_type                        text,
  p_old_value                         jsonb    DEFAULT NULL,
  p_new_value                         jsonb    DEFAULT NULL,
  p_reason                            text     DEFAULT NULL,
  p_source                            text     DEFAULT 'system',
  p_severity                          text     DEFAULT 'info',
  p_is_simulated                      boolean  DEFAULT false,
  p_related_rfq_id                    uuid     DEFAULT NULL,
  p_related_customer_organization_id  uuid     DEFAULT NULL,
  p_related_vendor_organization_id    uuid     DEFAULT NULL,
  p_related_equipment_id              uuid     DEFAULT NULL,
  p_metadata                          jsonb    DEFAULT '{}'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event_id uuid;
BEGIN
  INSERT INTO public.audit_events (
    correlation_id, entity_type, entity_id, event_type, event_category,
    actor_id, actor_role, actor_type, old_value, new_value, reason, source,
    severity, is_simulated, related_rfq_id,
    related_customer_organization_id, related_vendor_organization_id,
    related_equipment_id, metadata
  ) VALUES (
    p_correlation_id, p_entity_type, p_entity_id, p_event_type, p_event_category,
    p_actor_id, p_actor_role, p_actor_type, p_old_value, p_new_value, p_reason,
    p_source, p_severity, p_is_simulated, p_related_rfq_id,
    p_related_customer_organization_id, p_related_vendor_organization_id,
    p_related_equipment_id, p_metadata
  )
  RETURNING id INTO v_event_id;

  RETURN v_event_id;
END;
$$;

-- transition_rfq_status: atomic status transition with audit
-- Validates against terminal states, generates correlation_id,
-- writes audit_events first (Event Integrity Rule: if audit fails, all fails),
-- then writes rfq_operational_status and updates rental_requests.
CREATE OR REPLACE FUNCTION public.transition_rfq_status(
  p_rfq_id       uuid,
  p_new_status   public.app_rfq_status,
  p_actor_id     uuid,
  p_actor_role   text    DEFAULT NULL,
  p_reason       text    DEFAULT NULL,
  p_source       text    DEFAULT 'system',
  p_is_simulated boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_status public.app_rfq_status;
  v_correlation_id uuid;
  v_audit_event_id uuid;
  v_rfq            record;
BEGIN
  SELECT id, operational_status, customer_id, customer_organization_id, is_simulated
  INTO v_rfq
  FROM public.rental_requests
  WHERE id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id;
  END IF;

  v_current_status := v_rfq.operational_status;

  IF v_current_status = p_new_status THEN
    RAISE EXCEPTION 'RFQ % is already in status %', p_rfq_id, p_new_status;
  END IF;

  IF v_current_status IN (
    'completed'::public.app_rfq_status,
    'cancelled'::public.app_rfq_status,
    'rejected'::public.app_rfq_status
  ) THEN
    RAISE EXCEPTION 'RFQ % is in terminal status % — cannot transition', p_rfq_id, v_current_status;
  END IF;

  v_correlation_id := gen_random_uuid();

  -- Event Integrity Rule: audit event must be written first.
  -- If this INSERT fails, the entire transaction rolls back — no silent state change.
  v_audit_event_id := public.log_audit_event(
    p_correlation_id                   := v_correlation_id,
    p_entity_type                      := 'rental_request',
    p_entity_id                        := p_rfq_id,
    p_event_type                       := 'status_transition',
    p_event_category                   := 'rfq',
    p_actor_id                         := p_actor_id,
    p_actor_role                       := p_actor_role,
    p_actor_type                       := CASE WHEN p_actor_id IS NULL THEN 'system' ELSE 'user' END,
    p_old_value                        := jsonb_build_object('operational_status', v_current_status::text),
    p_new_value                        := jsonb_build_object('operational_status', p_new_status::text),
    p_reason                           := p_reason,
    p_source                           := p_source,
    p_severity                         := 'info',
    p_is_simulated                     := p_is_simulated,
    p_related_rfq_id                   := p_rfq_id,
    p_related_customer_organization_id := v_rfq.customer_organization_id,
    p_metadata                         := jsonb_build_object(
      'previous_status', v_current_status::text,
      'new_status',      p_new_status::text
    )
  );

  INSERT INTO public.rfq_operational_status (
    rfq_id, previous_status, new_status, transitioned_by, actor_role,
    reason, correlation_id, audit_event_id, is_simulated
  ) VALUES (
    p_rfq_id, v_current_status, p_new_status, p_actor_id, p_actor_role,
    p_reason, v_correlation_id, v_audit_event_id, p_is_simulated
  );

  UPDATE public.rental_requests SET
    operational_status = p_new_status,
    submitted_at = CASE WHEN p_new_status = 'submitted'::public.app_rfq_status
                        THEN now() ELSE submitted_at END,
    confirmed_at = CASE WHEN p_new_status = 'vendor_confirmed'::public.app_rfq_status
                        THEN now() ELSE confirmed_at END,
    on_rent_at   = CASE WHEN p_new_status = 'on_rent'::public.app_rfq_status
                        THEN now() ELSE on_rent_at END,
    off_rent_at  = CASE WHEN p_new_status = 'off_rent'::public.app_rfq_status
                        THEN now() ELSE off_rent_at END,
    closed_at    = CASE WHEN p_new_status IN (
                          'completed'::public.app_rfq_status,
                          'cancelled'::public.app_rfq_status,
                          'rejected'::public.app_rfq_status
                        ) THEN now() ELSE closed_at END
  WHERE id = p_rfq_id;

  RETURN v_correlation_id;
END;
$$;

-- ============================================================
-- SECTION 8: REVOKE EXECUTE — Edge Function gate
-- Supabase local stack sets default privileges granting EXECUTE to anon and
-- authenticated when functions are created. REVOKE FROM PUBLIC alone is not
-- enough — must also REVOKE the direct grants created by those default privileges.
-- Explicit GRANT to service_role so Edge Functions retain access via service key.
-- The internal call transition_rfq_status → log_audit_event is safe because
-- SECURITY DEFINER runs as the function owner (postgres superuser), which
-- bypasses privilege checks entirely.
-- ============================================================

REVOKE EXECUTE ON FUNCTION public.log_audit_event(
  uuid, text, uuid, text, text, uuid, text, text,
  jsonb, jsonb, text, text, text, boolean, uuid, uuid, uuid, uuid, jsonb
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.log_audit_event(
  uuid, text, uuid, text, text, uuid, text, text,
  jsonb, jsonb, text, text, text, boolean, uuid, uuid, uuid, uuid, jsonb
) TO service_role;

REVOKE EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean
) FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.transition_rfq_status(
  uuid, public.app_rfq_status, uuid, text, text, text, boolean
) TO service_role;

-- ============================================================
-- SECTION 9: DEMO SEED RECORDS
-- Conditional: only inserts if demo accounts exist in auth.users.
-- is_simulated = true on all records — Demo Isolation Rule enforced.
-- ============================================================

DO $$
DECLARE
  v_customer_user_id uuid;
  v_vendor_user_id   uuid;
  v_customer_org_id  uuid;
  v_vendor_org_id    uuid;
BEGIN
  SELECT id INTO v_customer_user_id
  FROM auth.users WHERE email = 'demo.customer@allrentz.com';

  SELECT id INTO v_vendor_user_id
  FROM auth.users WHERE email = 'demo.vendor@allrentz.com';

  IF v_customer_user_id IS NOT NULL THEN
    v_customer_org_id := gen_random_uuid();
    INSERT INTO public.organizations (
      id, name, org_type, city, state,
      is_simulated, verified, primary_contact_user_id
    ) VALUES (
      v_customer_org_id, 'Demo Refinery Operations', 'customer',
      'Houston', 'TX', true, true, v_customer_user_id
    );
    INSERT INTO public.organization_memberships (
      organization_id, user_id, role, is_simulated
    ) VALUES (
      v_customer_org_id, v_customer_user_id, 'owner', true
    );
  END IF;

  IF v_vendor_user_id IS NOT NULL THEN
    v_vendor_org_id := gen_random_uuid();
    INSERT INTO public.organizations (
      id, name, org_type, city, state,
      is_simulated, verified, primary_contact_user_id
    ) VALUES (
      v_vendor_org_id, 'Demo Equipment Supply Co.', 'vendor',
      'Beaumont', 'TX', true, true, v_vendor_user_id
    );
    INSERT INTO public.organization_memberships (
      organization_id, user_id, role, is_simulated
    ) VALUES (
      v_vendor_org_id, v_vendor_user_id, 'owner', true
    );
  END IF;
END;
$$;
