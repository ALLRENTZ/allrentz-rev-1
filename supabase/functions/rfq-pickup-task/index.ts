import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import {
  buildPickupScheduleProjection,
  validatePickupTaskAction,
} from './pickupTaskPolicy.ts'

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
}

function jsonError(status: number, message: string): Response {
  return json(status, { error: message })
}

function mapCommandError(message: string): Response {
  if (message.includes('not found')) return jsonError(404, 'Required pickup authority record not found')
  if (message.includes('lacks accepted-vendor') || message.includes('lacks customer')
      || message.includes('simulation scope')) {
    return jsonError(403, 'Insufficient authority for this PickupTask action')
  }
  if (message.includes('must be demobilizing or off_rent')
      || message.includes('no pending schedule proposal')
      || message.includes('idempotency key conflicts')) {
    return jsonError(422, message)
  }
  if (message.includes('required') || message.includes('must be after')
      || message.includes('cannot exceed') || message.includes('must contain')
      || message.includes('must be one of') || message.includes('only permitted')) {
    return jsonError(400, message)
  }
  return jsonError(500, 'Internal error')
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
  if (!authHeader?.startsWith('Bearer ')) return jsonError(401, 'Authorization header required')

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
    console.error('rfq-pickup-task key configuration error:', err instanceof Error ? err.message : 'unknown')
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

  const validation = validatePickupTaskAction(body)
  if (!validation.valid || !validation.input) {
    return jsonError(400, validation.error ?? 'Invalid PickupTask action')
  }

  const input = validation.input
  const svc = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  if (input.action === 'status') {
    // The caller-scoped rental_requests query is the read authorization gate.
    // Privileged reads occur only afterward and return a narrow projection.
    const { data: authorizedRfq, error: authorizationError } = await userClient
      .from('rental_requests')
      .select('id, operational_status')
      .eq('id', input.rfqId)
      .maybeSingle()

    if (authorizationError) {
      console.error('rfq-pickup-task status authorization error:', authorizationError)
      return jsonError(500, 'Unable to verify rental access')
    }
    if (!authorizedRfq) return jsonError(404, 'Required rental record not found')

    const { data: task, error: taskError } = await svc
      .from('rental_pickup_tasks')
      .select('id, rfq_id, object_scope, created_at')
      .eq('rfq_id', input.rfqId)
      .maybeSingle()

    if (taskError) {
      console.error('rfq-pickup-task task projection error:', taskError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    if (!task) {
      return json(200, {
        rfq_id: authorizedRfq.id,
        operational_status: authorizedRfq.operational_status,
        pickup_task: null,
        current_schedule_state: 'unscheduled',
        current_schedule_event: null,
        confirmed_window: null,
        pending_window: null,
        timeline: [],
        timeline_page: { has_more: false, next_before_sequence: null },
        authority_boundary: {
          object_scope: 'rfq',
          pickup_controls_billing: false,
          custody_recorded: false,
        },
      })
    }

    const eventProjection = 'id, event_sequence, event_type, actor_role, pickup_window_start, pickup_window_end, reason_code, notes, created_at'
    const { data: current, error: currentError } = await svc
      .from('rental_pickup_schedule_events')
      .select(eventProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (currentError || !current) {
      console.error('rfq-pickup-task current schedule projection error:', currentError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    const { data: confirmed, error: confirmedError } = await svc
      .from('rental_pickup_schedule_events')
      .select(eventProjection)
      .eq('pickup_task_id', task.id)
      .eq('event_type', 'schedule_confirmed')
      .order('event_sequence', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (confirmedError) {
      console.error('rfq-pickup-task confirmed schedule projection error:', confirmedError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    let timelineQuery = svc
      .from('rental_pickup_schedule_events')
      .select(eventProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: false })
      .limit(101)
    if (input.timelineBeforeSequence !== null) {
      timelineQuery = timelineQuery.lt('event_sequence', input.timelineBeforeSequence)
    }
    const { data: timelineEvents, error: timelineError } = await timelineQuery

    if (timelineError) {
      console.error('rfq-pickup-task schedule timeline error:', timelineError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    const scheduleProjection = buildPickupScheduleProjection(
      current,
      confirmed,
      timelineEvents ?? [],
    )
    return json(200, {
      rfq_id: authorizedRfq.id,
      operational_status: authorizedRfq.operational_status,
      pickup_task: {
        id: task.id,
        object_scope: task.object_scope,
        created_at: task.created_at,
      },
      ...scheduleProjection,
      authority_boundary: {
        object_scope: task.object_scope,
        pickup_controls_billing: false,
        custody_recorded: false,
      },
    })
  }

  const rpc = input.action === 'propose'
    ? svc.rpc('propose_rental_pickup_schedule', {
        p_rfq_id: input.rfqId,
        p_actor_id: user.id,
        p_pickup_window_start: input.pickupWindowStart,
        p_pickup_window_end: input.pickupWindowEnd,
        p_reason_code: input.reasonCode,
        p_notes: input.notes,
        p_idempotency_key: input.idempotencyKey,
      })
    : svc.rpc('respond_rental_pickup_schedule', {
        p_rfq_id: input.rfqId,
        p_actor_id: user.id,
        p_decision: input.decision,
        p_reason_code: input.reasonCode,
        p_notes: input.notes,
        p_idempotency_key: input.idempotencyKey,
      })

  const { data, error } = await rpc
  if (error) {
    console.error('rfq-pickup-task command error:', error.message ?? 'unknown')
    return mapCommandError(error.message ?? '')
  }

  return json(200, data)
})
