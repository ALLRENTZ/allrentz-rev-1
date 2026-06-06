import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    headers: { 'Content-Type': 'application/json' },
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
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
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

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // Validate the JWT by calling getUser() — Supabase verifies signature + expiry
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return jsonError(401, 'Invalid or expired token')
  }

  // Service-role client for all DB reads and the RPC call.
  // Never exposed to the caller — all authority is derived server-side.
  const svc = createClient(supabaseUrl, serviceRoleKey, {
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
    const { data: vendorMemberships } = await svc
      .from('organization_memberships')
      .select('organization_id')
      .eq('user_id', user.id)
      .is('archived_at', null)
      .in('role', ['owner', 'admin', 'member'])

    if (vendorMemberships && vendorMemberships.length > 0) {
      const vendorOrgIds = vendorMemberships.map(
        (m: { organization_id: string }) => m.organization_id,
      )
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
