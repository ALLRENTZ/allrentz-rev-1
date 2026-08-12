import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import { validateOffRentAction } from './offRentPolicy.ts'

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
    console.error('rfq-off-rent key configuration error:', err instanceof Error ? err.message : 'unknown')
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

  const validation = validateOffRentAction(body)
  if (!validation.valid || !validation.input) {
    return jsonError(400, validation.error ?? 'Invalid off-rent action')
  }

  const svc = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const input = validation.input
  const rpc = input.action === 'request'
    ? svc.rpc('record_rental_off_rent_request', {
        p_rfq_id: input.rfqId,
        p_actor_id: user.id,
        p_requested_stop_at: input.requestedStopAt,
        p_pickup_available_from: input.pickupAvailableFrom,
        p_pickup_available_until: input.pickupAvailableUntil,
        p_customer_notes: input.notes,
      })
    : svc.rpc('record_rental_off_rent_acknowledgment', {
        p_rfq_id: input.rfqId,
        p_actor_id: user.id,
        p_pickup_window_start: input.pickupWindowStart,
        p_pickup_window_end: input.pickupWindowEnd,
        p_vendor_notes: input.notes,
      })

  const { data: correlationId, error } = await rpc
  if (error) {
    const message = error.message ?? ''
    if (message.includes('not found')) return jsonError(404, 'Required rental record not found')
    if (message.includes('must be on_rent')) {
      return jsonError(422, 'Rental must be on rent before off-rent can be requested')
    }
    if (message.includes('must be off_rent_requested')) {
      return jsonError(422, 'Rental must have a governed off-rent request before acknowledgment')
    }
    if (message.includes('already exists')) return jsonError(422, 'This off-rent action is already recorded')
    if (message.includes('lacks customer off-rent authority')
        || message.includes('lacks accepted-vendor acknowledgment authority')
        || message.includes('Demo actor')) {
      return jsonError(403, 'Insufficient authority for this off-rent action')
    }
    if (message.includes('required') || message.includes('must be after')
        || message.includes('cannot begin before') || message.includes('cannot exceed')) {
      return jsonError(400, message)
    }
    console.error('rfq-off-rent RPC error:', error)
    return jsonError(500, 'Internal error')
  }

  return json(200, { correlation_id: correlationId })
})
