import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, ClipboardList, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { supabase } from '@/integrations/supabase/client'
import {
  classifyPickupExceptionReview,
  type PickupExceptionReviewItem,
  type PickupExceptionReviewSource,
} from '@/lib/pickupExceptionReview'

interface PickupExceptionReviewQueueProps {
  sources: PickupExceptionReviewSource[]
}

function formatDate(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Time UNKNOWN' : date.toLocaleString()
}

function reasonLabel(value: string): string {
  return value.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')
}

function triageLabel(value: PickupExceptionReviewItem['triageState']): string {
  if (value === 'unassigned') return 'Awaiting operations review'
  if (value === 'under_review') return 'Operations review in progress'
  return 'Escalated for operations review'
}

export default function PickupExceptionReviewQueue({ sources }: PickupExceptionReviewQueueProps) {
  const [items, setItems] = useState<PickupExceptionReviewItem[]>([])
  const [unknownCount, setUnknownCount] = useState(0)
  const [loading, setLoading] = useState(false)

  const loadQueue = useCallback(async () => {
    if (sources.length === 0) {
      setItems([])
      setUnknownCount(0)
      return
    }
    setLoading(true)
    const results = await Promise.all(sources.map(async (source) => {
      const { data, error } = await supabase.functions.invoke('rfq-pickup-task', {
        body: { action: 'status', rfq_id: source.rfqId },
      })
      return error
        ? { state: 'unknown' as const }
        : classifyPickupExceptionReview(source, data)
    }))
    setItems(results.flatMap((result) => result.state === 'review_required' ? [result.item] : []))
    setUnknownCount(results.filter((result) => result.state === 'unknown').length)
    setLoading(false)
  }, [sources])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  if (sources.length === 0) return null

  return (
    <section className="mb-6 rounded-lg border border-amber-200 bg-amber-50/50 p-4" aria-label="Pickup exception review queue">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-amber-800" />
            <h3 className="font-semibold text-slate-900">Pickup exception review</h3>
            {!loading && <Badge variant="outline">{items.length} review required</Badge>}
          </div>
          <p className="mt-1 text-xs text-slate-600">
            Read-only RFQ-wide operational evidence. Review status never resolves an exception,
            establishes custody, closes a task, or changes off-rent or billing authority.
          </p>
        </div>
        <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadQueue()}>
          <RefreshCw className={`mr-1 h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Checking…' : 'Refresh'}
        </Button>
      </div>

      {unknownCount > 0 && (
        <div className="mt-3 flex items-start gap-2 rounded-md border border-amber-300 bg-white p-3 text-sm text-amber-950">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            {unknownCount} pickup record{unknownCount === 1 ? '' : 's'} could not be verified.
            No completion, custody, resolution, or billing state was inferred.
          </p>
        </div>
      )}

      {!loading && items.length === 0 && unknownCount === 0 && (
        <p className="mt-3 text-sm text-slate-600">No failed pickup attempt currently requires review.</p>
      )}

      {items.length > 0 && (
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.attemptEventId} className="rounded-md border border-amber-200 bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-900">{item.title}</p>
                  {item.location && <p className="text-xs text-slate-600">{item.location}</p>}
                </div>
                <Badge variant="outline" className="border-amber-300 text-amber-900">REVIEW REQUIRED</Badge>
              </div>
              <dl className="mt-2 grid gap-1 text-xs text-slate-700 sm:grid-cols-2">
                <div><dt className="font-medium">Reported reason</dt><dd>{reasonLabel(item.reasonCode)}</dd></div>
                <div><dt className="font-medium">System-recorded time</dt><dd>{formatDate(item.recordedAt)}</dd></div>
                <div><dt className="font-medium">Operations progress</dt><dd>{triageLabel(item.triageState)}</dd></div>
                <div><dt className="font-medium">Progress updated</dt><dd>{item.triageUpdatedAt ? formatDate(item.triageUpdatedAt) : 'Not started'}</dd></div>
              </dl>
              {item.notes && <p className="mt-2 text-xs text-slate-700">{item.notes}</p>}
              <p className="mt-2 text-xs font-medium text-amber-900">
                Resolution actions are not authorized in this view.
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
