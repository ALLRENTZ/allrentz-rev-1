import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  loadFieldAcceptanceStatus,
  type FieldAcceptanceStatusProjection,
} from '@/lib/fieldAcceptanceStatus'

interface DeliveryAcceptanceStatusPanelProps {
  rfqId: string
  refreshKey?: number
}

function formatTimestamp(value: string | null): string {
  if (!value) return 'Not recorded'
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export default function DeliveryAcceptanceStatusPanel({
  rfqId,
  refreshKey = 0,
}: DeliveryAcceptanceStatusPanelProps) {
  const [projection, setProjection] = useState<FieldAcceptanceStatusProjection | null>(null)
  const [loading, setLoading] = useState(true)
  const [requiresReview, setRequiresReview] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setRequiresReview(false)
    try {
      setProjection(await loadFieldAcceptanceStatus(rfqId))
    } catch {
      setProjection(null)
      setRequiresReview(true)
    } finally {
      setLoading(false)
    }
  }, [rfqId])

  useEffect(() => {
    void load()
  }, [load, refreshKey])

  if (loading) {
    return (
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        Loading governed delivery status…
      </div>
    )
  }

  if (requiresReview || !projection) {
    return (
      <div className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
        <div className="flex items-center gap-2 text-sm font-medium text-amber-900">
          <AlertTriangle className="h-4 w-4" /> Delivery status requires review
        </div>
        <p className="mt-1 text-xs text-amber-800">
          The governed projection is unavailable or malformed. No delivery, on-rent, billing, or custody conclusion was inferred.
        </p>
        <Button className="mt-2" size="sm" variant="outline" onClick={() => void load()}>
          <RefreshCw className="mr-1 h-3.5 w-3.5" /> Retry
        </Button>
      </div>
    )
  }

  const recorded = projection.field_acceptance_state === 'RECORDED'
  const awaiting = projection.field_acceptance_state === 'AWAITING_CUSTOMER'
  return (
    <div className={`mt-4 rounded-lg border p-3 ${recorded
      ? 'border-emerald-200 bg-emerald-50'
      : awaiting ? 'border-blue-200 bg-blue-50' : 'border-amber-300 bg-amber-50'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-900">
          {recorded ? <CheckCircle2 className="h-4 w-4 text-emerald-700" />
            : awaiting ? <Clock3 className="h-4 w-4 text-blue-700" />
              : <AlertTriangle className="h-4 w-4 text-amber-700" />}
          Delivery proof & field acceptance
        </div>
        <Badge variant="outline">{projection.field_acceptance_state.replaceAll('_', ' ')}</Badge>
      </div>
      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
        <div><dt className="text-slate-500">Acceptance time</dt><dd className="font-medium">{formatTimestamp(projection.accepted_at)}</dd></div>
        <div><dt className="text-slate-500">On-rent determination</dt><dd className="font-medium">{projection.on_rent_determination.replaceAll('_', ' ')}</dd></div>
        <div><dt className="text-slate-500">Delivery evidence</dt><dd className="font-medium">{projection.delivery_evidence_state.replaceAll('_', ' ')}</dd></div>
        <div><dt className="text-slate-500">Next step</dt><dd className="font-medium">{projection.next_step.replaceAll('_', ' ')}</dd></div>
      </dl>
      <p className="mt-3 text-xs text-slate-600">
        RFQ-wide read-only status. Evidence contents remain private. This does not decide custody, condition liability, legal sufficiency, billing calculations, or granular scope.
      </p>
    </div>
  )
}
