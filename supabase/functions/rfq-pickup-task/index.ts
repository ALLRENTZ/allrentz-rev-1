import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import {
  buildPickupAccessInstructionProjection,
  BACKEND_SECRET_KEY_NAME,
  KeyConfigError,
  preferProductionValue,
  selectPublishableKey,
  selectSecretKey,
} from '../rfq-transition/keys.ts'
import {
  buildPickupAttemptProjection,
  buildPickupExceptionPublicProjection,
  buildPickupDispatchProjection,
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
      || message.includes('lacks assigned-vendor') || message.includes('not the assigned')
      || message.includes('lacks pickup exception triage authority')
      || message.includes('simulation scope')) {
    return jsonError(403, 'Insufficient authority for this PickupTask action')
  }
  if (message.includes('must be demobilizing or off_rent')
      || message.includes('no pending schedule proposal')
      || message.includes('requires a currently confirmed schedule')
      || message.includes('requires a field assignment')
      || message.includes('requires an assigned-actor arrival assertion')
      || message.includes('already has a field assignment')
      || message.includes('already has an attempt outcome')
      || message.includes('already claimed')
      || message.includes('must be claimed')
      || message.includes('reassignment is not authorized')
      || message.includes('requires prior state')
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

  if (input.action === 'triage_queue') {
    const { data, error } = await svc.rpc('get_rental_pickup_exception_triage_queue', {
      p_actor_id: user.id,
    })
    if (error) {
      console.error('rfq-pickup-task triage queue error:', error.message ?? 'unknown')
      return mapCommandError(error.message ?? '')
    }
    return json(200, {
      items: data ?? [],
      authority_boundary: {
        object_scope: 'rfq',
        non_authoritative_triage: true,
        resolution_state: 'blocked',
        pickup_controls_billing: false,
        custody_recorded: false,
      },
    })
  }

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
        current_dispatch_state: 'not_dispatched',
        current_dispatch_event: null,
        dispatch_timeline: [],
        caller_is_assigned_field_actor: false,
        current_attempt_state: 'not_recorded',
        current_attempt_event: null,
        current_exception_state: 'none_recorded',
        current_exception_triage_state: 'not_applicable',
        current_exception_triage_updated_at: null,
        current_exception_coordination_state: 'not_applicable',
        exception_resolution_state: 'blocked',
        current_access_instructions: null,
        access_instruction_timeline: [],
        caller_can_record_attempt: false,
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

    const dispatchEventProjection = 'id, event_sequence, event_type, actor_role, assigned_actor_id, notes, created_at'
    const { data: dispatchEvents, error: dispatchError } = await svc
      .from('rental_pickup_dispatch_events')
      .select(dispatchEventProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: true })

    if (dispatchError) {
      console.error('rfq-pickup-task dispatch projection error:', dispatchError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    const dispatchProjection = buildPickupDispatchProjection(dispatchEvents ?? [], user.id)

    const accessInstructionProjection = 'id, event_sequence, event_type, actor_role, instruction_type, instructions, created_at'
    const { data: accessInstructionEvents, error: accessInstructionError } = await svc
      .from('rental_pickup_access_instruction_events')
      .select(accessInstructionProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: true })

    if (accessInstructionError) {
      console.error('rfq-pickup-task access-instruction projection error:', accessInstructionError)
      return jsonError(500, 'Pickup access instructions require review')
    }

    let accessInstructions
    try {
      accessInstructions = buildPickupAccessInstructionProjection(accessInstructionEvents ?? [])
    } catch (error) {
      console.error('rfq-pickup-task malformed access-instruction projection:', error)
      return jsonError(500, 'Pickup access instructions require review')
    }

    const attemptEventProjection = 'id, event_sequence, event_type, actor_role, assigned_actor_id, reason_code, notes, created_at'
    const { data: attemptEvents, error: attemptError } = await svc
      .from('rental_pickup_attempt_events')
      .select(attemptEventProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: true })
      .limit(2)

    if (attemptError) {
      console.error('rfq-pickup-task attempt projection error:', attemptError)
      return jsonError(500, 'Unable to load PickupTask progress')
    }

    let attemptProjection
    try {
      attemptProjection = buildPickupAttemptProjection(
        attemptEvents ?? [],
        dispatchProjection.caller_is_assigned_field_actor,
        dispatchProjection.current_dispatch_state,
      )
    } catch (error) {
      console.error('rfq-pickup-task malformed attempt projection:', error)
      return jsonError(500, 'Pickup attempt progress requires review')
    }

    const triageEventProjection = 'id, event_sequence, event_type, actor_role, escalation_reason, created_at'
    const { data: triageEvents, error: triageError } = await svc
      .from('rental_pickup_exception_triage_events')
      .select(triageEventProjection)
      .eq('pickup_task_id', task.id)
      .order('event_sequence', { ascending: true })

    if (triageError) {
      console.error('rfq-pickup-task triage projection error:', triageError)
      return jsonError(500, 'Pickup exception triage requires review')
    }

    let publicTriageProjection
    try {
      publicTriageProjection = buildPickupExceptionPublicProjection(
        triageEvents ?? [],
        attemptProjection.current_exception_state,
      )
    } catch (error) {
      console.error('rfq-pickup-task malformed triage projection:', error)
      return jsonError(500, 'Pickup exception triage requires review')
    }
    return json(200, {
      rfq_id: authorizedRfq.id,
      operational_status: authorizedRfq.operational_status,
      pickup_task: {
        id: task.id,
        object_scope: task.object_scope,
        created_at: task.created_at,
      },
      ...scheduleProjection,
      ...dispatchProjection,
      ...accessInstructions,
      ...attemptProjection,
      ...publicTriageProjection,
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
    : input.action === 'respond'
      ? svc.rpc('respond_rental_pickup_schedule', {
        p_rfq_id: input.rfqId,
        p_actor_id: user.id,
        p_decision: input.decision,
        p_reason_code: input.reasonCode,
        p_notes: input.notes,
        p_idempotency_key: input.idempotencyKey,
      })
      : input.action === 'assign_self'
        ? svc.rpc('assign_rental_pickup_field_actor', {
            p_rfq_id: input.rfqId,
            p_actor_id: user.id,
            p_notes: input.notes,
            p_idempotency_key: input.idempotencyKey,
          })
        : input.action === 'record_dispatch'
          ? svc.rpc('record_rental_pickup_dispatch_progress', {
              p_rfq_id: input.rfqId,
              p_actor_id: user.id,
              p_progress: input.progress,
              p_notes: input.notes,
              p_idempotency_key: input.idempotencyKey,
            })
          : input.action === 'record_attempt'
            ? svc.rpc('record_rental_pickup_attempt_outcome', {
                p_rfq_id: input.rfqId,
                p_actor_id: user.id,
                p_outcome: input.outcome,
                p_reason_code: input.reasonCode,
                p_notes: input.notes,
                p_idempotency_key: input.idempotencyKey,
              })
            : input.action === 'add_access_instructions'
              ? svc.rpc('record_rental_pickup_access_instructions', {
                  p_rfq_id: input.rfqId,
                  p_actor_id: user.id,
                  p_instruction_type: input.instructionType,
                  p_instructions: input.instructions,
                  p_idempotency_key: input.idempotencyKey,
                })
              : svc.rpc('record_rental_pickup_exception_triage', {
                p_rfq_id: input.rfqId,
                p_actor_id: user.id,
                p_action: input.triageAction,
                p_escalation_reason: input.escalationReason,
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
