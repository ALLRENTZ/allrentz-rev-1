import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from './keys.ts'

// ── Transition allowlists ──────────────────────────────────────────────────────
//
// These are optimization copies. The DB function transition_rfq_status() is the
// authoritative source of truth. Any update to these sets must be made in the
// same PR as the corresponding DB migration.

const VALID_STATUSES = new Set([
  'draft', 'submitted', 'pending_vendor_review', 'vendor_quote_received',
  'quote_accepted', 'vendor_confirmed', 'mobilizing', 'in_transit',
  'on_rent', 'off_rent_requested', 'demobilizing',
  'off_rent', 'completed', 'cancelled', 'rejected',
])

const VALID_TRANSITIONS = new Set([
  'draft:submitted',
  'draft:cancelled',
  'submitted:pending_vendor_review',
  'submitted:cancelled',
  'pending_vendor_review:vendor_quote_received',
  'pending_vendor_review:cancelled',
  'vendor_quote_received:quote_accepted',
  'vendor_quote_received:cancelled',
  'vendor_quote_received:rejected',
  'quote_accepted:vendor_confirmed',
  'quote_accepted:cancelled',
  'quote_accepted:rejected',
  'vendor_confirmed:mobilizing',
  'vendor_confirmed:cancelled',
  'mobilizing:in_transit',
  'mobilizing:cancelled',
  'in_transit:on_rent',
  'on_rent:off_rent_requested',
  'off_rent_requested:demobilizing',
  'demobilizing:off_rent',
  'off_rent:completed',
])

// rental_extended is intentionally excluded from VALID_STATUSES and VALID_TRANSITIONS.
//
// Governance rationale:
//   rental_extended is a valid app_rfq_status enum value in the DB schema but
//   represents a commercial renegotiation event, not a standard lifecycle
//   transition. A rental extension requires:
//     - New terms (revised end date, adjusted rates, deposit changes)
//     - Bilateral agreement — both customer and vendor must consent
//     - A dedicated extension request and approval workflow
//
//   The unilateral authority model used here (customer-owns, vendor-owns,
//   admin-override) is not appropriate for a rental extension. Including
//   rental_extended in VALID_TRANSITIONS without a proper extension workflow
//   would create an unauthorized transition path with no commercial guard.
//
//   When a rental extension workflow is designed, it must include:
//     - An explicit extension request (revised scope, dates, terms)
//     - Vendor confirmation of availability and revised pricing
//     - Customer acceptance of revised terms
//     - Audit trail for the extension event separate from the standard lifecycle
//
//   Until that workflow exists, any attempt to transition to rental_extended
//   returns 400 (unrecognized status) at Step 3 of this function.

// Customer-owned transitions: pre-acceptance, acceptance decisions, cancellations
const CUSTOMER_TRANSITIONS = new Set([
  'draft:submitted',
  'draft:cancelled',
  'submitted:cancelled',
  'vendor_quote_received:quote_accepted',
  'vendor_quote_received:cancelled',
  'vendor_quote_received:rejected',
  'quote_accepted:cancelled',
  'quote_accepted:rejected',
])

// Vendor-owned transitions: review, confirmation, mobilization, rental lifecycle
const VENDOR_TRANSITIONS = new Set([
  'submitted:pending_vendor_review',
  'pending_vendor_review:vendor_quote_received',
  'pending_vendor_review:cancelled',
  'quote_accepted:vendor_confirmed',
  'vendor_confirmed:mobilizing',
  'vendor_confirmed:cancelled',
  'mobilizing:in_transit',
  'mobilizing:cancelled',
  'in_transit:on_rent',
  'on_rent:off_rent_requested',
  'off_rent_requested:demobilizing',
  'demobilizing:off_rent',
  'off_rent:completed',
])

// ── Response helpers ───────────────────────────────────────────────────────────

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function jsonError(status: number, message: string): Response {
  return json(status, { error: message })
}

