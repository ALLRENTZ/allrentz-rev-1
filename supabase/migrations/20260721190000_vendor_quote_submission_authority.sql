-- Backend-authoritative vendor quote submission.
--
-- A vendor quote and the pending_vendor_review -> vendor_quote_received
-- transition must commit or roll back together. Authenticated clients may no
-- longer INSERT or UPDATE vendor_quote_responses directly.

CREATE OR REPLACE FUNCTION public.submit_vendor_quote(
  p_rfq_id                  uuid,
  p_vendor_organization_id  uuid,
  p_daily_rate              numeric,
  p_delivery_fee            numeric DEFAULT NULL,
  p_mobilization_fee        numeric DEFAULT NULL,
  p_minimum_rental_days     integer DEFAULT NULL,
  p_available_start_date    date DEFAULT NULL,
  p_equipment_substitution  boolean DEFAULT false,
  p_substitution_notes      text DEFAULT NULL,
  p_compliance_confirmed    boolean DEFAULT false,
  p_compliance_notes        text[] DEFAULT ARRAY[]::text[],
  p_vendor_notes            text DEFAULT NULL
)
RETURNS TABLE (
  quote_id       uuid,
  correlation_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor_id       uuid := auth.uid();
  v_actor_role     text;
  v_actor_is_demo  boolean;
  v_rfq            record;
  v_org            record;
  v_quote_id       uuid;
  v_correlation_id uuid;
BEGIN
  IF v_actor_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required to submit a vendor quote'
      USING ERRCODE = '42501';
  END IF;

  IF p_daily_rate IS NULL OR p_daily_rate <= 0 THEN
    RAISE EXCEPTION 'daily_rate must be greater than zero'
      USING ERRCODE = '22023';
  END IF;

  IF p_delivery_fee IS NOT NULL AND p_delivery_fee < 0 THEN
    RAISE EXCEPTION 'delivery_fee cannot be negative'
      USING ERRCODE = '22023';
  END IF;

  IF p_mobilization_fee IS NOT NULL AND p_mobilization_fee < 0 THEN
    RAISE EXCEPTION 'mobilization_fee cannot be negative'
      USING ERRCODE = '22023';
  END IF;

  IF p_minimum_rental_days IS NOT NULL AND p_minimum_rental_days < 1 THEN
    RAISE EXCEPTION 'minimum_rental_days must be at least one'
      USING ERRCODE = '22023';
  END IF;

  IF length(COALESCE(p_vendor_notes, '')) > 5000
     OR length(COALESCE(p_substitution_notes, '')) > 5000 THEN
    RAISE EXCEPTION 'quote notes cannot exceed 5000 characters'
      USING ERRCODE = '22023';
  END IF;

  IF NOT COALESCE(p_equipment_substitution, false)
     AND NULLIF(btrim(COALESCE(p_substitution_notes, '')), '') IS NOT NULL THEN
    RAISE EXCEPTION 'substitution_notes require equipment_substitution=true'
      USING ERRCODE = '22023';
  END IF;

  -- Serialize quote submissions and lifecycle transitions for this RFQ.
  SELECT rr.id, rr.operational_status, rr.is_simulated
  INTO v_rfq
  FROM public.rental_requests AS rr
  WHERE rr.id = p_rfq_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'RFQ not found: %', p_rfq_id
      USING ERRCODE = 'P0002';
  END IF;

  v_actor_is_demo := public.is_demo_actor(v_actor_id);
  IF v_actor_is_demo IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Actor and RFQ simulation scopes do not match'
      USING ERRCODE = '42501';
  END IF;

  SELECT org.id, org.org_type, org.archived_at, org.is_simulated
  INTO v_org
  FROM public.organizations AS org
  WHERE org.id = p_vendor_organization_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active vendor organization authority is required'
      USING ERRCODE = '42501';
  END IF;

  IF v_org.archived_at IS NOT NULL
     OR v_org.org_type NOT IN ('vendor', 'both')
     OR v_org.is_simulated IS DISTINCT FROM v_rfq.is_simulated THEN
    RAISE EXCEPTION 'Active vendor organization authority is required'
      USING ERRCODE = '42501';
  END IF;

  SELECT om.role
  INTO v_actor_role
  FROM public.organization_memberships AS om
  WHERE om.user_id = v_actor_id
    AND om.organization_id = p_vendor_organization_id
    AND om.archived_at IS NULL
    AND om.role IN ('owner', 'admin', 'member')
    AND om.is_simulated = v_rfq.is_simulated;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Active vendor organization membership is required'
      USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.rfq_vendor_invitations AS rvi
    WHERE rvi.rfq_id = p_rfq_id
      AND rvi.vendor_organization_id = p_vendor_organization_id
      AND rvi.invitation_status = 'invited'
      AND rvi.revoked_at IS NULL
      AND rvi.is_simulated = v_rfq.is_simulated
  ) THEN
    RAISE EXCEPTION 'An active vendor invitation is required'
      USING ERRCODE = '42501';
  END IF;

  -- The RFQ row lock makes this duplicate check safe under concurrency.
  IF EXISTS (
    SELECT 1
    FROM public.vendor_quote_responses AS vqr
    WHERE vqr.rfq_id = p_rfq_id
      AND vqr.vendor_organization_id = p_vendor_organization_id
  ) THEN
    RAISE EXCEPTION 'A quote already exists for this RFQ and vendor organization'
      USING ERRCODE = '23505';
  END IF;

  -- Every lifecycle field is derived here. The caller supplies commercial
  -- quote inputs only.
  INSERT INTO public.vendor_quote_responses (
    rfq_id,
    vendor_organization_id,
    submitted_by,
    accepted_by,
    rejected_by,
    withdrawn_by,
    version,
    status,
    daily_rate,
    delivery_fee,
    mobilization_fee,
    minimum_rental_days,
    available_start_date,
    equipment_substitution,
    substitution_notes,
    compliance_confirmed,
    compliance_notes,
    vendor_notes,
    submitted_at,
    accepted_at,
    rejected_at,
    is_simulated,
    created_at,
    updated_at
  ) VALUES (
    p_rfq_id,
    p_vendor_organization_id,
    v_actor_id,
    NULL,
    NULL,
    NULL,
    1,
    'submitted',
    p_daily_rate,
    p_delivery_fee,
    p_mobilization_fee,
    p_minimum_rental_days,
    p_available_start_date,
    COALESCE(p_equipment_substitution, false),
    NULLIF(btrim(COALESCE(p_substitution_notes, '')), ''),
    COALESCE(p_compliance_confirmed, false),
    COALESCE(p_compliance_notes, ARRAY[]::text[]),
    NULLIF(btrim(COALESCE(p_vendor_notes, '')), ''),
    now(),
    NULL,
    NULL,
    v_rfq.is_simulated,
    now(),
    now()
  )
  RETURNING id INTO v_quote_id;

  -- transition_rfq_status performs the authoritative state validation and
  -- writes the correlated audit/status-history records. If it rejects the
  -- transition, this function's preceding quote INSERT rolls back too.
  v_correlation_id := public.transition_rfq_status(
    p_rfq_id       := p_rfq_id,
    p_new_status   := 'vendor_quote_received'::public.app_rfq_status,
    p_actor_id     := v_actor_id,
    p_actor_role   := v_actor_role,
    p_reason       := 'Vendor quote submitted',
    p_source       := 'vendor_action',
    p_is_simulated := v_rfq.is_simulated,
    p_vqr_id       := NULL
  );

  RETURN QUERY SELECT v_quote_id, v_correlation_id;
END;
$$;

COMMENT ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, numeric, numeric, numeric, integer, date, boolean, text,
  boolean, text[], text
) IS 'Atomically submits a vendor quote and transitions its RFQ using backend-derived authority and lifecycle metadata.';

REVOKE EXECUTE ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, numeric, numeric, numeric, integer, date, boolean, text,
  boolean, text[], text
) FROM PUBLIC, anon, service_role;

GRANT EXECUTE ON FUNCTION public.submit_vendor_quote(
  uuid, uuid, numeric, numeric, numeric, integer, date, boolean, text,
  boolean, text[], text
) TO authenticated;

DROP POLICY IF EXISTS vqr_insert_vendor
  ON public.vendor_quote_responses;

DROP POLICY IF EXISTS vqr_update_vendor
  ON public.vendor_quote_responses;

REVOKE INSERT, UPDATE ON public.vendor_quote_responses
  FROM PUBLIC, authenticated, anon;
