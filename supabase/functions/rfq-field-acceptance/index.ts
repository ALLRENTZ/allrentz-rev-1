import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import {
  buildFieldAcceptanceStatusProjection,
  hasFieldAcceptanceProjectionAccess,
  validateFieldAcceptance,
  validateFieldAcceptanceStatus,
} from './fieldAcceptancePolicy.ts'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function jsonError(status: number, message: string): Response {
  return json(status, { error: message })
}

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

  if (req.method !== 'POST') return jsonError(405, 'Method not allowed')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
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
    console.error(
      'rfq-field-acceptance key configuration error:',
      err instanceof Error ? err.message : 'unknown',
    )
    return jsonError(500, 'Service configuration error')
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return jsonError(401, 'Invalid or expired token')

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return jsonError(400, 'Invalid JSON body')
  }

  const isStatusRequest = body['action'] === 'status'
  const statusValidation = isStatusRequest ? validateFieldAcceptanceStatus(body) : null
  const validation = isStatusRequest ? null : validateFieldAcceptance(body)
  if (statusValidation && (!statusValidation.valid || !statusValidation.input)) {
    return jsonError(400, statusValidation.error ?? 'Invalid status request')
  }
  if (validation && (!validation.valid || !validation.input)) {
    return jsonError(400, validation.error ?? 'Invalid field acceptance')
  }

  const svc = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (statusValidation?.input) {
    const rfqId = statusValidation.input.rfqId
    const { data: actorProfile, error: actorProfileError } = await svc
      .from('profiles')
      .select('is_demo')
      .eq('id', user.id)
      .maybeSingle()
    if (actorProfileError) {
      console.error('field acceptance projection actor boundary error:', actorProfileError.message)
      return jsonError(500, 'Unable to verify field acceptance visibility')
    }
    if (!actorProfile || typeof actorProfile.is_demo !== 'boolean') {
      return jsonError(403, 'Field acceptance visibility requires an active profile boundary')
    }

    const { data: rfq, error: rfqError } = await svc
      .from('rental_requests')
      .select('id, customer_id, customer_organization_id, operational_status, on_rent_at, is_simulated')
      .eq('id', rfqId)
      .maybeSingle()
    if (rfqError) {
      console.error('field acceptance projection RFQ error:', rfqError.message)
      return jsonError(500, 'Unable to load field acceptance status')
    }
    if (!rfq) return jsonError(404, 'RFQ not found')

    const [roleResult, membershipResult, acceptedQuoteResult] = await Promise.all([
      svc
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .in('role', ['admin', 'manager']),
      svc
        .from('organization_memberships')
        .select('organization_id, role')
        .eq('user_id', user.id)
        .is('archived_at', null)
        .in('role', ['owner', 'admin', 'member']),
      svc
        .from('vendor_quote_responses')
        .select('vendor_organization_id')
        .eq('rfq_id', rfqId)
        .eq('status', 'accepted')
        .eq('is_simulated', rfq.is_simulated),
    ])
    if (roleResult.error || membershipResult.error || acceptedQuoteResult.error) {
      console.error(
        'field acceptance projection authorization error:',
        roleResult.error?.message
          ?? membershipResult.error?.message
          ?? acceptedQuoteResult.error?.message,
      )
      return jsonError(500, 'Unable to verify field acceptance visibility')
    }

    if (!hasFieldAcceptanceProjectionAccess({
      actorId: user.id,
      actorIsDemo: actorProfile.is_demo,
      rfq: {
        customerId: rfq.customer_id,
        customerOrganizationId: rfq.customer_organization_id,
        isSimulated: rfq.is_simulated,
      },
      operationsRoles: roleResult.data,
      memberships: membershipResult.data,
      acceptedVendorOrganizationIds: (acceptedQuoteResult.data ?? [])
        .map((quote) => quote.vendor_organization_id)
        .filter((organizationId): organizationId is string => typeof organizationId === 'string'),
    })) return jsonError(403, 'Insufficient authority to view field acceptance status')

    const { data: timelineRows, error: timelineError } = await svc
      .from('rfq_operational_status')
      .select('previous_status, new_status, transitioned_by, actor_role, created_at')
      .eq('rfq_id', rfqId)
      .eq('is_simulated', rfq.is_simulated)
      .eq('new_status', 'on_rent')
      .order('created_at', { ascending: true })
    if (timelineError) {
      console.error('field acceptance projection timeline error:', timelineError.message)
      return jsonError(500, 'Unable to load field acceptance status')
    }

    const projection = buildFieldAcceptanceStatusProjection({
      currentStatus: rfq.operational_status,
      onRentAt: rfq.on_rent_at,
      timelineRows,
    })
    if (!projection) return jsonError(422, 'Field acceptance status is not applicable')
    return json(200, projection)
  }

  if (!validation?.input) return jsonError(400, 'Invalid field acceptance')
  const input = validation.input
  const { data: correlationId, error: acceptanceError } = await svc.rpc(
    'record_rental_field_acceptance',
    {
      p_rfq_id: input.rfqId,
      p_actor_id: user.id,
      p_condition_notes: input.conditionNotes,
      p_evidence_references: input.evidenceReferences,
      p_quantities_confirmed: input.quantitiesConfirmed,
      p_accessories_confirmed: input.accessoriesConfirmed,
      p_documentation_confirmed: input.documentationConfirmed,
      p_terms_acknowledged: input.termsAcknowledged,
    },
  )

  if (acceptanceError) {
    const message = acceptanceError.message ?? ''
    if (message.includes('not found')) return jsonError(404, 'RFQ not found')
    if (message.includes('must be in_transit')) {
      return jsonError(422, 'Rental must be in transit before field acceptance')
    }
    if (message.includes('already exists')) {
      return jsonError(422, 'Field acceptance has already been recorded')
    }
    if (message.includes('lacks customer field-acceptance authority') || message.includes('Demo actor')) {
      return jsonError(403, 'Insufficient authority to record field acceptance')
    }
    if (message.includes('required') || message.includes('cannot be blank')) {
      return jsonError(400, message)
    }
    console.error('record_rental_field_acceptance error:', acceptanceError)
    return jsonError(500, 'Internal error')
  }

  return json(200, { correlation_id: correlationId })
})
