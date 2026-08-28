import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import {
  buildCustomerPurchaseOrderProjection,
  canRecordCustomerPurchaseOrder,
  canViewCustomerPurchaseOrder,
  validateCustomerPurchaseOrderRequest,
  type PurchaseOrderVisibilityContext,
} from './customerPurchaseOrderPolicy.ts'

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

function commandErrorStatus(message: string): number {
  if (message.includes('not found')) return 404
  if (message.includes('lacks customer') || message.includes('simulation scope')) return 403
  if (message.includes('already recorded') || message.includes('outside')) return 409
  if (message.includes('required') || message.includes('cannot be future-dated')) return 422
  return 500
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
  const validation = validateCustomerPurchaseOrderRequest(body)
  if (!validation.valid || !validation.input) {
    return jsonError(400, validation.error ?? 'Invalid Rental Order request')
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
    console.error('rental-order key configuration error:', err instanceof Error ? err.message : 'unknown')
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

  const orderQuery = svc
    .from('rental_orders')
    .select('id, order_reference, rfq_id, customer_organization_id, customer_organization_state, vendor_organization_id, is_simulated')
  const { data: rentalOrder, error: rentalOrderError } = validation.input.action === 'status'
    ? await orderQuery.eq('rfq_id', validation.input.rfqId).maybeSingle()
    : await orderQuery.eq('id', validation.input.rentalOrderId).maybeSingle()

  if (rentalOrderError) {
    console.error('rental-order identity projection error:', rentalOrderError.message)
    return jsonError(500, 'Unable to load Rental Order authority')
  }
  if (!rentalOrder) return jsonError(404, 'Rental Order not found')

  const [profileResult, rfqResult, roleResult, membershipResult] = await Promise.all([
    svc.from('profiles').select('is_demo').eq('id', user.id).maybeSingle(),
    svc.from('rental_requests')
      .select('id, customer_id, customer_organization_id, operational_status, is_simulated')
      .eq('id', rentalOrder.rfq_id)
      .maybeSingle(),
    svc.from('user_roles').select('role').eq('user_id', user.id).in('role', ['admin', 'manager']),
    svc.from('organization_memberships')
      .select('organization_id, role, is_simulated')
      .eq('user_id', user.id)
      .is('archived_at', null),
  ])

  if (profileResult.error || rfqResult.error || roleResult.error || membershipResult.error) {
    console.error('rental-order authority projection error:',
      profileResult.error?.message ?? rfqResult.error?.message
        ?? roleResult.error?.message ?? membershipResult.error?.message)
    return jsonError(500, 'Unable to verify Rental Order authority')
  }
  if (!profileResult.data || typeof profileResult.data.is_demo !== 'boolean' || !rfqResult.data) {
    return jsonError(403, 'Rental Order visibility requires an active authority boundary')
  }

  const context: PurchaseOrderVisibilityContext = {
    actorId: user.id,
    actorIsDemo: profileResult.data.is_demo,
    rfq: {
      customerId: rfqResult.data.customer_id,
      customerOrganizationId: rfqResult.data.customer_organization_id,
      isSimulated: rfqResult.data.is_simulated,
    },
    rentalOrder: {
      customerOrganizationId: rentalOrder.customer_organization_id,
      vendorOrganizationId: rentalOrder.vendor_organization_id,
      customerOrganizationState: rentalOrder.customer_organization_state,
      isSimulated: rentalOrder.is_simulated,
    },
    operationsRoles: roleResult.data,
    memberships: membershipResult.data,
  }

  if (!canViewCustomerPurchaseOrder(context)) {
    return jsonError(403, 'Rental Order visibility required')
  }
  const canRecord = canRecordCustomerPurchaseOrder(context)

  if (validation.input.action === 'record_customer_purchase_order') {
    if (!canRecord) return jsonError(403, 'Customer purchase-order recording authority required')

    const { data: commandResult, error: commandError } = await svc.rpc(
      'record_rental_customer_purchase_order',
      {
        p_rental_order_id: validation.input.rentalOrderId,
        p_actor_id: user.id,
        p_external_reference: validation.input.externalReference,
        p_customer_stated_issue_date: validation.input.customerStatedIssueDate,
        p_idempotency_key: validation.input.idempotencyKey,
      },
    )
    if (commandError) {
      const status = commandErrorStatus(commandError.message)
      if (status === 500) console.error('rental-order customer PO command error:', commandError.message)
      return jsonError(status, status === 500
        ? 'Unable to record customer purchase order'
        : commandError.message)
    }

    const result = commandResult as Record<string, unknown>
    return json(200, {
      ...buildCustomerPurchaseOrderProjection({
        rentalOrderId: rentalOrder.id,
        orderReference: rentalOrder.order_reference,
        currentStatus: rfqResult.data.operational_status,
        purchaseOrderRows: [{
          external_reference: result.external_reference,
          customer_stated_issue_date: result.customer_stated_issue_date,
        }],
        canRecord: false,
      }),
      idempotent_replay: result.idempotent_replay === true,
    })
  }

  const { data: purchaseOrderRows, error: purchaseOrderError } = await svc
    .from('rental_customer_purchase_order_records')
    .select('external_reference, customer_stated_issue_date')
    .eq('rental_order_id', rentalOrder.id)
    .eq('is_simulated', rentalOrder.is_simulated)
    .limit(2)

  if (purchaseOrderError) {
    console.error('rental-order customer PO projection error:', purchaseOrderError.message)
    return jsonError(500, 'Unable to load customer purchase-order status')
  }

  return json(200, buildCustomerPurchaseOrderProjection({
    rentalOrderId: rentalOrder.id,
    orderReference: rentalOrder.order_reference,
    currentStatus: rfqResult.data.operational_status,
    purchaseOrderRows,
    canRecord,
  }))
})
