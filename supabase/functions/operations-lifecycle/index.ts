import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import {
  buildPreDispatchReadinessProjection,
  hasOperationsLifecycleRole,
  lifecycleRowsAreConsistent,
  validateOperationsLifecycleAction,
} from './operationsLifecyclePolicy.ts'
import { buildFieldAcceptanceStatusProjection } from '../rfq-field-acceptance/fieldAcceptancePolicy.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function jsonError(status: number, message: string): Response {
  return json(status, { error: message })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })
  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return jsonError(401, 'Authorization header required')

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  const validation = validateOperationsLifecycleAction(body)
  if (!validation.valid) return jsonError(400, validation.error ?? 'Invalid request')

  let supabaseUrl: string
  let publishableKey: string
  let secretKey: string
  try {
    const selectedUrl = preferProductionValue(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('ALLRENTZ_LOCAL_SUPABASE_URL'),
    )
    if (!selectedUrl) {
      throw new KeyConfigError('SUPABASE_URL and ALLRENTZ_LOCAL_SUPABASE_URL are not configured')
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
    console.error('operations-lifecycle key configuration error:', err instanceof Error ? err.message : 'unknown')
    return jsonError(500, 'Service configuration error')
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return jsonError(401, 'Invalid or expired token')

  const svc = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: roleRows, error: roleError } = await svc
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .in('role', ['admin', 'manager'])

  if (roleError) {
    console.error('operations-lifecycle role authorization error:', roleError.message)
    return jsonError(500, 'Unable to verify operations authority')
  }
  if (!hasOperationsLifecycleRole(roleRows)) {
    return jsonError(403, 'Operations lifecycle authority required')
  }

  const { data: actorProfile, error: profileError } = await svc
    .from('profiles')
    .select('is_demo')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    console.error('operations-lifecycle simulation authorization error:', profileError.message)
    return jsonError(500, 'Unable to verify simulation authority')
  }
  if (!actorProfile || typeof actorProfile.is_demo !== 'boolean') {
    return jsonError(403, 'Operations lifecycle authority requires an active profile boundary')
  }

  const isSimulated = actorProfile.is_demo
  const { data: rfqs, error: rfqError } = await svc
    .from('rental_requests')
    .select('id, customer_id, operational_status, on_rent_at, created_at, updated_at')
    .eq('is_simulated', isSimulated)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .limit(50)

  if (rfqError) {
    console.error('operations-lifecycle RFQ projection error:', rfqError.message)
    return jsonError(500, 'Unable to load operations lifecycle')
  }

  const rfqIds = (rfqs ?? []).map((rfq) => rfq.id)
  const preDispatchRfqIds = (rfqs ?? [])
    .filter((rfq) => ['quote_accepted', 'vendor_confirmed', 'mobilizing']
      .includes(rfq.operational_status))
    .map((rfq) => rfq.id)
  const preDispatchCustomerIds = [...new Set((rfqs ?? [])
    .filter((rfq) => preDispatchRfqIds.includes(rfq.id))
    .map((rfq) => rfq.customer_id))]

  let acceptedQuoteRows: Array<{
    rfq_id: string
    status: unknown
    accepted_at: unknown
  }> = []
  if (preDispatchRfqIds.length > 0) {
    const { data: acceptedQuotes, error: acceptedQuoteError } = await svc
      .from('vendor_quote_responses')
      .select('rfq_id, status, accepted_at')
      .in('rfq_id', preDispatchRfqIds)
      .eq('is_simulated', isSimulated)
      .eq('status', 'accepted')

    if (acceptedQuoteError) {
      console.error('operations-lifecycle accepted-quote projection error:', acceptedQuoteError.message)
      return jsonError(500, 'Unable to load pre-dispatch readiness')
    }
    acceptedQuoteRows = acceptedQuotes ?? []
  }

  const eligibleCustomerIds = new Set<string>()
  if (preDispatchCustomerIds.length > 0) {
    const { data: customerActors, error: customerActorError } = await svc
      .from('profiles')
      .select('id, is_demo')
      .in('id', preDispatchCustomerIds)

    if (customerActorError) {
      console.error('operations-lifecycle customer boundary error:', customerActorError.message)
      return jsonError(500, 'Unable to load pre-dispatch readiness')
    }
    for (const customerActor of customerActors ?? []) {
      if (customerActor.is_demo === isSimulated) eligibleCustomerIds.add(customerActor.id)
    }
  }

  let customerRequirementRows: Array<{
    user_id: string
    twic_required: unknown
    isnet_required: unknown
    purchase_order_required: unknown
  }> = []
  if (eligibleCustomerIds.size > 0) {
    const { data: customerRequirements, error: customerRequirementsError } = await svc
      .from('customer_profiles')
      .select('user_id, twic_required, isnet_required, purchase_order_required')
      .in('user_id', [...eligibleCustomerIds])

    if (customerRequirementsError) {
      console.error('operations-lifecycle requirement projection error:', customerRequirementsError.message)
      return jsonError(500, 'Unable to load pre-dispatch readiness')
    }
    customerRequirementRows = customerRequirements ?? []
  }

  let eventRows: Array<{
    rfq_id: string
    previous_status: unknown
    new_status: unknown
    transitioned_by: unknown
    actor_role: unknown
    created_at: string
  }> = []

  if (rfqIds.length > 0) {
    const { data: events, error: eventError } = await svc
      .from('rfq_operational_status')
      .select('rfq_id, previous_status, new_status, transitioned_by, actor_role, created_at')
      .in('rfq_id', rfqIds)
      .eq('is_simulated', isSimulated)
      .order('created_at', { ascending: true })
      .limit(1000)

    if (eventError) {
      console.error('operations-lifecycle event projection error:', eventError.message)
      return jsonError(500, 'Unable to load operations lifecycle history')
    }
    eventRows = events ?? []
  }

  const grouped = new Map<string, typeof eventRows>()
  for (const event of eventRows) {
    const existing = grouped.get(event.rfq_id) ?? []
    existing.push(event)
    grouped.set(event.rfq_id, existing)
  }

  const acceptedQuotesByRfq = new Map<string, typeof acceptedQuoteRows>()
  for (const quote of acceptedQuoteRows) {
    const existing = acceptedQuotesByRfq.get(quote.rfq_id) ?? []
    existing.push(quote)
    acceptedQuotesByRfq.set(quote.rfq_id, existing)
  }
  const customerRequirementsByUser = new Map(
    customerRequirementRows.map((requirements) => [requirements.user_id, requirements]),
  )

  const items = []
  for (const rfq of rfqs ?? []) {
    const events = grouped.get(rfq.id) ?? []
    if (!lifecycleRowsAreConsistent({ currentStatus: rfq.operational_status, events })) {
      console.error('operations-lifecycle contradictory lifecycle rows:', rfq.id)
      return jsonError(409, 'Operations lifecycle requires review')
    }
    items.push({
      rfq_id: rfq.id,
      current_status: rfq.operational_status,
      created_at: rfq.created_at,
      updated_at: rfq.updated_at,
      pre_dispatch: buildPreDispatchReadinessProjection({
        currentStatus: rfq.operational_status,
        acceptedQuotes: acceptedQuotesByRfq.get(rfq.id),
        customerRequirements: eligibleCustomerIds.has(rfq.customer_id)
          ? customerRequirementsByUser.get(rfq.customer_id)
          : null,
      }),
      field_acceptance: buildFieldAcceptanceStatusProjection({
        currentStatus: rfq.operational_status,
        onRentAt: rfq.on_rent_at,
        timelineRows: events,
      }),
      timeline: events.map((event) => ({
        previous_status: event.previous_status,
        new_status: event.new_status,
        created_at: event.created_at,
      })),
    })
  }

  return json(200, {
    authority: 'READ_ONLY_OPERATIONS_PROJECTION',
    scope: 'RFQ_WIDE',
    mode: isSimulated ? 'SIMULATION' : 'PRODUCTION',
    generated_at: new Date().toISOString(),
    items,
    authority_boundary: {
      mutations_permitted: false,
      billing_authority: false,
      custody_authority: false,
      granular_object_authority: false,
      release_authority: false,
    },
  })
})
