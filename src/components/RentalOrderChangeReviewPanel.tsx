import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, CalendarClock, LockKeyhole, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  loadRentalOrderChangeReview,
  requestRentalOrderEndDateChangeReview,
  type RentalOrderChangeReviewProjection,
} from '@/lib/rentalOrderChangeReview'

export default function RentalOrderChangeReviewPanel({
  rfqId,
  actorMode,
}: {
  rfqId: string
  actorMode: 'customer' | 'vendor'
}) {
  const [projection, setProjection] = useState<RentalOrderChangeReviewProjection | null>(null)
  const [proposedEndDate, setProposedEndDate] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingIdempotencyKey = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjection(await loadRentalOrderChangeReview(rfqId))
    } catch (caught) {
      setProjection(null)
      setError(caught instanceof Error ? caught.message : 'Rental Order change review requires review')
    } finally {
      setLoading(false)
    }
  }, [rfqId])

  useEffect(() => { void load() }, [load])

  const resetReplayKey = () => { pendingIdempotencyKey.current = null }
  const submit = async () => {
    if (!projection?.permitted_requester_parties.includes(actorMode)) return
    if (!proposedEndDate || reason.trim().length < 5) {
      toast.error('A proposed end date and review reason are required')
      return
    }
    pendingIdempotencyKey.current ??= crypto.randomUUID()
    setSubmitting(true)
    setError(null)
    try {
      const result = await requestRentalOrderEndDateChangeReview({
        rentalOrderId: projection.rental_order_id,
        requesterParty: actorMode,
        proposedEndDate,
        requestReason: reason.trim(),
        idempotencyKey: pendingIdempotencyKey.current,
      })
      setProjection(result)
      setProposedEndDate('')
      setReason('')
      pendingIdempotencyKey.current = null
      toast.success('End-date change review submitted')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Change-review submission requires review')
    } finally {
      setSubmitting(false)
    }
  }

  const minimumDate = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10)

  return (
    <section className="mt-4 rounded-lg border border-indigo-200 bg-indigo-50 p-4" aria-label="Rental Order change review">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-indigo-800" />
            <p className="font-medium text-indigo-950">Rental Order end-date change review</p>
          </div>
          <p className="mt-1 text-xs text-indigo-800">
            Request intake only. The accepted base end-date term is still UNKNOWN.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projection && <Badge variant="outline">{projection.review_state.replaceAll('_', ' ')}</Badge>}
          <Button variant="ghost" size="sm" disabled={loading} onClick={() => void load()}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {error && (
        <div className="mt-3 flex gap-2 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}. State remains UNKNOWN / REVIEW REQUIRED.</span>
        </div>
      )}

      {projection && projection.requests.length > 0 && (
        <div className="mt-3 space-y-2">
          {projection.requests.slice(0, 3).map((request) => (
            <div key={request.request_id} className="rounded border border-indigo-200 bg-white p-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2">
                <span className="font-medium capitalize text-slate-900">{request.requester_party} request</span>
                <span className="text-slate-600">Proposed end: {request.proposed_end_date}</span>
              </div>
              <p className="mt-1 text-slate-700">{request.request_reason}</p>
            </div>
          ))}
        </div>
      )}

      {projection?.permitted_requester_parties.includes(actorMode) && (
        <div className="mt-3 grid gap-3">
          <div className="max-w-xs">
            <label htmlFor={`change-date-${rfqId}`} className="text-xs font-medium text-indigo-950">
              Proposed end date for review
            </label>
            <Input
              id={`change-date-${rfqId}`}
              type="date"
              min={minimumDate}
              value={proposedEndDate}
              onChange={(event) => { setProposedEndDate(event.target.value); resetReplayKey() }}
            />
          </div>
          <div>
            <label htmlFor={`change-reason-${rfqId}`} className="text-xs font-medium text-indigo-950">
              Review reason
            </label>
            <Textarea
              id={`change-reason-${rfqId}`}
              value={reason}
              maxLength={4000}
              rows={3}
              onChange={(event) => { setReason(event.target.value); resetReplayKey() }}
              placeholder="Operational reason and requested schedule context"
            />
          </div>
          <div className="flex justify-end">
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Submitting...' : 'Submit Review Request'}
            </Button>
          </div>
        </div>
      )}

      {projection && (
        <div className="mt-3 flex gap-2 border-t border-indigo-200 pt-3 text-xs text-indigo-900">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            No approval action is implemented. This request cannot change the Rental Order version,
            lifecycle state, billing, custody, or granular rental scope.
          </span>
        </div>
      )}
    </section>
  )
}
