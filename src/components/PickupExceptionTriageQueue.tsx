import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  appendPickupExceptionTriage,
  loadPickupExceptionTriageQueue,
  PICKUP_EXCEPTION_ESCALATION_REASONS,
  type PickupExceptionEscalationReason,
  type PickupExceptionTriageItem,
} from '@/lib/pickupExceptionTriage'

function label(value: string): string {
  return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function age(value: string): string {
  const timestamp = Date.parse(value)
  if (!Number.isFinite(timestamp)) return 'AGE UNKNOWN'
  const hours = Math.max(0, Math.floor((Date.now() - timestamp) / 3_600_000))
  return hours < 24 ? `${hours}h open` : `${Math.floor(hours / 24)}d open`
}

export default function PickupExceptionTriageQueue() {
  const [items, setItems] = useState<PickupExceptionTriageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, PickupExceptionEscalationReason>>({})
  const [working, setWorking] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setItems((await loadPickupExceptionTriageQueue()).items)
    } catch (caught) {
      setItems([])
      setError(caught instanceof Error ? caught.message : 'Pickup exception triage requires review')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const submit = async (
    item: PickupExceptionTriageItem,
    action: 'claim' | 'note' | 'escalate',
  ) => {
    setWorking(item.rfq_id)
    setError(null)
    try {
      await appendPickupExceptionTriage({
        rfqId: item.rfq_id,
        action,
        notes: action === 'claim' ? null : notes[item.rfq_id]?.trim() || null,
        escalationReason: action === 'escalate'
          ? reasons[item.rfq_id] ?? 'operations_review'
          : null,
      })
      setNotes((current) => ({ ...current, [item.rfq_id]: '' }))
      await load()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Pickup exception triage action was denied')
    } finally {
      setWorking(null)
    }
  }

  return (
    <section className="mb-6 rounded-lg border border-amber-200 bg-white p-5" aria-label="Pickup exception triage">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Pickup exception triage</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Non-authoritative RFQ-wide operations queue. Claiming, notes, and escalation never
            resolve an exception or establish custody, return, stop-rent, billing, or invoice authority.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}>
          <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </Button>
      </div>

      {error && (
        <div className="mt-4 flex gap-2 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}. State remains UNKNOWN / REVIEW REQUIRED.</span>
        </div>
      )}
      {!loading && !error && items.length === 0 && (
        <p className="mt-4 text-sm text-slate-600">No failed pickup attempts require triage.</p>
      )}

      <div className="mt-4 space-y-4">
        {items.map((item) => (
          <article key={item.attempt_event_id} className="rounded-md border border-slate-200 p-4">
            <div className="flex flex-wrap justify-between gap-2">
              <div>
                <p className="font-medium text-slate-900">RFQ {item.rfq_id}</p>
                <p className="text-sm text-slate-600">{label(item.attempt_reason_code)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{item.triage_state.toUpperCase()}</Badge>
                <Badge variant="destructive">RESOLUTION BLOCKED</Badge>
              </div>
            </div>
            <div className="mt-2 flex items-center gap-2 text-xs text-slate-600">
              <Clock className="h-3.5 w-3.5" /> {age(item.attempt_created_at)}
              <span>• {item.note_count} internal note{item.note_count === 1 ? '' : 's'}</span>
            </div>
            {item.attempt_notes && <p className="mt-2 text-sm text-slate-700">{item.attempt_notes}</p>}

            {item.triage_state === 'unassigned' ? (
              <Button className="mt-3" size="sm" disabled={working === item.rfq_id}
                onClick={() => void submit(item, 'claim')}>Claim triage</Button>
            ) : item.triage_state === 'escalated' ? (
              <p className="mt-3 text-sm font-medium text-amber-800">
                Escalated for separate review. Further triage mutation is not authorized.
              </p>
            ) : item.assigned_to_caller ? (
              <div className="mt-3 grid gap-2 md:grid-cols-[1fr_14rem_auto_auto]">
                <input className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  aria-label="Internal triage note" maxLength={4000}
                  value={notes[item.rfq_id] ?? ''}
                  onChange={(event) => setNotes((current) => ({
                    ...current, [item.rfq_id]: event.target.value,
                  }))} placeholder="Required internal note" />
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                  aria-label="Escalation reason"
                  value={reasons[item.rfq_id] ?? 'operations_review'}
                  onChange={(event) => setReasons((current) => ({
                    ...current,
                    [item.rfq_id]: event.target.value as PickupExceptionEscalationReason,
                  }))}>
                  {PICKUP_EXCEPTION_ESCALATION_REASONS.map((reason) => (
                    <option key={reason} value={reason}>{label(reason)}</option>
                  ))}
                </select>
                <Button variant="outline" size="sm" disabled={working === item.rfq_id || !notes[item.rfq_id]?.trim()}
                  onClick={() => void submit(item, 'note')}>Add note</Button>
                <Button size="sm" disabled={working === item.rfq_id || !notes[item.rfq_id]?.trim()}
                  onClick={() => void submit(item, 'escalate')}>Escalate</Button>
              </div>
            ) : (
              <p className="mt-3 text-xs font-medium text-amber-800">
                Claimed by another authorized operations actor. Reassignment is not authorized.
              </p>
            )}
          </article>
        ))}
      </div>
    </section>
  )
}
