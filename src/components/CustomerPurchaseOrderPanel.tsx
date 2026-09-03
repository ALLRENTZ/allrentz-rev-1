import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertTriangle, FileKey2, LockKeyhole, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  loadCustomerPurchaseOrder,
  recordCustomerPurchaseOrder,
  type CustomerPurchaseOrderProjection,
} from '@/lib/customerPurchaseOrder'

export default function CustomerPurchaseOrderPanel({
  rfqId,
  actorMode,
}: {
  rfqId: string
  actorMode: 'customer' | 'vendor'
}) {
  const [projection, setProjection] = useState<CustomerPurchaseOrderProjection | null>(null)
  const [externalReference, setExternalReference] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pendingIdempotencyKey = useRef<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setProjection(await loadCustomerPurchaseOrder(rfqId))
    } catch (caught) {
      setProjection(null)
      setError(caught instanceof Error ? caught.message : 'Purchase-order status requires review')
    } finally {
      setLoading(false)
    }
  }, [rfqId])

  useEffect(() => { void load() }, [load])

  const resetReplayKey = () => { pendingIdempotencyKey.current = null }
  const submit = async () => {
    if (!projection || projection.recording_permission !== 'CUSTOMER_MEMBER') return
    const reference = externalReference.trim()
    if (!reference || !issueDate) {
      toast.error('PO reference and customer-stated issue date are required')
      return
    }
    pendingIdempotencyKey.current ??= crypto.randomUUID()
    setSubmitting(true)
    setError(null)
    try {
      const result = await recordCustomerPurchaseOrder({
        rentalOrderId: projection.rental_order_id,
        externalReference: reference,
        customerStatedIssueDate: issueDate,
        idempotencyKey: pendingIdempotencyKey.current,
      })
      setProjection(result)
      pendingIdempotencyKey.current = null
      toast.success('Customer purchase-order reference recorded')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Purchase-order recording requires review')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4" aria-label="Customer purchase order">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <FileKey2 className="h-4 w-4 text-slate-700" />
            <p className="font-medium text-slate-900">Customer purchase order</p>
          </div>
          <p className="mt-1 text-xs text-slate-600">
            External customer reference bound to the RFQ-wide Rental Order.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {projection && <Badge variant="outline">{projection.record_state.replaceAll('_', ' ')}</Badge>}
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

      {projection?.record_state === 'RECORDED' && (
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <div className="rounded border bg-white p-3 text-sm">
            <span className="text-slate-500">Rental Order</span>
            <p className="font-medium text-slate-900">{projection.order_reference}</p>
          </div>
          <div className="rounded border bg-white p-3 text-sm">
            <span className="text-slate-500">Customer PO reference</span>
            <p className="font-medium text-slate-900">{projection.external_reference}</p>
          </div>
          <div className="rounded border bg-white p-3 text-sm">
            <span className="text-slate-500">Customer-stated issue date</span>
            <p className="font-medium text-slate-900">{projection.customer_stated_issue_date}</p>
          </div>
        </div>
      )}

      {actorMode === 'customer'
        && projection?.record_state === 'NOT_RECORDED'
        && projection.recording_permission === 'CUSTOMER_MEMBER' && (
          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <div>
              <label htmlFor={`po-reference-${rfqId}`} className="text-xs font-medium text-slate-700">
                External PO reference
              </label>
              <Input
                id={`po-reference-${rfqId}`}
                value={externalReference}
                maxLength={100}
                onChange={(event) => { setExternalReference(event.target.value); resetReplayKey() }}
                placeholder="Customer PO number"
              />
            </div>
            <div>
              <label htmlFor={`po-date-${rfqId}`} className="text-xs font-medium text-slate-700">
                Issue date
              </label>
              <Input
                id={`po-date-${rfqId}`}
                type="date"
                value={issueDate}
                max={new Date().toISOString().slice(0, 10)}
                onChange={(event) => { setIssueDate(event.target.value); resetReplayKey() }}
              />
            </div>
            <Button disabled={submitting} onClick={() => void submit()}>
              {submitting ? 'Recording...' : 'Record PO'}
            </Button>
          </div>
        )}

      {projection && (
        <div className="mt-3 flex gap-2 border-t border-slate-200 pt-3 text-xs text-slate-600">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Customer assertion only. ALLRENTZ does not issue or validate this PO, and it creates no release,
            billing, payment, amendment, document-sufficiency, or granular rental authority.
            {actorMode === 'vendor' ? ' Vendor access is read-only.' : ''}
          </span>
        </div>
      )}
    </section>
  )
}