// ── Handler ────────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
      },
    })
  }

  if (req.method !== 'POST') {
    return jsonError(405, 'Method not allowed')
  }

  // ── Step 1: JWT verification ───────────────────────────────────────────────

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonError(401, 'Authorization header required')
  }

  let supabaseUrl: string
  let publishableKey: string
  let secretKey: string
  try {
    const selectedUrl = preferProductionValue(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('ALLRENTZ_LOCAL_SUPABASE_URL'),
    )
    if (!selectedUrl) {
      throw new KeyConfigError(
        'SUPABASE_URL and ALLRENTZ_LOCAL_SUPABASE_URL are not configured',
      )
    }
    supabaseUrl = selectedUrl

    publishableKey = selectPublishableKey(
      preferProductionValue(
        Deno.env.get('SUPABASE_PUBLISHABLE_KEYS'),
        Deno.env.get('ALLRENTZ_LOCAL_SUPABASE_PUBLISHABLE_KEYS'),
      ),
      Deno.env.get('SUPABASE_PUBLISHABLE_KEY_NAME'),
    )
    secretKey = selectSecretKey(
      preferProductionValue(
        Deno.env.get('SUPABASE_SECRET_KEYS'),
        Deno.env.get('ALLRENTZ_LOCAL_SUPABASE_SECRET_KEYS'),
      ),
      BACKEND_SECRET_KEY_NAME,
    )
  } catch (err) {
    // Log the sanitized reason only — never the raw env var contents.
    console.error('rfq-transition key configuration error:', err instanceof Error ? err.message : 'unknown')
    return jsonError(500, 'Service configuration error')
  }

  // Validate the JWT by calling getUser() — Supabase verifies signature + expiry.
  // The publishable key here only sets the apikey header; caller identity comes
  // entirely from the Authorization header, which is a GoTrue-issued user JWT
  // and is unaffected by the publishable/secret key migration.
  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return jsonError(401, 'Invalid or expired token')
  }

  // Secret-key client for all DB reads and the RPC call.
  // Never exposed to the caller — all authority is derived server-side.
  const svc = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // ── Step 2: Parse and validate request body ────────────────────────────────

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  const rfqId = body['rfq_id']
  const newStatus = body['new_status']
  const reason = typeof body['reason'] === 'string' ? body['reason'] : null
  const vqrId = typeof body['vqr_id'] === 'string' ? body['vqr_id'] : null

  if (!rfqId || typeof rfqId !== 'string') {
    return jsonError(400, 'rfq_id is required')
  }
  if (!newStatus || typeof newStatus !== 'string' || !VALID_STATUSES.has(newStatus)) {
    return jsonError(400, 'new_status must be a valid RFQ status value')
  }
  if (newStatus === 'quote_accepted' && !vqrId) {
    return jsonError(400, 'vqr_id is required for quote_accepted transition')
  }

  // ── Step 3: Fetch RFQ ──────────────────────────────────────────────────────

  const { data: rfq, error: rfqFetchError } = await svc
    .from('rental_requests')
    .select('id, operational_status, customer_id, customer_organization_id, is_simulated')
    .eq('id', rfqId)
    .maybeSingle()

  if (rfqFetchError) {
    console.error('rfq fetch error:', rfqFetchError)
    return jsonError(500, 'Internal error')
  }
  if (!rfq) {
    return jsonError(404, 'RFQ not found')
  }

  // ── Step 3b: Demo actor boundary — hard backend gate, independent of the ──
  // frontend and enforced again inside transition_rfq_status() itself, since
  // that RPC executes via service_role and would otherwise bypass this check.

  const { data: actorProfile, error: profileFetchError } = await svc
    .from('profiles')
    .select('is_demo')
    .eq('id', user.id)
    .maybeSingle()

  if (profileFetchError) {
    console.error('profile fetch error:', profileFetchError)
    return jsonError(500, 'Internal error')
  }

  if (actorProfile?.is_demo && !rfq.is_simulated) {
    return jsonError(403, 'Demo actor cannot transition a non-simulated RFQ')
  }

  // ── Step 4: Early allowlist check (optimization — DB is authoritative) ─────

  const transitionKey = `${rfq.operational_status}:${newStatus}`
  if (!VALID_TRANSITIONS.has(transitionKey)) {
    return jsonError(422, `Invalid transition: ${rfq.operational_status} → ${newStatus}`)
  }

  // ── Step 5: Derive actor authority (server-side only) ─────────────────────
  //
  // Priority order: admin > customer > vendor
  // actor_role and source are never accepted from the request body.

  let actorSource: string | null = null

  // 5a. Admin check — platform-level authority via user_roles
  const { data: adminRoleRow } = await svc
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'manager'])
    .limit(1)
    .maybeSingle()

  if (adminRoleRow) {
    actorSource = 'admin_action'
  } else {
    // 5b. Customer authority — org membership when org is set; direct owner when org is absent
    let hasCustomerAuth = false
    if (rfq.customer_organization_id) {
      const { data: membership } = await svc
        .from('organization_memberships')
        .select('id')
        .eq('user_id', user.id)
        .eq('organization_id', rfq.customer_organization_id)
        .is('archived_at', null)
        .in('role', ['owner', 'admin', 'member'])
        .limit(1)
        .maybeSingle()
      hasCustomerAuth = !!membership
    } else if (rfq.customer_id === user.id) {
      hasCustomerAuth = true
    }

    // 5c. Vendor authority
    // pending_vendor_review → vendor_quote_received: requires submitted or revised VQR.
    // The accepted-VQR check cannot be satisfied at this stage — acceptance only
    // occurs atomically inside transition_rfq_status() on the quote_accepted
    // transition (B5-1). All other vendor transitions require an accepted VQR.
    let hasVendorAuth = false
    const { data: vendorMemberships, error: vendorMembershipsError } = await svc
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .in('role', ['owner', 'admin', 'member'])

    if (vendorMembershipsError) {
      console.error('vendor membership fetch error:', vendorMembershipsError)
      return jsonError(500, 'Internal error')
    }

    const memberOrgIds = (vendorMemberships ?? []).map(
      (m: { organization_id: string }) => m.organization_id,
    )
    let vendorOrgIds: string[] = []

    if (memberOrgIds.length > 0) {
      const { data: vendorOrganizations, error: vendorOrganizationsError } = await svc
        .from('organizations')
        .select('id')
        .in('id', memberOrgIds)
        .in('org_type', ['vendor', 'both'])
        .is('archived_at', null)

      if (vendorOrganizationsError) {
        console.error('vendor organization fetch error:', vendorOrganizationsError)
        return jsonError(500, 'Internal error')
      }

      vendorOrgIds = (vendorOrganizations ?? []).map(
        (org: { id: string }) => org.id,
      )
    }

    if (vendorOrgIds.length > 0) {
      if (transitionKey === 'pending_vendor_review:vendor_quote_received') {
        const { data: submittedQuote } = await svc
          .from('vendor_quote_responses')
          .select('id')
          .eq('rfq_id', rfqId)
          .in('status', ['submitted', 'revised'])
          .in('vendor_organization_id', vendorOrgIds)
          .limit(1)
          .maybeSingle()
        hasVendorAuth = !!submittedQuote
      } else {
        const { data: acceptedQuote } = await svc
          .from('vendor_quote_responses')
          .select('id')
          .eq('rfq_id', rfqId)
          .eq('status', 'accepted')
          .in('vendor_organization_id', vendorOrgIds)
          .limit(1)
          .maybeSingle()
        hasVendorAuth = !!acceptedQuote
      }
    }

    // Match the requested transition to the authority the caller holds
    const isCustomerTransition = CUSTOMER_TRANSITIONS.has(transitionKey)
    const isVendorTransition = VENDOR_TRANSITIONS.has(transitionKey)

    if (isCustomerTransition && hasCustomerAuth) {
      actorSource = 'customer_action'
    } else if (isVendorTransition && hasVendorAuth) {
      actorSource = 'vendor_action'
    } else {
      return jsonError(403, 'Insufficient authority for this transition')
    }
  }

  // ── Step 6: Execute transition via service_role RPC ───────────────────────

  const { data: correlationId, error: transitionError } = await svc.rpc(
    'transition_rfq_status',
    {
      p_rfq_id: rfqId,
      p_new_status: newStatus,
      p_actor_id: user.id,
      p_reason: reason,
      p_source: actorSource,
      p_is_simulated: rfq.is_simulated,
      p_vqr_id: vqrId,
    },
  )

  if (transitionError) {
    const msg = transitionError.message ?? ''
    if (msg.includes('already in status')) {
      return jsonError(422, 'RFQ is already in that status')
    }
    if (msg.includes('terminal status')) {
      return jsonError(422, 'RFQ is in a terminal state and cannot be transitioned')
    }
    if (msg.includes('not an allowed status transition')) {
      return jsonError(422, 'Invalid status transition')
    }
    if (msg.includes('not found')) {
      return jsonError(404, 'RFQ not found')
    }
    console.error('transition_rfq_status error:', transitionError)
    return jsonError(500, 'Internal error')
  }

  return json(200, { correlation_id: correlationId })
})
