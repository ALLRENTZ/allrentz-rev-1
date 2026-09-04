import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, FileCheck2, LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatLifecycleStatus,
  lifecycleReviewLabel,
  loadOperationsLifecycle,
  type OperationsLifecycleItem,
  type OperationsLifecycleProjection,
} from '@/lib/operationsLifecycle'

const TERMINAL_STATUSES = new Set(['completed', 'cancelled', 'rejected'])

function formatTimestamp(value: string | null): string {
  if (!value) return 'Timestamp unavailable'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function Timeline({ item }: { item: OperationsLifecycleItem }) {
  const visibleEvents = item.timeline.slice(-6)
  if (visibleEvents.length === 0) {
    return <p className="mt-3 text-sm text-slate-500">No canonical transition event is recorded yet.</p>
  }

  return (
    <ol className="mt-3 space-y-2 border-l border-slate-200 pl-4">
      {visibleEvents.map((event, index) => (
        <li key={`${event.created_at}-${event.new_status}-${index}`} className="relative text-sm">
          <span className="absolute -left-[1.19rem] top-1.5 h-2 w-2 rounded-full bg-slate-400" />
          <span className="font-medium text-slate-800">{formatLifecycleStatus(event.new_status)}</span>
          <span className="ml-2 text-xs text-slate-500">{formatTimestamp(event.created_at)}</span>
        </li>
      ))}
    </ol>
  )
}

const REQUIREMENT_LABELS = {
  twic: 'TWIC access credential',
  isnet: 'ISNetworld qualification',
  purchase_order: 'Purchase order control',
} as const

function PreDispatchReadiness({ item }: { item: OperationsLifecycleItem }) {
  const readiness = item.pre_dispatch
  if (!readiness) return null

  return (
    <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileCheck2 className="h-4 w-4 text-amber-800" />
            <p className="font-medium text-amber-950">Pre-dispatch packet visibility</p>
          </div>
          <p className="mt-1 text-sm text-amber-900">
            Recorded facts only. No document evidence or release decision is available.
          </p>
        </div>
        <Badge className="bg-amber-200 text-amber-950">Release: BLOCKED</Badge>
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border border-amber-200 bg-white p-3 text-sm">
          <span className="text-slate-600">Accepted quote</span>
          <p className="font-medium text-slate-900">{readiness.accepted_quote_state}</p>
        </div>
        <div className="rounded border border-amber-200 bg-white p-3 text-sm">
          <span className="text-slate-600">Vendor confirmation</span>
          <p className="font-medium text-slate-900">{readiness.vendor_confirmation_state}</p>
        </div>
      </div>

      <ul className="mt-3 space-y-2">
        {readiness.requirements.map((requirement) => (
          <li key={requirement.key} className="flex flex-wrap items-center justify-between gap-2 text-sm">
            <span className="text-slate-700">{REQUIREMENT_LABELS[requirement.key]}</span>
            <span className="text-right text-slate-600">
              Requirement: <strong>{requirement.requirement_status}</strong>
              {' · '}Evidence: <strong>{requirement.evidence_status}</strong>
            </span>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex gap-2 border-t border-amber-200 pt-3 text-xs text-amber-950">
        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Release authority is NOT IMPLEMENTED. This projection cannot release equipment,
          dispatch a task, determine billing, establish custody, or approve document sufficiency.
        </span>
      </div>
    </div>
  )
}

function DeliveryAcceptanceContinuity({ item }: { item: OperationsLifecycleItem }) {
  const status = item.field_acceptance
  if (!status) return null

  const recorded = status.field_acceptance_state === 'RECORDED'
  const awaiting = status.field_acceptance_state === 'AWAITING_CUSTOMER'
  return (
    <div className={`mt-4 rounded-md border p-4 ${recorded
      ? 'border-emerald-200 bg-emerald-50'
      : awaiting ? 'border-blue-200 bg-blue-50' : 'border-amber-200 bg-amber-50'}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            {recorded
              ? <CheckCircle2 className="h-4 w-4 text-emerald-800" />
              : <AlertTriangle className="h-4 w-4 text-amber-800" />}
            <p className="font-medium text-slate-950">Delivery & field-acceptance continuity</p>
          </div>
          <p className="mt-1 text-sm text-slate-700">
            Canonical system transition evidence only; private delivery references are not exposed.
          </p>
        </div>
        <Badge variant="outline">{status.field_acceptance_state.replaceAll('_', ' ')}</Badge>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <div className="rounded border bg-white p-3 text-sm">
          <span className="text-slate-600">On-rent determination</span>
          <p className="font-medium text-slate-900">{status.on_rent_determination.replaceAll('_', ' ')}</p>
        </div>
        <div className="rounded border bg-white p-3 text-sm">
          <span className="text-slate-600">Determined at</span>
          <p className="font-medium text-slate-900">{formatTimestamp(status.accepted_at)}</p>
        </div>
      </div>
      <div className="mt-3 flex gap-2 border-t pt-3 text-xs text-slate-700">
        <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Read-only RFQ-wide projection. It does not decide custody, condition liability,
          legal evidence sufficiency, billing calculations, or granular scope.
        </span>
      </div>
    </div>
  )
}

export default function OperationsLifecycleQueue() {
  const [projection, setProjection] = useState<OperationsLifecycleProjection | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjection(await loadOperationsLifecycle())
    } catch (caught) {
      setProjection(null)
      setError(caught instanceof Error ? caught.message : 'Operations lifecycle requires review')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  const counts = useMemo(() => {
    const items = projection?.items ?? []
    return {
      visible: items.length,
      active: items.filter((item) => !TERMINAL_STATUSES.has(item.current_status)).length,
      review: items.filter((item) => item.current_status === 'off_rent_requested'
        || item.current_status === 'demobilizing').length,
      terminal: items.filter((item) => TERMINAL_STATUSES.has(item.current_status)).length,
    }
  }, [projection])

  return (
    <section className="rounded-lg border border-slate-200 bg-white p-5" aria-label="Operations lifecycle continuity">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-slate-700" />
            <h2 className="text-lg font-semibold text-slate-900">Canonical lifecycle continuity</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-slate-600">
            Read-only RFQ-wide operations projection. This view cannot change lifecycle state,
            billing, custody, or granular rental scope.
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

      {projection && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="outline">{projection.mode}</Badge>
            <Badge variant="secondary">RFQ-WIDE</Badge>
            <span className="text-xs text-slate-500">
              Generated {formatTimestamp(projection.generated_at)}
            </span>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Visible RFQs', counts.visible],
              ['Active records', counts.active],
              ['Off-rent review', counts.review],
              ['Terminal records', counts.terminal],
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-1 text-2xl font-semibold text-slate-900">{value}</p>
              </div>
            ))}
          </div>

          {projection.items.length === 0 ? (
            <p className="mt-4 text-sm text-slate-600">No RFQs are visible in this operations boundary.</p>
          ) : (
            <div className="mt-5 space-y-4">
              {projection.items.map((item) => (
                <article key={item.rfq_id} className="rounded-md border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-slate-900">RFQ {item.rfq_id.slice(0, 8)}</p>
                      <p className="mt-1 text-sm text-slate-600">{lifecycleReviewLabel(item.current_status)}</p>
                    </div>
                    <Badge>{formatLifecycleStatus(item.current_status)}</Badge>
                  </div>
                  <div className="mt-2 flex items-center gap-1 text-xs text-slate-500">
                    <Clock3 className="h-3.5 w-3.5" />
                    Last record update {formatTimestamp(item.updated_at ?? item.created_at)}
                  </div>
                  <Timeline item={item} />
                  <PreDispatchReadiness item={item} />
                  <DeliveryAcceptanceContinuity item={item} />
                </article>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  )
}
