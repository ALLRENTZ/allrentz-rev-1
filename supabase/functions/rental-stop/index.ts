import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import { validateRentalStopAction } from './rentalStopPolicy.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, x-client-info, apikey',
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

function errorResponse(status: number, code: string, message: string): Response {
  return json(status, { error: { code, message } })
}

function mapDatabaseError(message: string): Response {
  if (message.includes('not found')) {
    return errorResponse(404, 'NOT_FOUND', 'Required rental-stop record was not found')
  }
  if (message.includes('lacks')
    || message.includes('Only the recorded')
    || message.includes('Demo actor')) {
    return errorResponse(403, 'FORBIDDEN', 'The authenticated actor lacks authority for this action')
  }
  if (message.includes('UNKNOWN') || message.includes('fails closed')) {
    return errorResponse(409, 'AUTHORITY_UNKNOWN', 'Required product authority is undefined and fails closed')
  }
  if (message.includes('predecessor conflict')
    || message.includes('belongs to a different initiating actor')) {
    return errorResponse(409, 'VERSION_CONFLICT', 'The governed version or idempotency state has changed')
  }
  if (message.includes('must be')
    || message.includes('requires')
    || message.includes('cannot')
    || message.includes('invalid')
    || message.includes('does not match')) {
    return errorResponse(422, 'CONTRACT_REJECTED', 'The rental-stop contract rejected this action')
  }
  return errorResponse(500, 'INTERNAL_ERROR', 'The rental-stop command failed')
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS })
  if (req.method !== 'POST') return errorResponse(405, 'METHOD_NOT_ALLOWED', 'POST is required')

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Authorization header required')
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
      throw new KeyConfigError('Supabase URL is not configured')
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
  } catch {
    return errorResponse(500, 'SERVICE_CONFIGURATION', 'Service configuration error')
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) {
    return errorResponse(401, 'UNAUTHENTICATED', 'Invalid or expired token')
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return errorResponse(400, 'INVALID_JSON', 'Request body must be valid JSON')
  }

  const validation = validateRentalStopAction(body)
  if (!validation.valid || !validation.input) {
    return errorResponse(400, 'INVALID_INPUT', validation.error ?? 'Invalid rental-stop input')
  }

  const serviceClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const params = { ...validation.input.params, p_actor_id: user.id }
  const { data, error } = await serviceClient.rpc(validation.input.rpc, params)
  if (error) {
    console.error('rental-stop command failed', { code: error.code ?? 'UNKNOWN' })
    return mapDatabaseError(error.message ?? '')
  }

  return json(200, data)
})
