import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CalendarClock, CheckCircle2, MapPin, RefreshCw, ShieldCheck, Truck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/integrations/supabase/client'
import {
  hasPendingPickupProposal,
  normalizePickupTaskRecord,
  PICKUP_SCHEDULE_REASON_CODES,
  pickupDispatchLabel,
  pickupScheduleLabel,
  type PickupScheduleReasonCode,
  type PickupTaskControlRecord,
} from '@/lib/pickupTaskControl'

interface PickupTaskControlPanelProps {
  rfqId: string
  actorMode: 'customer' | 'vendor'
}

function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleString()
}

function reasonLabel(value: PickupScheduleReasonCode): string {
  return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

export default function PickupTaskControlPanel({ rfqId, actorMode }: PickupTaskControlPanelProps) {
  const [record, setRecord] = useState<PickupTaskControlRecord | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [windowStart, setWindowStart] = useState('')
  const [windowEnd, setWindowEnd] = useState('')
  const [reasonCode, setReasonCode] = useState<PickupScheduleReasonCode | ''>('')
  const [notes, setNotes] = useState('')
  const [dispatchNotes, setDispatchNotes] = useState('')

  const loadRecord = useCallback(async () => {
    setLoading(true)
    setError(null)
    const { data, error: invokeError } = await supabase.functions.invoke('rfq-pickup-task', {
      body: { action: 'status', rfq_id: rfqId },
    })
    if (invokeError) {
      setRecord(null)
      setError('Pickup progress is unavailable. No pickup or billing state was inferred.')
    } else {
      const normalized = normalizePickupTaskRecord(data)
      if (!normalized) {
        setRecord(null)
        setError('Pickup progress evidence was incomplete or conflicting and is shown as UNKNOWN.')
      } else {
        setRecord(normalized)
      }
    }
    setLoading(false)
  }, [rfqId])

  const loadOlderEvents = async () => {
    if (!record?.pickup_task || !record.timeline_page.next_before_sequence) return
    setLoadingOlder(true)
    setError(null)
    const { data, error: invokeError } = await supabase.functions.invoke('rfq-pickup-task', {
      body: {
        action: 'status',
        rfq_id: rfqId,
        timeline_before_sequence: record.timeline_page.next_before_sequence,
      },
    })
    const older = invokeError ? null : normalizePickupTaskRecord(data)
    if (!older || older.pickup_task?.id !== record.pickup_task.id) {
      setError('Earlier PickupTask history could not be verified and was not added.')
    } else {
      setRecord((currentRecord) => {
        if (!currentRecord || currentRecord.pickup_task?.id !== older.pickup_task?.id) return currentRecord
        const existingIds = new Set(currentRecord.timeline.map((event) => event.id))
        return {
          ...currentRecord,
          timeline: [
            ...older.timeline.filter((event) => !existingIds.has(event.id)),
            ...currentRecord.timeline,
          ],
          timeline_page: older.timeline_page,
        }
      })
    }
    setLoadingOlder(false)
  }

  useEffect(() => {
    void loadRecord()
  }, [loadRecord])

  const submitVendorProposal = async () => {
    const start = Date.parse(windowStart)
    const end = Date.parse(windowEnd)
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
      setError('Enter a valid pickup window whose end is after its start.')
      return
    }
    if (record?.pickup_task && !notes.trim()) {
      setError('A reason is required when proposing a replacement pickup window.')
      return
    }
    if (record?.pickup_task && !reasonCode) {
      setError('Select a structured reason for the replacement pickup window.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const { error: invokeError } = await supabase.functions.invoke('rfq-pickup-task', {
      body: {
        action: 'propose',
        rfq_id: rfqId,
        pickup_window_start: new Date(start).toISOString(),
        pickup_window_end: new Date(end).toISOString(),
        reason_code: record?.pickup_task ? reasonCode : null,
        notes,
        idempotency_key: crypto.randomUUID(),
      },
    })
    if (invokeError) {
      setError(invokeError.message || 'Unable to record the governed pickup proposal.')
    } else {
      setSuccess(record?.pickup_task ? 'Revised pickup window proposed.' : 'Pickup window proposed.')
      setWindowStart('')
      setWindowEnd('')
      setReasonCode('')
      setNotes('')
      await loadRecord()
    }
    setSubmitting(false)
  }

  const submitCustomerResponse = async (decision: 'confirm' | 'reject') => {
    if (decision === 'reject' && !notes.trim()) {
      setError('Add a reason so the vendor can propose a corrected pickup window.')
      return
    }
    if (decision === 'reject' && !reasonCode) {
      setError('Select a structured reason for requesting a revised pickup window.')
      return
    }
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const { error: invokeError } = await supabase.functions.invoke('rfq-pickup-task', {
      body: {
        action: 'respond',
        rfq_id: rfqId,
        decision,
        reason_code: decision === 'reject' ? reasonCode : null,
        notes,
        idempotency_key: crypto.randomUUID(),
      },
    })
    if (invokeError) {
      setError(invokeError.message || 'Unable to record the governed pickup response.')
    } else {
      setSuccess(decision === 'confirm' ? 'Pickup window confirmed.' : 'Pickup window returned for revision.')
      setReasonCode('')
      setNotes('')
      await loadRecord()
    }
    setSubmitting(false)
  }

  const submitDispatchAction = async (
    action: 'assign_self' | 'record_dispatch',
    progress?: 'en_route' | 'arrived',
  ) => {
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    const { error: invokeError } = await supabase.functions.invoke('rfq-pickup-task', {
      body: {
        action,
        rfq_id: rfqId,
        ...(progress ? { progress } : {}),
        notes: dispatchNotes,
        idempotency_key: crypto.randomUUID(),
      },
    })
    if (invokeError) {
      setError(invokeError.message || 'Unable to record governed dispatch progress.')
    } else {
      setSuccess(action === 'assign_self'
        ? 'You are assigned as the pickup field actor.'
        : progress === 'en_route'
          ? 'En-route progress recorded.'
          : 'Arrival at site recorded.')
      setDispatchNotes('')
      await loadRecord()
    }
    setSubmitting(false)
  }

  if (loading) {
    return <div className="mt-4 rounded-lg border bg-slate-50 p-3 text-sm text-slate-600">Loading PickupTask progress…</div>
  }

  if (!record) {
    return (
      <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="flex-1">
            <p className="font-semibold">PickupTask status UNKNOWN</p>
            <p className="mt-1">{error}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => void loadRecord()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </section>
    )
  }

  const pendingCustomerResponse = hasPendingPickupProposal(record.current_schedule_state)

  return (
    <section className="mt-4 rounded-lg border border-sky-200 bg-white p-4" aria-label="Governed PickupTask progress">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-sky-700" />
            <h5 className="font-semibold text-slate-900">PickupTask scheduling</h5>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            RFQ-wide logistics progress only. Pickup scheduling never determines billing or custody.
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={() => void loadRecord()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Refresh
        </Button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <Badge variant="outline" className="border-sky-300 text-sky-800">
          {pickupScheduleLabel(record.current_schedule_state)}
        </Badge>
        <Badge variant="outline">Scope: complete RFQ</Badge>
        <Badge variant="outline" className="border-slate-300 text-slate-700">Billing authority: none</Badge>
        <Badge variant="outline" className="border-indigo-300 text-indigo-800">
          {pickupDispatchLabel(record.current_dispatch_state)}
        </Badge>
      </div>

      {record.confirmed_window && (
        <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-950">
          <p className="font-medium">Last confirmed pickup window</p>
          <p className="mt-1 text-xs">
            {formatDate(record.confirmed_window.pickup_window_start)} – {formatDate(record.confirmed_window.pickup_window_end)}
          </p>
        </div>
      )}

      {record.pending_window && (
        <div className="mt-3 rounded-md bg-sky-50 p-3 text-sm text-sky-950">
          <p className="font-medium">Pending pickup window</p>
          <p className="mt-1 text-xs">
            {formatDate(record.pending_window.pickup_window_start)} – {formatDate(record.pending_window.pickup_window_end)}
          </p>
          {record.confirmed_window && (
            <p className="mt-1 text-xs">The confirmed window remains in effect until this replacement is accepted.</p>
          )}
        </div>
      )}

      {error && <p className="mt-3 rounded-md bg-red-50 p-2 text-sm text-red-900">{error}</p>}
      {success && (
        <p className="mt-3 flex items-center gap-2 rounded-md bg-green-50 p-2 text-sm text-green-900">
          <CheckCircle2 className="h-4 w-4" /> {success}
        </p>
      )}

      {actorMode === 'vendor' && (
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium text-slate-900">
            {record.pickup_task ? 'Propose a revised pickup window' : 'Propose a pickup window'}
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-medium" htmlFor={`pickup-start-${rfqId}`}>Window start</label>
              <Input id={`pickup-start-${rfqId}`} type="datetime-local" value={windowStart} onChange={(event) => setWindowStart(event.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium" htmlFor={`pickup-end-${rfqId}`}>Window end</label>
              <Input id={`pickup-end-${rfqId}`} type="datetime-local" value={windowEnd} onChange={(event) => setWindowEnd(event.target.value)} />
            </div>
          </div>
          {record.pickup_task && (
            <div className="mt-3">
              <label className="text-xs font-medium" htmlFor={`pickup-reason-${rfqId}`}>Revision reason</label>
              <Select value={reasonCode} onValueChange={(value) => setReasonCode(value as PickupScheduleReasonCode)}>
                <SelectTrigger id={`pickup-reason-${rfqId}`} className="mt-1">
                  <SelectValue placeholder="Select a governed reason" />
                </SelectTrigger>
                <SelectContent>
                  {PICKUP_SCHEDULE_REASON_CODES.map((value) => (
                    <SelectItem key={value} value={value}>{reasonLabel(value)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <label className="mt-3 block text-xs font-medium" htmlFor={`pickup-notes-${rfqId}`}>
            Coordination notes{record.pickup_task ? ' and revision reason' : ''}
          </label>
          <Textarea id={`pickup-notes-${rfqId}`} className="mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={3} placeholder="Driver contact, site access, proposed schedule, or revision reason" />
          <Button className="mt-3" disabled={submitting} onClick={() => void submitVendorProposal()}>
            {submitting ? 'Recording…' : record.pickup_task ? 'Propose revision' : 'Propose pickup window'}
          </Button>
        </div>
      )}

      {actorMode === 'customer' && pendingCustomerResponse && (
        <div className="mt-4 rounded-md border p-3">
          <p className="text-sm font-medium text-slate-900">Respond to the proposed pickup window</p>
          <label className="mt-3 block text-xs font-medium" htmlFor={`pickup-response-reason-${rfqId}`}>
            Revision reason (required only when requesting revision)
          </label>
          <Select value={reasonCode} onValueChange={(value) => setReasonCode(value as PickupScheduleReasonCode)}>
            <SelectTrigger id={`pickup-response-reason-${rfqId}`} className="mt-1">
              <SelectValue placeholder="Select a governed reason" />
            </SelectTrigger>
            <SelectContent>
              {PICKUP_SCHEDULE_REASON_CODES.map((value) => (
                <SelectItem key={value} value={value}>{reasonLabel(value)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label className="mt-3 block text-xs font-medium" htmlFor={`pickup-response-notes-${rfqId}`}>
            Response notes (required when requesting revision)
          </label>
          <Textarea id={`pickup-response-notes-${rfqId}`} className="mt-1" value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={4000} rows={3} placeholder="Access conflict or reason another window is needed" />
          <div className="mt-3 flex flex-wrap gap-2">
            <Button disabled={submitting} onClick={() => void submitCustomerResponse('confirm')}>Confirm window</Button>
            <Button variant="outline" disabled={submitting} onClick={() => void submitCustomerResponse('reject')}>Request revision</Button>
          </div>
        </div>
      )}

      {record.pickup_task && (
        <div className="mt-4 rounded-md border border-indigo-200 bg-indigo-50/40 p-3">
          <div className="flex items-center gap-2">
            <Truck className="h-4 w-4 text-indigo-700" />
            <p className="text-sm font-medium text-slate-900">Dispatch and field progress</p>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Operational reports only. Assignment, en route, and arrival never establish pickup,
            custody, condition, off-rent, or billing authority.
          </p>

          {actorMode === 'vendor' && record.current_dispatch_state === 'not_dispatched'
            && record.current_schedule_state === 'schedule_confirmed' && (
            <div className="mt-3">
              <label className="text-xs font-medium" htmlFor={`dispatch-notes-${rfqId}`}>
                Field assignment notes (optional)
              </label>
              <Textarea id={`dispatch-notes-${rfqId}`} className="mt-1" value={dispatchNotes} onChange={(event) => setDispatchNotes(event.target.value)} maxLength={4000} rows={2} placeholder="Vehicle, contact, or site instructions" />
              <Button className="mt-2" variant="outline" disabled={submitting} onClick={() => void submitDispatchAction('assign_self')}>
                Assign myself as field actor
              </Button>
            </div>
          )}

          {actorMode === 'vendor' && record.caller_is_assigned_field_actor
            && (record.current_dispatch_state === 'field_actor_assigned'
              || record.current_dispatch_state === 'en_route_recorded') && (
            <div className="mt-3">
              <label className="text-xs font-medium" htmlFor={`dispatch-progress-notes-${rfqId}`}>
                Progress notes (optional)
              </label>
              <Textarea id={`dispatch-progress-notes-${rfqId}`} className="mt-1" value={dispatchNotes} onChange={(event) => setDispatchNotes(event.target.value)} maxLength={4000} rows={2} placeholder="Operational update visible to the customer" />
              <Button className="mt-2" disabled={submitting} onClick={() => void submitDispatchAction(
                'record_dispatch',
                record.current_dispatch_state === 'field_actor_assigned' ? 'en_route' : 'arrived',
              )}>
                {record.current_dispatch_state === 'field_actor_assigned'
                  ? <><Truck className="mr-1 h-4 w-4" /> Record en route</>
                  : <><MapPin className="mr-1 h-4 w-4" /> Record arrival at site</>}
              </Button>
            </div>
          )}

          {record.dispatch_timeline.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">No field actor or dispatch progress has been recorded.</p>
          ) : (
            <ol className="mt-3 space-y-2 border-l border-indigo-200 pl-4">
              {record.dispatch_timeline.map((event) => (
                <li key={event.id} className="text-xs text-slate-600">
                  <p className="font-medium text-slate-800">{pickupDispatchLabel(event.event_type)}</p>
                  <p>{formatDate(event.created_at)} · {event.actor_role.replace(/_/g, ' ')}</p>
                  {event.notes && <p className="mt-0.5">{event.notes}</p>}
                </li>
              ))}
            </ol>
          )}
        </div>
      )}

      <div className="mt-4">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          <ShieldCheck className="h-4 w-4" /> Pickup schedule timeline
        </div>
        {record.timeline.length === 0 ? (
          <p className="mt-2 text-xs text-slate-500">The accepted vendor has not proposed a pickup window.</p>
        ) : (
          <ol className="mt-2 space-y-2 border-l border-slate-200 pl-4">
            {record.timeline.map((event) => (
              <li key={event.id} className="text-xs text-slate-600">
                <p className="font-medium text-slate-800">{pickupScheduleLabel(event.event_type)}</p>
                <p>{formatDate(event.created_at)} · {event.actor_role.replace(/_/g, ' ')}</p>
                <p>{formatDate(event.pickup_window_start)} – {formatDate(event.pickup_window_end)}</p>
                {event.reason_code && <p>Reason: {reasonLabel(event.reason_code)}</p>}
                {event.notes && <p className="mt-0.5">{event.notes}</p>}
              </li>
            ))}
          </ol>
        )}
        {record.timeline_page.has_more && (
          <Button className="mt-3" variant="outline" size="sm" disabled={loadingOlder} onClick={() => void loadOlderEvents()}>
            {loadingOlder ? 'Loading…' : 'Load earlier events'}
          </Button>
        )}
      </div>
    </section>
  )
}
